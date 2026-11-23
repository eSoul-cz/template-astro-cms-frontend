// Site media live at /_cms/<hash>.<ext> (name = first 20 chars of the content sha256, docs/contract.md).
// From the backend (CMS_SOURCE=api) the backend writes them when it serves the export and the web server serves
// them from its volume; the build only HEAD-checks them: they are in neither dist nor the image.
// An edited image gets a new name, so it never reaches the site before a publish.
// The fixture (CMS_SOURCE=fixture) has relative paths into src/lib/cms/fixture-media/ instead of URLs: the build
// copies them to dist/_cms, so a fixture site works without a backend (CI checks, e2e).
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

import type { AstroIntegrationLogger } from 'astro';
import { cmsEnv, cmsPaths, type CmsSource } from './env';

type MediaFile = { url: string; sha256: string; mime: string; bytes?: number };

/** Manifest of the last build: `bundled` = files are in dist/_cms (fixture only). */
export type MediaManifest = { bundled: boolean; names: string[] };

/** Allow-list of /_cms/ types (same as the backend `PublicMedia`). No SVG, nothing a browser would execute. */
const EXTENSIONS: Record<string, string> = {
    'image/webp': '.webp',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/avif': '.avif',
};

export const PUBLIC_MEDIA_PREFIX = '/_cms/';

function collectFiles(node: unknown, found: MediaFile[] = []): MediaFile[] {
    if (Array.isArray(node)) {
        node.forEach((child) => collectFiles(child, found));
    } else if (node && typeof node === 'object') {
        const record = node as Record<string, unknown>;
        if (typeof record.url === 'string' && typeof record.sha256 === 'string') found.push(record as unknown as MediaFile);
        Object.values(record).forEach((child) => collectFiles(child, found));
    }
    return found;
}

/** Name on /_cms/: content hash + extension from the type in the export. An extension in the URL must agree. */
export function publicName(file: MediaFile): string {
    const extension = EXTENSIONS[file.mime];
    if (!extension) {
        throw new Error(`File ${file.url} has type ${file.mime}, which the site must not serve (allowed: ${Object.keys(EXTENSIONS).join(', ')}).`);
    }
    const fromUrl = extname(new URL(file.url, 'http://cms.invalid').pathname).toLowerCase();
    if (fromUrl && fromUrl !== extension && !(extension === '.jpg' && fromUrl === '.jpeg')) {
        throw new Error(`File ${file.url}: extension ${fromUrl} does not match type ${file.mime}.`);
    }
    return `${file.sha256.slice(0, 20)}${extension}`;
}

/** Relative fixture path: only inside src/lib/cms/, never outside (guards against ../). */
async function readLocal(url: string): Promise<Buffer> {
    const path = resolve(cmsPaths.fixtureDir, url);
    if (!path.startsWith(cmsPaths.fixtureDir + sep)) throw new Error(`Path ${url} points outside src/lib/cms/.`);
    return readFile(path);
}

/** A file from the export is on the site: 200 and the size from the export (same domain as CMS_API_URL). */
async function assertPublished(file: MediaFile): Promise<void> {
    const url = new URL(file.url, cmsEnv.apiUrl).href;
    let problem = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30_000) });
            const length = Number(response.headers.get('content-length'));
            if (!response.ok) problem = `HTTP ${response.status}`;
            else if (file.bytes !== undefined && length && length !== file.bytes) problem = `${length} B instead of ${file.bytes} B from the export`;
            else return;
        } catch (error) {
            problem = (error as Error).message;
        }
    }
    throw new Error(
        `Media file ${url} is not on the site (${problem}). The backend writes it when it serves the export (disk cms-public, web server /_cms/).`,
    );
}

/** Fixture: copies a file to the cache (sha256 verified); the integration then puts it into dist/_cms. */
async function cacheLocal(name: string, file: MediaFile): Promise<boolean> {
    const target = join(cmsPaths.mediaDir, name);
    if (existsSync(target)) return false;

    const bytes = await readLocal(file.url);
    if (bytes.length === 0) throw new Error(`File ${file.url} is empty.`);
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== file.sha256) throw new Error(`File ${file.url} does not match the sha256 from the export (${hash} != ${file.sha256}).`);

    // Write through a temporary file: a file in the cache is complete and verified.
    const temporary = `${target}.${process.pid}.tmp`;
    await writeFile(temporary, bytes);
    await rename(temporary, target);
    return true;
}

/**
 * Rewrites the URL of every file in the export to `/_cms/<hash>.<ext>` in place and writes the manifest.
 * From the backend the URL must already look like that and the file must be on the site; from the fixture the
 * files are copied to the cache for dist/_cms.
 */
export async function resolveMedia(payload: object, logger: AstroIntegrationLogger, source: CmsSource): Promise<number> {
    const files = collectFiles(payload);
    const unique = new Map<string, MediaFile>();
    for (const file of files) unique.set(publicName(file), file);

    const bundled = source === 'fixture';
    if (!bundled) {
        for (const [name, file] of unique) {
            if (file.url !== `${PUBLIC_MEDIA_PREFIX}${name}`)
                throw new Error(`File ${file.url} must have the URL ${PUBLIC_MEDIA_PREFIX}${name} in the export.`);
        }
    }
    await mkdir(cmsPaths.mediaDir, { recursive: true });

    let copied = 0;
    const queue = [...unique.entries()];
    const worker = async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
            const [name, file] = next;
            if (bundled) copied += Number(await cacheLocal(name, file));
            else await assertPublished(file);
        }
    };
    await Promise.all(Array.from({ length: 8 }, worker));

    for (const file of files) file.url = `${PUBLIC_MEDIA_PREFIX}${publicName(file)}`;

    const manifest: MediaManifest = { bundled, names: [...unique.keys()].sort() };
    await writeFile(cmsPaths.manifest, JSON.stringify(manifest, null, 2));
    logger.info(
        bundled
            ? `CMS media: ${unique.size} fixture files to dist/_cms (${copied} newly copied).`
            : `CMS media: ${unique.size} files on ${PUBLIC_MEDIA_PREFIX}, all reachable.`,
    );

    return unique.size;
}

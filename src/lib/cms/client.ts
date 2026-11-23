// Loads the content export. One export per build (shared by all loaders), validated by the Zod schema, media
// checked on /_cms/. Anything that fails in CI fails the build, so Jenkins deploys nothing.
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { AstroIntegrationLogger } from 'astro';
import { cmsEnv, cmsPaths } from './env';
import { resolveMedia } from './media';
import { exportSchema, type CmsExport } from './schema';

let loading: Promise<CmsExport> | undefined;

export function loadExport(logger: AstroIntegrationLogger): Promise<CmsExport> {
    loading ??= load(logger);
    return loading;
}

async function fetchExport(): Promise<unknown> {
    if (!cmsEnv.apiUrl || !cmsEnv.token) {
        throw new Error('CMS_API_URL or CMS_API_TOKEN is missing (see .env.example).');
    }

    const url = `${cmsEnv.apiUrl}/export`;
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${cmsEnv.token}`, Accept: 'application/json' },
                signal: AbortSignal.timeout(30_000),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            lastError = error;
        }
    }
    throw new Error(`Could not fetch the export from ${url}: ${(lastError as Error).message}`);
}

async function load(logger: AstroIntegrationLogger): Promise<CmsExport> {
    let raw: unknown;

    if (cmsEnv.source === 'fixture') {
        if (cmsEnv.isCI && !cmsEnv.fixtureRequestedExplicitly) {
            throw new Error(
                'Refusing to build from the fixture in CI without CMS_SOURCE=fixture in the environment: set CMS_SOURCE=api, CMS_API_URL and CMS_API_TOKEN.',
            );
        }
        if (!existsSync(cmsPaths.fixture)) throw new Error(`${cmsPaths.fixture} does not exist.`);
        raw = JSON.parse(readFileSync(cmsPaths.fixture, 'utf8'));
        logger.warn('CMS: data from the fixture (src/lib/cms/fixture.json), not from the backend.');
    } else {
        // No fallback, not even locally: a stale snapshot would silently publish old content.
        raw = await fetchExport();
    }

    const parsed = exportSchema.safeParse(raw);
    if (!parsed.success) {
        const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join('.') || '(export)'}: ${issue.message}`).join('\n');
        throw new Error(`The export does not match contract v1 (docs/contract.md):\n${issues}`);
    }

    // scripts/verify-extra.mjs compares dist with the export the build was really made from.
    await mkdir(dirname(cmsPaths.sourceInfo), { recursive: true });
    await writeFile(cmsPaths.sourceInfo, JSON.stringify({ source: cmsEnv.source, export: raw }));

    await resolveMedia(parsed.data, logger, cmsEnv.source);
    logger.info(`CMS (${cmsEnv.source}): ${parsed.data.pages.length} pages (${parsed.data.contentHash.slice(0, 19)}).`);

    return parsed.data;
}

// Astro integration for CMS media:
//  - dev: serves /_cms/* from the cache of fixture media; other /_cms/ requests go through the Vite proxy
//    to the backend (astro.config.mjs),
//  - build: with the fixture it copies the media from the manifest to dist/_cms. Media from the backend are not in
//    dist: the web server serves them from the backend volume (src/lib/cms/media.ts).
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';
import { cmsPaths } from './env';
import type { MediaManifest } from './media';

const MIME: Record<string, string> = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.avif': 'image/avif',
};

export default function cms(): AstroIntegration {
    return {
        name: 'cms',
        hooks: {
            'astro:server:setup': ({ server }) => {
                server.middlewares.use('/_cms', (req, res, next) => {
                    const name = basename(decodeURIComponent((req.url ?? '').split('?')[0]));
                    const file = join(cmsPaths.mediaDir, name);
                    if (!name || !existsSync(file)) return next();
                    res.setHeader('Content-Type', MIME[extname(name)] ?? 'application/octet-stream');
                    createReadStream(file).pipe(res);
                });
            },

            'astro:build:done': async ({ dir, logger }) => {
                const distDir = fileURLToPath(dir);
                if (!existsSync(cmsPaths.manifest)) return;

                const manifest = JSON.parse(readFileSync(cmsPaths.manifest, 'utf8')) as MediaManifest;
                if (!manifest.bundled) {
                    logger.info(`/_cms: ${manifest.names.length} files live on the backend, dist does not contain them.`);
                    return;
                }
                await mkdir(join(distDir, '_cms'), { recursive: true });
                await Promise.all(manifest.names.map((name) => copyFile(join(cmsPaths.mediaDir, name), join(distDir, '_cms', name))));
                logger.info(`dist/_cms: ${manifest.names.length} files from the fixture.`);
            },
        },
    };
}

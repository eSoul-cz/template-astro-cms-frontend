import type { Loader } from 'astro/loaders';
import { loadExport } from './client';

type Part = 'pages' | 'settings';

/** Content layer loader over the export. Both collections share one load. */
export function cmsLoader(part: Part): Loader {
    return {
        name: `cms-${part}`,
        async load({ store, parseData, generateDigest, logger }) {
            const { pages, settings } = await loadExport(logger);

            const entries: [string, Record<string, unknown>][] = part === 'pages' ? pages.map((page) => [page.slug, page]) : [['global', settings]];

            // The data store survives between builds: without clear() deleted pages would stay in it.
            store.clear();
            for (const [id, item] of entries) {
                const data = await parseData({ id, data: item });
                store.set({ id, data, digest: generateDigest(data) });
            }
        },
    };
}

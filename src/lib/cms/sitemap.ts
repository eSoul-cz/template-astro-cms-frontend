// Sitemap data from the export the build was made from (node_modules/.astro/cms/source.json, written by client.ts).
// @astrojs/sitemap runs after the content was loaded, but in another module graph than the loaders, so the export
// is read from that file instead of being shared in memory.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cmsEnv } from './env';
import type { CmsExport } from './schema';

type PageMeta = { noindex: boolean; lastmod: string | undefined };

let pages: Map<string, PageMeta> | undefined;

const pathOf = (page: { isHome: boolean; slug: string }) => (page.isHome ? '/' : `/${page.slug}/`);

function load(): Map<string, PageMeta> {
    if (pages) return pages;

    const file = join(cmsEnv.cacheDir, 'source.json');
    if (!existsSync(file)) throw new Error(`Sitemap: ${file} is missing, the build did not load the CMS export.`);

    const { export: data } = JSON.parse(readFileSync(file, 'utf8')) as { export: CmsExport };
    pages = new Map(data.pages.map((page) => [pathOf(page), { noindex: page.noindex ?? false, lastmod: page.updatedAt }]));
    return pages;
}

const lookup = (url: string) => {
    const { pathname } = new URL(url);
    return load().get(pathname.length > 1 ? `${pathname.replace(/\/+$/, '')}/` : '/');
};

/** `noindex` pages of the backend are not in the sitemap. */
export const sitemapFilter = (url: string): boolean => lookup(url)?.noindex !== true;

/** `lastmod` is the date the page content last changed (`updatedAt` of the export); never the build time. */
export const sitemapLastmod = (url: string): string | undefined => lookup(url)?.lastmod;

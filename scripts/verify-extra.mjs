// CMS checks run by scripts/verify-dist.mjs: the output is compared with the export the build was made from
// (node_modules/.astro/cms/source.json, written by src/lib/cms/client.ts).
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export default async function verifyCms({ dist, pages, fail, noindex, sitemap, stagingGate }) {
    const cacheDir = resolve(process.cwd(), process.env.CMS_CACHE_DIR ?? 'node_modules/.astro/cms');
    const sourcePath = join(cacheDir, 'source.json');
    if (!existsSync(sourcePath)) return fail(`Missing ${sourcePath}: the build did not load the CMS export.`);

    const { source, export: data } = JSON.parse(readFileSync(sourcePath, 'utf8'));

    // Every page of the export exists as HTML; no page exists that the export does not know.
    const expected = new Set(data.pages.map((page) => (page.isHome ? '/' : `/${page.slug}`)));
    for (const path of expected) if (!pages.has(path)) fail(`Missing page ${path} from the export.`);
    for (const path of pages.keys()) if (path !== '/404' && !expected.has(path)) fail(`Page ${path} is not in the export.`);
    console.log(`verify-dist: source ${source}, ${data.pages.length} pages from the export.`);

    // `noindex` of the export is the `noindex` of the HTML; the sitemap carries the `updatedAt` of the export as `lastmod`
    // (never the build time); an indexable page has its Markdown version and advertises it, a `noindex` page has none.
    for (const page of data.pages) {
        const path = page.isHome ? '/' : `/${page.slug}`;
        const html = pages.get(path);
        if (html === undefined) continue;

        const expectedNoindex = (page.noindex ?? false) || stagingGate;
        if (expectedNoindex !== noindex.has(path)) fail(`${path}: noindex is ${expectedNoindex} in the export but ${noindex.has(path)} in the HTML.`);

        const markdown = join(dist, page.isHome ? 'index.md' : `${page.slug}.md`);
        const advertised = /<link\s+rel="alternate"\s+type="text\/markdown"\s+href="([^"]+)"/i.test(html);
        if (page.noindex) {
            if (existsSync(markdown) || advertised) fail(`${path}: a noindex page must have no Markdown version.`);
            continue;
        }
        if (!existsSync(markdown)) fail(`${path}: Markdown version ${markdown} is missing.`);
        if (!advertised) fail(`${path}: missing <link rel="alternate" type="text/markdown">.`);

        if (sitemap.size > 0 && page.updatedAt) {
            const lastmod = sitemap.get(path);
            if (!lastmod || Date.parse(lastmod) !== Date.parse(page.updatedAt))
                fail(`${path}: sitemap lastmod ${lastmod} is not the page updatedAt ${page.updatedAt}.`);
        }
    }

    // Media: referenced files exist (fixture: in dist/_cms; backend: verified on the site by the build).
    const manifestPath = join(cacheDir, 'media-manifest.json');
    if (!existsSync(manifestPath)) return fail(`Missing media manifest ${manifestPath}.`);
    const media = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const known = new Set(media.names);

    const referenced = new Set();
    for (const html of pages.values()) for (const match of html.matchAll(/\/_cms\/[a-f0-9]{20}\.[a-z0-9]+/g)) referenced.add(match[0]);
    for (const path of referenced) {
        const name = path.slice('/_cms/'.length);
        if (!known.has(name)) fail(`HTML references ${path}, which is not in the export.`);
        else if (media.bundled && !existsSync(join(dist, '_cms', name))) fail(`dist/_cms/${name} is missing.`);
    }
    if (!media.bundled && existsSync(join(dist, '_cms'))) fail('dist/_cms exists although the backend serves the media.');
    if (media.bundled) console.log(`verify-dist: ${media.names.length} media file(s) in dist/_cms.`);

    // No internal addresses (admin storage, export API) in the output.
    for (const [path, html] of pages)
        if (/\/cms-media\/|\/storage\//.test(html)) fail(`${path} links to the admin media storage; media must come from /_cms/.`);
}

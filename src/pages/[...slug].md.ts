import { getCollection } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';

import { pageToMarkdown } from '../lib/cms/markdown';

// Markdown versions of the pages: /index.md for the home page, /<slug>.md for the others. A `noindex` page has none.
export const getStaticPaths = (async () => {
    const pages = await getCollection('pages');
    return pages
        .filter((entry) => !entry.data.noindex)
        .map((entry) => ({
            params: { slug: entry.data.isHome ? 'index' : entry.data.slug },
            props: { page: entry.data },
        }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props, site }) => {
    const body = pageToMarkdown(props.page, site ?? new URL('http://localhost:4321'));
    return new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};

import { getCollection, getEntry } from 'astro:content';
import type { APIRoute } from 'astro';

import { buildLlmsTxt } from '../lib/seo/llms';

// /llms.txt: generated from the pages of the export, in the order of the site. A `noindex` page of the backend is not listed.
// With the staging gate (PUBLIC_NOINDEX=true) the file stays reachable but lists nothing.
export const GET: APIRoute = async ({ site }) => {
    const noindex = import.meta.env.PUBLIC_NOINDEX === 'true';
    const settings = (await getEntry('settings', 'global'))!.data;
    const origin = site ?? new URL('http://localhost:4321');
    const pages = (await getCollection('pages')).map((entry) => entry.data).sort((a, b) => a.sort - b.sort || a.id - b.id);

    const body = buildLlmsTxt({
        siteName: settings.siteName,
        description: noindex ? null : settings.description,
        pages: noindex
            ? []
            : pages.map((page) => ({
                  url: new URL(page.isHome ? '/' : `/${page.slug}/`, origin).href,
                  title: page.title,
                  description: page.description ?? settings.description,
                  noindex: page.noindex,
              })),
    });

    return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';

import cms from './src/lib/cms/integration';
import { readEnv as env } from './src/lib/cms/env';
import { sitemapFilter, sitemapLastmod } from './src/lib/cms/sitemap';

// Process env wins over `.env`, so Jenkins / Docker build args need no file.
const site = env('SITE_URL') || 'http://localhost:4321';
const noindex = env('PUBLIC_NOINDEX') === 'true';
// Dev server: /_cms/ media of the live export comes from the backend (fixture media is served by the integration).
const backend = env('DEV_BACKEND_URL') || 'http://127.0.0.1:8000';

// https://astro.build/config
export default defineConfig({
    site,
    trailingSlash: 'ignore',
    build: { format: 'directory' },
    // No Markdown in the site: nothing to highlight (Shiki inline styles clash with the CSP).
    markdown: { syntaxHighlight: false },

    // CSP in a <meta> tag of every page (script and style hashes are computed by the build).
    // `frame-ancestors` does not work in <meta>; the web server sets X-Frame-Options.
    security: {
        csp: {
            directives: [
                "default-src 'self'",
                "img-src 'self' data:",
                "font-src 'self'",
                "connect-src 'self'",
                "base-uri 'self'",
                "form-action 'self'",
                "object-src 'none'",
            ],
        },
    },

    // A staging site (PUBLIC_NOINDEX=true) must not advertise its pages: no sitemap.
    // `noindex` pages of the backend stay out of the sitemap and `lastmod` is the `updatedAt` of the page in the export
    // (src/lib/cms/sitemap.ts), so a rebuild does not touch the dates of unchanged pages.
    integrations: [
        cms(),
        vue(),
        ...(noindex ? [] : [sitemap({ filter: sitemapFilter, serialize: (item) => ({ ...item, lastmod: sitemapLastmod(item.url) }) })]),
    ],

    // Local fonts keep the build hermetic (no Google Fonts). Files live in src/assets/fonts/, not in public/,
    // otherwise they would be copied to the output twice. Source Sans 3 is SIL OFL (see OFL.txt): replace it
    // with the project's own typeface.
    fonts: [
        {
            provider: fontProviders.local(),
            name: 'Source Sans 3',
            cssVariable: '--font-source-sans',
            fallbacks: ['system-ui', 'sans-serif'],
            options: {
                variants: [
                    { src: ['./src/assets/fonts/SourceSans3-Variable.woff2'], weight: '200 900', style: 'normal' },
                    { src: ['./src/assets/fonts/SourceSans3-Italic-Variable.woff2'], weight: '200 900', style: 'italic' },
                ],
            },
        },
    ],

    vite: {
        plugins: [tailwindcss()],
        server: { proxy: { '/_cms': { target: backend, changeOrigin: false } } },
    },
});

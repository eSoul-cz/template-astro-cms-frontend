import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it } from 'vitest';

import MobileMenu from './MobileMenu.vue';

const links = [
    { href: '/', label: 'Welcome' },
    { href: '/about/', label: 'About us' },
];

describe('MobileMenu', () => {
    it('renders every link and a collapsed-state button in the server HTML (no JavaScript needed to read it)', async () => {
        const html = await renderToString(createSSRApp(MobileMenu, { links }));

        expect(html).toContain('href="/"');
        expect(html).toContain('href="/about/"');
        expect(html).toContain('About us');
        expect(html).toContain('aria-expanded="false"');
        expect(html).not.toMatch(/\shidden[\s=>]/);
    });

    it('uses the label prop for the button', async () => {
        const html = await renderToString(createSSRApp(MobileMenu, { links, label: 'Navigation' }));

        expect(html).toContain('Navigation');
    });
});

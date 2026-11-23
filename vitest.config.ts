/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Unit tests of helpers and islands with logic (`pnpm test`). `getViteConfig` loads the Vite plugins of the Astro integrations
// (Vue) so `.vue` files can be rendered in a test. Browser specs live in e2e/ (`pnpm test:e2e`).
export default getViteConfig({
    test: {
        include: ['src/**/*.test.ts'],
    },
});

import { expect, test } from './fixtures';

// Specs of the CMS pages over the fixture (CMS_SOURCE=fixture, generated from the backend golden export). A build that deploys runs
// the browser tests against the build of the real export, whose pages these specs cannot know, so they run for the fixture only.
test.skip(process.env.CMS_SOURCE !== 'fixture', 'These specs read the committed fixture; a build of the live export has other content.');

test('a page advertises its Markdown version and the endpoint serves the same facts', async ({ page, request }) => {
    await page.goto('/about/');
    const href = await page.locator('link[rel="alternate"][type="text/markdown"]').getAttribute('href');
    expect(new URL(href ?? '').pathname).toBe('/about.md');

    const response = await request.get('/about.md');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/markdown');
    const markdown = await response.text();
    expect(markdown).toContain('# About us');
    expect(markdown).toContain('### Our story');
});

test('a noindex page has no Markdown version, no llms.txt entry and is not in the sitemap', async ({ page, request }) => {
    test.skip(process.env.PUBLIC_NOINDEX === 'true', 'A protected preview publishes no sitemap.');

    await page.goto('/thanks/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
    await expect(page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveCount(0);
    expect((await request.get('/thanks.md')).status()).toBe(404);

    expect(await (await request.get('/llms.txt')).text()).not.toContain('/thanks/');
    expect(await (await request.get('/sitemap-0.xml')).text()).not.toContain('/thanks/');
});

test('the sitemap carries the updatedAt of the pages as lastmod', async ({ request }) => {
    test.skip(process.env.PUBLIC_NOINDEX === 'true', 'A protected preview publishes no sitemap.');

    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).toMatch(/<loc>[^<]*\/about\/<\/loc>\s*<lastmod>2026-11-12T/);
});

test('the mobile menu is the one island: links are always in the HTML, the button folds them on small screens', async ({ page }, testInfo) => {
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Menu' });
    const menu = page.locator('#mobile-menu');

    if (testInfo.project.name === 'mobile') {
        await expect(button).toBeVisible();
        await expect(menu).toBeHidden();
        await expect(button).toHaveAttribute('aria-expanded', 'false');

        await button.click();
        await expect(menu).toBeVisible();
        await expect(button).toHaveAttribute('aria-expanded', 'true');
        await expect(menu.getByRole('link', { name: 'About us' })).toBeVisible();
    } else {
        await expect(button).toBeHidden();
        await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About us' })).toBeVisible();
    }
});

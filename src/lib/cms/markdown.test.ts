import { describe, expect, it } from 'vitest';

import { markdownPath, pageToMarkdown } from './markdown';
import type { CmsPage } from './schema';

const image = { url: '/_cms/43afcbd55d743fb5511a.png', mime: 'image/png', bytes: 326, sha256: 'a'.repeat(64), width: 16, height: 9 };

const page: CmsPage = {
    id: 1,
    slug: 'about',
    isHome: false,
    sort: 10,
    title: 'About us',
    description: 'We write\nsmall software.',
    blocks: [
        { type: 'heading', level: 2, text: 'Our story' },
        { type: 'text', body: 'First paragraph.\r\n\r\n\r\nSecond paragraph.' },
        { type: 'image', image, alt: 'A gradient', caption: 'Tiny' },
        { type: 'heading', level: 3, text: 'Details' },
    ],
};

describe('pageToMarkdown', () => {
    it('renders the title, the description and every block with absolute image URLs', () => {
        expect(pageToMarkdown(page, new URL('https://example.com'))).toBe(
            [
                '# About us',
                '> We write small software.',
                '## Our story',
                'First paragraph.\n\nSecond paragraph.',
                '![A gradient](https://example.com/_cms/43afcbd55d743fb5511a.png)\n\n*Tiny*',
                '### Details',
            ].join('\n\n') + '\n',
        );
    });

    it('omits the description line and the caption when there are none', () => {
        const bare: CmsPage = { ...page, description: null, blocks: [{ type: 'image', image, alt: 'A gradient', caption: null }] };

        expect(pageToMarkdown(bare, new URL('https://example.com'))).toBe(
            '# About us\n\n![A gradient](https://example.com/_cms/43afcbd55d743fb5511a.png)\n',
        );
    });
});

describe('markdownPath', () => {
    it('maps the home page to /index.md and the others to /<slug>.md', () => {
        expect(markdownPath({ isHome: true, slug: 'home' })).toBe('/index.md');
        expect(markdownPath({ isHome: false, slug: 'about' })).toBe('/about.md');
    });
});

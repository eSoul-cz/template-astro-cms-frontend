// Markdown version of a page (`/<slug>.md`, `/index.md` for the home page), advertised with
// `<link rel="alternate" type="text/markdown">`. It carries the same facts as the HTML page and nothing else.
import type { CmsBlock, CmsPage } from './schema';

const normalize = (text: string) => text.replace(/\r\n?/g, '\n').trim();

function renderBlock(block: CmsBlock, origin: URL): string {
    switch (block.type) {
        case 'heading':
            return `${'#'.repeat(block.level)} ${block.text}`;
        case 'text':
            return normalize(block.body)
                .split(/\n{2,}/)
                .map((paragraph) => paragraph.trim())
                .join('\n\n');
        case 'image': {
            const image = `![${block.alt}](${new URL(block.image.url, origin).href})`;
            return block.caption ? `${image}\n\n*${block.caption}*` : image;
        }
    }
}

/** Path of the Markdown version, relative to the site root. */
export const markdownPath = (page: Pick<CmsPage, 'isHome' | 'slug'>): string => (page.isHome ? '/index.md' : `/${page.slug}.md`);

export function pageToMarkdown(page: CmsPage, origin: URL): string {
    const parts = [`# ${page.title}`];
    if (page.description) parts.push(`> ${normalize(page.description).replace(/\s+/g, ' ')}`);
    parts.push(...page.blocks.map((block) => renderBlock(block, origin)));
    return `${parts.join('\n\n')}\n`;
}

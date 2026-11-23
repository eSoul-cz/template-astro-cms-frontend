// Paths and reader of the golden export: the real output of the backend `ExportContentQuery` over its test data
// (backend/tests/Fixtures/content-export.golden.json). The frontend keeps a COPY in contract/ so it builds and checks
// on its own; when the backend repository is checked out next to it (../backend, the monorepo), the copy is compared
// with the original (scripts/check-contract.mjs). Refresh the copy with `pnpm contract:sync`.
import { readFile } from 'node:fs/promises';

export const goldenPath = new URL('../contract/content-export.golden.json', import.meta.url);
export const pixelPath = new URL('../contract/pixel.png', import.meta.url);
export const backendFixtures = new URL('../../backend/tests/Fixtures/', import.meta.url);

export async function readGolden() {
    try {
        return JSON.parse(await readFile(goldenPath, 'utf8'));
    } catch (error) {
        throw new Error(
            `Cannot read the golden export (${goldenPath.pathname}): ${error.message}. Copy it from the backend: pnpm contract:sync (needs ../backend).`,
            { cause: error },
        );
    }
}

/** Walks the export and calls `visit` on every file object (`url` + `sha256`). */
export function eachFile(node, visit) {
    if (Array.isArray(node)) node.forEach((child) => eachFile(child, visit));
    else if (node && typeof node === 'object') {
        if (typeof node.url === 'string' && typeof node.sha256 === 'string') visit(node);
        Object.values(node).forEach((child) => eachFile(child, visit));
    }
}

#!/usr/bin/env node
// The site fixture (src/lib/cms/fixture.json) must be the golden export of the backend. Otherwise the e2e tests
// and fixture builds would test data the backend never sends. Only the volatile parts may differ: `generatedAt`,
// `contentHash` and file URLs (the fixture has relative paths). Fix: `pnpm fixture:build`.
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

import { eachFile, goldenPath, readGolden } from './golden.mjs';

const fixture = JSON.parse(await readFile(new URL('../src/lib/cms/fixture.json', import.meta.url), 'utf8'));
const { export: golden } = await readGolden();

const comparable = (data) => {
    const copy = structuredClone(data);
    copy.generatedAt = null;
    copy.contentHash = null;
    eachFile(copy, (file) => {
        file.url = null;
    });
    return copy;
};

const expected = comparable(golden);
const actual = comparable(fixture);
const differences = [];
for (const key of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
    if (key === 'pages') {
        const length = Math.max(expected.pages.length, actual.pages.length);
        for (let index = 0; index < length; index++) {
            if (!isDeepStrictEqual(expected.pages[index], actual.pages[index]))
                differences.push(`pages[${index}] (${(expected.pages[index] ?? actual.pages[index])?.slug})`);
        }
    } else if (!isDeepStrictEqual(expected[key], actual[key])) {
        differences.push(key);
    }
}

if (differences.length > 0) {
    console.error(`check-fixture: fixture.json does not match ${goldenPath.pathname}:\n  - ${differences.join('\n  - ')}`);
    console.error('Regenerate it: pnpm fixture:build');
    process.exit(1);
}

console.log(`check-fixture: fixture.json matches the golden export (${fixture.pages.length} pages).`);

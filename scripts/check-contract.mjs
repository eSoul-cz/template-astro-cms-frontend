#!/usr/bin/env node
// Contract check (`pnpm fixture:check` runs it first). The frontend keeps a copy of the backend golden export in contract/.
//  - Always: the copy carries the schema version this frontend accepts (SCHEMA_VERSION in src/lib/cms/schema.ts).
//  - When ../backend exists (the monorepo with both submodules): the copy is byte-identical to the backend originals
//    (content-export.golden.json and pixel.png). A backend change that was not copied here fails the check.
//    Fix: `pnpm contract:sync`.
// Without ../backend (the frontend repository on its own, for example in Jenkins) only the schema version is compared.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

import { backendFixtures, goldenPath, pixelPath, readGolden } from './golden.mjs';

const schema = await readFile(new URL('../src/lib/cms/schema.ts', import.meta.url), 'utf8');
const accepted = Number(schema.match(/SCHEMA_VERSION\s*=\s*(\d+)/)?.[1]);
const { export: golden } = await readGolden();

if (golden.schemaVersion !== accepted) {
    console.error(`check-contract: the golden export has schemaVersion ${golden.schemaVersion}, the frontend accepts ${accepted}.`);
    process.exit(1);
}

if (!existsSync(new URL('content-export.golden.json', backendFixtures))) {
    console.log(`check-contract: schemaVersion ${accepted} matches the golden export (no ../backend: the copy was not compared with the backend).`);
} else {
    const differences = [];
    for (const [name, local] of [
        ['content-export.golden.json', goldenPath],
        ['pixel.png', pixelPath],
    ]) {
        const [mine, theirs] = await Promise.all([readFile(local), readFile(new URL(name, backendFixtures))]);
        if (!mine.equals(theirs)) differences.push(name);
    }
    if (differences.length > 0) {
        console.error(`check-contract: contract/ differs from ../backend/tests/Fixtures/: ${differences.join(', ')}.`);
        console.error('Copy the backend files and regenerate the fixture: pnpm contract:sync');
        process.exit(1);
    }
    console.log(`check-contract: schemaVersion ${accepted}; contract/ is identical to ../backend/tests/Fixtures/.`);
}

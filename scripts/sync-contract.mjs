#!/usr/bin/env node
// Copies the golden export and its media file from the backend (../backend/tests/Fixtures/) into contract/.
// Run after the backend exporter or its sample data changed (`pnpm contract:sync`, which also rebuilds the fixture).
import { existsSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';

import { backendFixtures, goldenPath, pixelPath } from './golden.mjs';

for (const [name, target] of [
    ['content-export.golden.json', goldenPath],
    ['pixel.png', pixelPath],
]) {
    const source = new URL(name, backendFixtures);
    if (!existsSync(source)) {
        console.error(
            `sync-contract: ${source.pathname} does not exist. This needs the backend checked out at ../backend; after a backend change run\n  cd ../backend && GOLDEN_UPDATE=1 php artisan test --filter=GoldenExportTest`,
        );
        process.exit(1);
    }
    await mkdir(new URL('./', target), { recursive: true });
    await copyFile(source, target);
    console.log(`sync-contract: ${name} copied.`);
}

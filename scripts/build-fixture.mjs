#!/usr/bin/env node
// Generates the committed fixture (src/lib/cms/fixture.json + fixture-media/) from the golden export
// (contract/content-export.golden.json, a copy of the backend's) and the media file it was made from
// (contract/pixel.png). The data are the unchanged output of `ExportContentQuery`; only the file
// URLs become relative paths into fixture-media/. `pnpm fixture:check` verifies that the two still agree.
//
// Run after the golden export changed: `pnpm contract:sync` (copies the backend files, then runs this).
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { eachFile, pixelPath, readGolden } from './golden.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mediaDir = join(root, 'src/lib/cms/fixture-media');
const source = fileURLToPath(pixelPath);

const { export: golden } = await readGolden();
const hash = createHash('sha256')
    .update(await readFile(source))
    .digest('hex');
const names = new Set();

eachFile(golden, (file) => {
    if (file.sha256 !== hash)
        throw new Error(`The golden export references a file with sha256 ${file.sha256}, but only pixel.png (${hash}) is available.`);
    const name = `${hash.slice(0, 20)}.png`;
    names.add(name);
    file.url = `fixture-media/${name}`;
});

await rm(mediaDir, { recursive: true, force: true });
await mkdir(mediaDir, { recursive: true });
for (const name of names) await copyFile(source, join(mediaDir, name));
await writeFile(join(root, 'src/lib/cms/fixture.json'), `${JSON.stringify(golden, null, 4)}\n`);

console.log(`build-fixture: fixture.json written, ${names.size} media file(s).`);

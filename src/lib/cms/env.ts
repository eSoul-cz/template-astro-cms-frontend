// Connection to the CMS backend. Values come from the process environment (Jenkins) or from `.env` in frontend/.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readDotEnv(): Record<string, string> {
    const path = resolve(process.cwd(), '.env');
    if (!existsSync(path)) return {};

    const values: Record<string, string> = {};
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (!match) continue;
        values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
    return values;
}

const dotEnv = readDotEnv();
export const readEnv = (key: string): string | undefined => process.env[key] || dotEnv[key] || undefined;

export type CmsSource = 'api' | 'fixture';

const token = readEnv('CMS_API_TOKEN') ?? '';

function readSource(): CmsSource {
    const value = readEnv('CMS_SOURCE');
    if (value === undefined) return token ? 'api' : 'fixture';
    if (value !== 'api' && value !== 'fixture') throw new Error(`CMS_SOURCE=${value} is not valid (api | fixture).`);
    return value;
}

export const cmsEnv = {
    /** E.g. https://example.com/cms-api/v1 (locally http://127.0.0.1:8000/cms-api/v1). */
    apiUrl: (readEnv('CMS_API_URL') ?? '').replace(/\/+$/, ''),
    token,
    /** `api`: live export (CMS_SOURCE=api, or a token is set). `fixture`: committed src/lib/cms/fixture.json. */
    source: readSource(),
    /** Cache of the last build (source.json for verify-dist, media files of the fixture). Outside git. */
    cacheDir: resolve(process.cwd(), readEnv('CMS_CACHE_DIR') ?? 'node_modules/.astro/cms'),
    /** In CI a build never runs on fixture data: it has to stand on what the CMS publishes. */
    isCI: Boolean(process.env.CI || process.env.JENKINS_URL),
    /**
     * In CI the fixture is used only when a pull-request check asks for it with CMS_SOURCE=fixture in the process
     * environment (not `.env`, not the default when no token is set). A deploy build sets CMS_SOURCE=api.
     */
    fixtureRequestedExplicitly: process.env.CMS_SOURCE === 'fixture',
};

export const cmsPaths = {
    mediaDir: resolve(cmsEnv.cacheDir, 'media'),
    manifest: resolve(cmsEnv.cacheDir, 'media-manifest.json'),
    /** Which source and export the last build used (read by scripts/verify-extra.mjs). */
    sourceInfo: resolve(cmsEnv.cacheDir, 'source.json'),
    fixture: resolve(process.cwd(), 'src/lib/cms/fixture.json'),
    fixtureDir: resolve(process.cwd(), 'src/lib/cms'),
};

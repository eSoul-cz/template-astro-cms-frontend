// Content from the CMS backend (../backend). The loader fetches the export on build and on dev server start
// (docs/contract.md).
import { defineCollection } from 'astro:content';

import { cmsLoader } from './lib/cms/loader';
import { pageSchema, settingsSchema } from './lib/cms/schema';

export const collections = {
    pages: defineCollection({ loader: cmsLoader('pages'), schema: pageSchema }),
    settings: defineCollection({ loader: cmsLoader('settings'), schema: settingsSchema }),
};

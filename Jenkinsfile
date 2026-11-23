// Frontend of a site WITH a CMS (archetype C-headless): one call of `astroPipeline` in image mode from the eSoul Jenkins libraries
// (`pipelines/vars/astroPipeline.txt`). It runs the checks of the Astro guideline in disposable containers, builds ONCE and verifies
// that build (`pnpm verify`, which compares dist/ with the export it was made from), runs the Playwright specs against it, and on the
// deploy branches builds the `FROM scratch` image from that verified dist/ (see `Dockerfile`) and rolls it out with `deployKomodoStack`.
// The stack's Komodo hook copies the image's `/dist` into `releases/<id>/` and switches `current` (framework/astro/deployment.md,
// "Site with a CMS: image to Komodo"). A publish from the CMS backend starts this job with the parameter CMS_PUBLISH_ID and the
// result goes back to the backend (`cms`), also after a failure.
//
// A pull request (and every branch that does not deploy) builds from the committed fixture and never sees a credential. A build that
// deploys reads the real export of the backend with the export token; the token exists only in the check containers, never in the image.
//
// Replace the example values. Credentials (Jenkins): `scaleway_secret_key`, `komodo_deploy_api_key`, `komodo_deploy_api_secret` and two
// Secret Text credentials: the export token (= CMS_EXPORT_TOKEN of the backend) and the callback token (= CMS_JENKINS_CALLBACK_TOKEN of
// the backend). The build agent fetches the export over the public URL, so its address has to be in CMS_API_ALLOWED_IPS of the backend
// (README, "Publish flow").
@Library(['dockerHelpers', 'testing', 'deploy', 'pipelines']) _

astroPipeline(
    mode: 'image',
    // Release image of the site and the Komodo stack that unpacks it.
    image: 'example-project-web',
    stack: 'example-project-web',
    nodeImage: 'node:26',
    env: [
        // Canonical origin of the site.
        SITE_URL: 'https://example-project.example.com',
        // `true` while the site is a protected preview (noindex everywhere, no sitemap); the launch step sets it to `false`.
        PUBLIC_NOINDEX: 'true',
    ],
    // Builds that do not deploy: the committed fixture, never the backend (CI accepts the fixture only when it is requested here).
    checkEnv: [CMS_SOURCE: 'fixture'],
    // Builds that deploy: the real export of the backend (the content export of the backend, CMS_API_URL), read with the export token.
    releaseEnv: [
        CMS_SOURCE: 'api',
        CMS_API_URL: 'https://admin.example-project.example.com/cms-api/v1',
    ],
    credentials: [[id: 'example-project-cms-export-token', variable: 'CMS_API_TOKEN']],
    deployBranches: ['main'],
    checks: [
        test: true,
        // Playwright specs against the verified dist/ (desktop 1440 px and mobile 390 px). The image has to be the one whose Playwright
        // version equals `@playwright/test` in package.json (the browser builds must match): change both together.
        smoke: [enabled: true, image: 'mcr.microsoft.com/playwright:v1.65.1-noble'],
    ],
    extraChecks: [
        // The golden export and the committed fixture agree (no backend needed).
        [name: 'Contract', command: 'pnpm run fixture:check'],
        // The rules rendered by `esoul-guidelines` are current and unedited (README, "Guidelines"). The image of the guidelines has no PHP
        // project around it; its entrypoint is the command itself, and the step runs `/bin/sh -c <command>`, so the entrypoint is cleared.
        [
            name: 'Guidelines',
            image: 'rg.fr-par.scw.cloud/testing-images/esoul-guidelines:0.3',
            options: '--entrypoint=',
            command: 'esoul-guidelines check',
        ],
    ],
    cms: [
        callbackUrl: 'https://admin.example-project.example.com/cms-api/v1/publishes/{publishId}/status',
        credentialsId: 'example-project-cms-callback-token',
        contentHash: [file: 'node_modules/.astro/cms/source.json', path: 'export.contentHash'],
    ],
)

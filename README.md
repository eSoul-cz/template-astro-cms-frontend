# Site (frontend)

Static website built with Astro 7 and Tailwind 4 from the content of a headless CMS (the Laravel + Filament `backend`, its own repository).
The build fetches the content export, the result is a `FROM scratch` image with `dist/` only, and the Komodo stack unpacks it into
`releases/<id>/` and switches `current`. This file is about running and operating the frontend; the engineering rules are in
`docs/project_guidelines/`, the contract with the backend is `docs/contract.md` of the monorepo (`astro-cms` template) and the golden
file in `contract/`.

## Requirements

- Node.js 26 (`.nvmrc`) and the pnpm version pinned in `package.json` (`packageManager`; Node 26 ships without corepack:
  `npm install --global pnpm@<version>`).
- A committed `pnpm-lock.yaml` (`pnpm install` creates it; the image build runs `pnpm install --frozen-lockfile`).
- Playwright browsers for the e2e checks: `pnpm exec playwright install chromium`.

## Commands

```sh
pnpm install --frozen-lockfile
CMS_SOURCE=fixture pnpm dev    # dev server, http://localhost:4321, content from the committed fixture (no backend needed)
pnpm build                     # static build into dist/ (CMS_SOURCE=fixture, or api with CMS_API_URL and CMS_API_TOKEN)
pnpm verify                    # checks dist/: titles, canonicals, CSP, sitemap with lastmod, llms.txt, Markdown versions, media, export
pnpm eslint                    # read-only; `pnpm eslint:fix` rewrites
pnpm format:check              # read-only; `pnpm format` rewrites
pnpm check                     # astro check + vue-tsc --noEmit
pnpm test                      # Vitest (Markdown renderer, llms.txt, the mobile menu island)
pnpm fixture:check             # contract/ copy of the golden export, schema version and the fixture
pnpm test:e2e                  # Playwright smoke, SEO and CMS specs on dist/ (desktop 1440 px and mobile 390 px)
pnpm audit                     # known advisories (accepted ones are in pnpm-workspace.yaml with reason and date)
```

Run the read-only commands before every push; Jenkins runs the same ones in its `Checks` stage, on the fixture. A deploy build
uses `CMS_SOURCE=api` and fails when the export is unreachable or invalid: it never falls back to the fixture or to old data.

## Configuration

Values are build arguments (`.env.example` lists them); the process environment wins over `.env`.

| Variable                       | Meaning                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`                     | Canonical origin: canonical links, `og:url`, sitemap, `llms.txt`, Markdown links.                                                                 |
| `PUBLIC_NOINDEX`               | `true` while the preview is protected: `noindex` everywhere, `robots.txt` disallows everything, no sitemap.                                       |
| `CMS_API_URL`, `CMS_API_TOKEN` | Export endpoint of the backend (`https://admin.<domain>/cms-api/v1`) and its bearer token (a Jenkins credential, never a file in the repository). |
| `CMS_SOURCE`                   | `api` or `fixture`. Unset: `api` when a token is set, else `fixture`. In CI the fixture needs `CMS_SOURCE=fixture` in the process environment.    |

## Contract with the backend

`contract/content-export.golden.json` and `contract/pixel.png` are copies of the backend's `tests/Fixtures/` files; `src/lib/cms/fixture.json`
is generated from them.

- `pnpm fixture:check` compares the schema version of the copy with `SCHEMA_VERSION` in `src/lib/cms/schema.ts` and the fixture with the copy.
  With the backend checked out next to this repository (`../backend`, the monorepo) it also compares the copy byte for byte with the
  backend files; without it only the schema version is compared.
- After a backend change: `pnpm contract:sync` (needs `../backend`) copies the files and rebuilds the fixture. A contract change is a pull request in
  each repository, linked to each other.

## Pages and SEO

- Every page of the export is rendered by `src/pages/[...slug].astro`; `noindex` pages (a field in the backend) stay out of the sitemap, `llms.txt` and the
  Markdown versions. The sitemap `lastmod` is the `updatedAt` of the page in the export, never the build time.
- Markdown versions are `/index.md` and `/<slug>.md`, advertised with `<link rel="alternate" type="text/markdown">`; `llms.txt` is generated from the export.
- Titles are at most 60 characters and descriptions 110-155 characters (checked by `e2e/seo.spec.ts`); the page image falls back to the site image of the
  backend settings, then to `public/og-default.png` (1200x630: replace it).
- The mobile menu (`src/components/MobileMenu.vue`) is the one Vue island: its links are in the server HTML, the island only folds them behind a button.
- Forms post to the backend (`<backend>/forms/contact`, see the contract); the site has no server code.

## Delivery

`Jenkinsfile`: one call of `astroPipeline` (image mode): checks on the fixture for pull requests; on the deploy branches the real export is built once,
verified (`pnpm verify`) and tested in the browser, then `dockerBuildMultiArch` builds the image from that exact `dist/` and `deployKomodoStack` rolls it out.
A publish from the backend starts it with `CMS_PUBLISH_ID` and the result goes back to the backend. The `Dockerfile` is `FROM scratch` + `COPY dist/ /dist/`: no
build stage, no build argument, no token in the image build. Rollback is redeploying the previous image. NGINX (one site definition with the backend, see the
`astro-cms` template) serves `current` and `/_cms/` media from the backend's bind-mounted directory.

- Preview URL: _TBD_ (HTTP basic auth in the web server; the password is a Komodo variable, never in the repository).
- Build agent address (has to be in `CMS_API_ALLOWED_IPS` of the backend): _TBD_.
- Deliberate deviations from the design: _none yet_.

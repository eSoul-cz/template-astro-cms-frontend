# syntax=docker/dockerfile:1
# Image of a static site with a CMS (framework/astro/deployment.md, "Site with a CMS: image to Komodo"). It is only the container the
# assets travel in: it holds the VERIFIED dist/ under /dist and nothing else (no OS, no server, no source, no .env, no secrets). The
# deploy hook of the Komodo stack creates (does not start) a container from it with a dummy command (a scratch image has none), copies
# `/dist` into `releases/<id>/` and switches `current`.
#
# There is no build stage and no build argument: `astroPipeline` (Jenkinsfile) builds dist/ once, from the export of the backend, runs
# `pnpm verify` and the browser tests on it, and `dockerBuildMultiArch` restores exactly that dist/ into the context of every
# architecture build. The export token therefore never reaches the image build. Building this image by hand needs a `pnpm build` first.
FROM scratch
COPY dist/ /dist/

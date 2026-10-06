# CLAUDE.md

The public project page for `www.g26work.com`. A Bun workspaces repo: `site/` (Astro, static output, no client
JavaScript) and `infra/` (an AWS CDK app with one stack, `G26WorkSite`, that hosts the site on Amplify). Product facts
are in `PRODUCT.md`; the page's design direction is in `.impeccable/surfaces/` and, once written, `DESIGN.md`.

## Commands

Use `bun`/`bunx`, never npm or yarn. From the repo root:

```bash
bun install
bun run dev          # Astro dev server on :4321
bun run lint         # Biome (fails on any diff); lint:fix applies safe fixes
bun run typecheck    # astro check, then tsc for infra
bun run test         # site then infra
bun run build:site   # site/dist
bun run check:dist   # built HTML against the production CSP; CI and the Amplify build both run it
bun run synth:infra  # synthesizes the stack; deploys nothing
```

Every new function ships with tests; run `bun run lint && bun run typecheck && bun run test` before moving on.

## Conventions

- **Content lives in `site/src/data/projects.ts`.** `checkProjects` validates it; the page calls `assertValidProjects`
  so a bad entry fails the build. Never put a fact on the page that is not in that file.
- **No scripts, no inline styles.** The CSP in `infra/lib/site-stack.ts` forbids both, and `site/src/lib/checkHtml.ts`
  (run by `check:dist`) fails the build if the HTML has either. `astro.config.mjs` sets `inlineStylesheets: "never"`
  for this reason. A new external image host must be added to the CSP's `img-src`.
- **Biome and `.astro` files:** Biome only lints the frontmatter, so `noUnusedVariables` and `noUnusedImports` are off
  for `.astro` (they cannot see template usage).
- **Styling:** one `site/src/styles/global.css` with light and dark tokens. Elevation is a 1px border, never a shadow.
  Green means public, amber means restricted; do not add other colours.

## Infra

- Deploys are run by the user, never by the agent. The runbook is `docs/deployment.md`.
- All resources are in us-east-2, in the `g26work` AWS project (CLI profile `g26work`), the same project as FlakeHunter.
- Settings are in `infra/cdk.json` under `site*` keys, never generic ones like `repository`, because `~/.cdk.json`
  holds FlakeHunter's values for those.
- CDK runs under Node (`node --import tsx`); the tests synthesize in a Node subprocess (`infra/test/synth-worker.ts`)
  because CDK's validation starts slowly under Bun.
- Keep the Bun version in `BUN_VERSION` (`infra/lib/site-stack.ts`) and `.github/workflows/ci.yml` the same; a test
  checks.

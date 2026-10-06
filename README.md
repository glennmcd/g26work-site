# g26work-site

The project page at **[www.g26work.com](https://www.g26work.com)**: a build-status board listing the projects that
represent my work, each with its source, CI, deployment and live demo.

## How it works

- **Static site.** [Astro](https://astro.build) builds one page and a 404 page into plain HTML and CSS. No JavaScript
  ships to the browser.
- **One data file.** Every project, link and fact on the page comes from
  [`site/src/data/projects.ts`](site/src/data/projects.ts). The build validates it and stops on a bad entry.
- **Strict headers.** The page is served with a Content-Security-Policy that allows no scripts and no inline styles.
  CI checks the built HTML against that policy, so a page that would break it never deploys.
- **Hosted on AWS Amplify.** A CDK stack ([`infra/`](infra/)) creates the Amplify app, builds `main` on every push and
  serves it on `g26work.com` and `www.g26work.com`, with the bare domain redirecting to `www`.

## Add a project

Add an entry to `projects` in [`site/src/data/projects.ts`](site/src/data/projects.ts), then:

```bash
bun run test
bun run dev
```

The entry needs a source stage first. A stage that needs a password is `access: "restricted"` and must say how to get
access; the page labels it so nobody meets a login prompt unwarned.

## Develop

Requires [Bun](https://bun.sh) and Node.js 22.12 or newer.

```bash
bun install
bun run dev          # http://localhost:4321
bun run lint
bun run typecheck
bun run test
bun run build:site   # site/dist
bun run check:dist   # the built HTML against the production policy
bun run synth:infra  # the CloudFormation template; deploys nothing
```

Deploying is in [docs/deployment.md](docs/deployment.md).

## License

[MIT](LICENSE)

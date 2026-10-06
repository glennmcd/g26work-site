# Deploying g26work-site

The `G26WorkSite` stack runs in the `g26work` AWS project (us-east-2), the same project as FlakeHunter. Sign in with
the `g26work` CLI profile:

```bash
aws login --region us-east-2 --profile g26work
```

## What the stack creates

- An Amplify Hosting app (`g26work-site`, static `WEB` platform) connected to this GitHub repository. Every push to
  `main` builds the site (`bun run build:site`, then `bun run check:dist`) and serves `site/dist`.
- The domain association for `g26work.com`: the bare domain and `www`. Amplify issues the certificate and writes the
  DNS records itself, because the `g26work.com` hosted zone is in the same project. The bare domain redirects to `www`
  with a 301.
- Unknown paths show the site's 404 page in place, at the address the visitor asked for (rule `404-200`).
- Response headers on every path: a Content-Security-Policy with no scripts and no inline styles, HSTS, `nosniff`, a
  referrer policy and a permissions policy.

The settings are in [`infra/cdk.json`](../infra/cdk.json) under `site*` keys. They are deliberately not `repository`
or `githubTokenSecretName`: those generic keys would also read your `~/.cdk.json`, which FlakeHunter uses for its own
repository.

## How the domain is shared with FlakeHunter

Two Amplify apps in the same project split `g26work.com`, each with its own domain association:

| Host | App | Association |
| --- | --- | --- |
| `g26work.com`, `www.g26work.com` | this site (`g26work-site`) | `g26work.com`, prefixes `""` and `www` |
| `flakehunter.g26work.com` | the FlakeHunter dashboard (`flakehunter-web`) | `flakehunter.g26work.com`, prefix `""` |

An Amplify domain name belongs to one app, but a subdomain can be its own association on another app (this setup has
run that way since 2026-10-06). Keep each host on one association only: `flakehunter` never goes in this site's
`subDomains`.

Until 2026-10-06 the FlakeHunter dashboard held all of `g26work.com`. Moving it took a FlakeHunter deploy that released
the domain, this stack's first deploy, then a FlakeHunter deploy for its subdomain; FlakeHunter's `docs/deployment.md`
("Custom domain") records the steps.

## Deploy

1. **The GitHub token can read this repository.** The stack reuses the Secrets Manager secret
   `flakehunter/github-token`. If that is a fine-grained token, `glennmcd/g26work-site` must be in its repository
   access on GitHub (Settings, Developer settings, the token, Repository access), or builds fail to clone.
2. **Deploy.**

   ```bash
   bun run --cwd infra cdk diff --profile g26work
   bun run --cwd infra cdk deploy --profile g26work
   ```

3. **On a new app, start the first build.** Amplify builds on pushes it hears through its GitHub webhook, which the
   stack creates. Creating the app does not build the code already on `main`, so until the first build the domain
   shows Amplify's "Welcome" placeholder. Start it once:

   ```bash
   aws amplify start-job --profile g26work --region us-east-2 --app-id <AmplifyAppId output> --branch-name main --job-type RELEASE
   ```

4. **On a new domain, wait for it.** The association reaches `AVAILABLE` in 15 to 30 minutes, once Amplify has written
   the DNS records and issued the certificate:

   ```bash
   aws amplify get-domain-association --profile g26work --region us-east-2 --app-id <AmplifyAppId output> --domain-name g26work.com --query domainAssociation.domainStatus --output text
   ```

## Check it

```bash
curl -sI https://g26work.com | grep -i -E "^(HTTP|location)"           # 301 to https://www.g26work.com/
curl -sI https://www.g26work.com | grep -i content-security-policy     # the policy from infra/lib/site-stack.ts
curl -sI https://www.g26work.com/nope/ | grep -i -E "^(HTTP|location)" # no location header: the 404 page in place
```

Amplify adds a trailing slash first, so `/nope` answers `301` to `/nope/`; that is expected.

## Day to day

Push to `main`; Amplify builds and serves it. Infrastructure changes go through `cdk diff` and `cdk deploy` as above.
The Amplify build runs the same `check:dist` as CI, so a page that would break the policy fails the build and the
previous version stays live.

**Tear down:** `bun run --cwd infra cdk destroy --profile g26work` deletes the app and its domain association.

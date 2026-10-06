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
- Response headers on every path: a Content-Security-Policy with no scripts and no inline styles, HSTS, `nosniff`, a
  referrer policy and a permissions policy.

The settings are in [`infra/cdk.json`](../infra/cdk.json) under `site*` keys. They are deliberately not `repository`
or `githubTokenSecretName`: those generic keys would also read your `~/.cdk.json`, which FlakeHunter uses for its own
repository.

## Before the first deploy

1. **The GitHub token can read this repository.** The stack reuses the Secrets Manager secret
   `flakehunter/github-token`. If that is a fine-grained token, add `glennmcd/g26work-site` to its repository access on
   GitHub (Settings, Developer settings, the token, Repository access). Otherwise the first build fails to clone.
2. **The domain is free.** An Amplify domain name belongs to one app. While FlakeHunter's association still covers
   `g26work.com`, creating this one fails. Move FlakeHunter to its own subdomain first (below).

## Cutover from FlakeHunter (one-off)

FlakeHunter used to serve `g26work.com`, `www` and `flakehunter`. Afterwards this site serves `g26work.com` and `www`,
and FlakeHunter serves `flakehunter.g26work.com` from its own association. `flakehunter.g26work.com` is down from step 1
until step 3 finishes (usually under an hour); FlakeHunter's `amplifyapp.com` URL keeps working throughout.

1. **FlakeHunter: release the domain.** In the FlakeHunter repository, with `customDomain` removed from
   `infra/cdk.json`, deploy `FlakeHunterWeb` (its runbook, step 8). The imported association has a `Retain` policy, so
   the deploy only detaches it; then delete it with `aws amplify delete-domain-association` as FlakeHunter's runbook
   ("Custom domain", step 1) shows, and check that the app lists no domain associations.
2. **This site: deploy.**

   ```bash
   bun run --cwd infra cdk diff --profile g26work
   bun run --cwd infra cdk deploy --profile g26work
   ```

   The first build starts by itself. Watch the domain until it reads `AVAILABLE` (15 to 30 minutes):

   ```bash
   aws amplify get-domain-association --profile g26work --region us-east-2 --app-id <AmplifyAppId output> --domain-name g26work.com --query domainAssociation.domainStatus --output text
   ```

3. **FlakeHunter: take its subdomain.** Set FlakeHunter's `customDomain` to
   `{ "domainName": "flakehunter.g26work.com", "subDomains": [""] }` and deploy `FlakeHunterWeb` again.

   The AWS documentation does not say outright that one app may hold `g26work.com` while another holds
   `flakehunter.g26work.com`. If Amplify refuses, this site keeps working; serve `flakehunter` from this site's
   association instead, as a redirect to FlakeHunter's `amplifyapp.com` URL.

Do steps 1 and 3 as two separate FlakeHunter deploys. Changing the domain name in one deploy makes CloudFormation create
the new association while the old one still claims `flakehunter`, and the deploy fails.

## Check it

```bash
curl -sI https://g26work.com | grep -i -E "^(HTTP|location)"          # 301 to https://www.g26work.com
curl -sI https://www.g26work.com | grep -i content-security-policy    # the policy from infra/lib/site-stack.ts
curl -s -o /dev/null -w "%{http_code}\n" https://www.g26work.com/nope # 404
```

## Day to day

Push to `main`; Amplify builds and serves it. Infrastructure changes go through `cdk diff` and `cdk deploy` as above.
The Amplify build runs the same `check:dist` as CI, so a page that would break the policy fails the build and the
previous version stays live.

**Tear down:** `bun run --cwd infra cdk destroy --profile g26work` deletes the app and its domain association.

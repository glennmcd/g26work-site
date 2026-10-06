import { CfnOutput, SecretValue, Stack, type StackProps, Tags } from "aws-cdk-lib";
import { CfnApp, CfnBranch, CfnDomain } from "aws-cdk-lib/aws-amplify";
import type { Construct } from "constructs";

export interface SiteStackProps extends StackProps {
  /** HTTPS URL of the GitHub repository Amplify builds from. */
  repository: string;
  /**
   * Name of a Secrets Manager secret holding a GitHub token that can read `repository` and register its webhook.
   * Resolved by CloudFormation at deploy time, so the token is never in the template.
   */
  githubTokenSecretName: string;
  /** The registered domain. The site is served on www.<domainName>; the bare domain redirects there. */
  domainName: string;
  /** Branch to build and serve. */
  branch?: string;
}

/** Bun version for the Amplify build; CI pins the same one (a test checks). */
export const BUN_VERSION = "1.4.2";

/**
 * The Amplify build for the static site. Amplify's build image has no Bun, so it installs it with npm; Astro needs
 * Node 22.12 or newer. The output is plain files in site/dist.
 */
export const BUILD_SPEC = `version: 1
frontend:
  phases:
    preBuild:
      commands:
        - nvm use 22 || nvm install 22
        - npm install --global bun@${BUN_VERSION}
        - bun install --frozen-lockfile
    build:
      commands:
        - bun run build:site
        - bun run check:dist
  artifacts:
    baseDirectory: site/dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
`;

/**
 * The page ships no JavaScript and only stylesheet files (site/src/lib/checkHtml.ts enforces both at build time), so
 * the policy can forbid scripts and inline styles outright. Images are the page's own files plus the GitHub Actions
 * status badges, which are served from github.com.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' https://github.com",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

export const CUSTOM_HEADERS = `customHeaders:
  - pattern: '**'
    headers:
      - key: Content-Security-Policy
        value: "${CONTENT_SECURITY_POLICY}"
      - key: Strict-Transport-Security
        value: max-age=31536000
      - key: X-Content-Type-Options
        value: nosniff
      - key: Referrer-Policy
        value: strict-origin-when-cross-origin
      - key: Permissions-Policy
        value: camera=(), microphone=(), geolocation=()
`;

const DOMAIN_NAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export class SiteStack extends Stack {
  readonly app: CfnApp;

  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    if (!DOMAIN_NAME.test(props.domainName)) {
      throw new Error(`domainName must be a lowercase domain such as example.com: got "${props.domainName}"`);
    }
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(props.repository)) {
      throw new Error(`repository must be https://github.com/<owner>/<repo>: got "${props.repository}"`);
    }
    if (!props.githubTokenSecretName.trim()) throw new Error("githubTokenSecretName is empty");

    const branchName = props.branch ?? "main";
    const www = `www.${props.domainName}`;
    Tags.of(this).add("project", "g26work-site");

    this.app = new CfnApp(this, "SiteApp", {
      name: "g26work-site",
      platform: "WEB",
      repository: props.repository,
      // A CloudFormation dynamic reference to Secrets Manager, resolved at deploy time.
      accessToken: SecretValue.secretsManager(props.githubTokenSecretName).unsafeUnwrap(),
      buildSpec: BUILD_SPEC,
      customHeaders: CUSTOM_HEADERS,
      environmentVariables: [{ name: "ASTRO_TELEMETRY_DISABLED", value: "1" }],
      customRules: [
        // One canonical address: the bare domain redirects permanently to www.
        { source: `https://${props.domainName}`, target: `https://${www}`, status: "301" },
        // Unknown paths get the site's own 404 page with a real 404 status.
        { source: "/<*>", target: "/404.html", status: "404" },
      ],
    });

    const branch = new CfnBranch(this, "Branch", {
      appId: this.app.attrAppId,
      branchName,
      stage: "PRODUCTION",
      enableAutoBuild: true,
    });

    // Amplify manages the certificate and, because the domain's hosted zone is in this account, the DNS records.
    const domain = new CfnDomain(this, "Domain", {
      appId: this.app.attrAppId,
      domainName: props.domainName,
      enableAutoSubDomain: false,
      subDomainSettings: [
        { prefix: "", branchName },
        { prefix: "www", branchName },
      ],
    });
    // The branch name is a plain string, so CloudFormation would not otherwise wait for the branch to exist.
    domain.addResourceDependency(branch);

    new CfnOutput(this, "AmplifyAppId", { value: this.app.attrAppId });
    new CfnOutput(this, "SiteUrl", { value: `https://${www}` });
    new CfnOutput(this, "BranchUrl", {
      value: `https://${branchName}.${this.app.attrDefaultDomain}`,
      description: "The site before the custom domain is ready",
    });
  }
}

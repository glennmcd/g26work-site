import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Template } from "aws-cdk-lib/assertions";
import { BUN_VERSION, CONTENT_SECURITY_POLICY } from "../lib/site-stack.js";

const infraRoot = path.join(import.meta.dir, "..");
const repoRoot = path.join(infraRoot, "..");

// Every template these tests need is synthesized in one Node process (see synth-worker.ts for why not in Bun).
const SCENARIOS = {
  defaults: {},
  branch: { branch: "release" },
  badDomain: { domainName: "Example.com" },
  badRepository: { repository: "git@github.com:glennmcd/g26work-site.git" },
  noSecret: { githubTokenSecretName: " " },
};

function synthAll(): Record<string, { template?: Template; error?: string }> {
  const run = Bun.spawnSync(["node", "--import", "tsx", "test/synth-worker.ts", JSON.stringify(SCENARIOS)], {
    cwd: infraRoot,
    env: { ...process.env },
  });
  const stdout = run.stdout.toString();
  const marker = stdout.lastIndexOf("@@RESULT@@");
  if (run.exitCode !== 0 || marker < 0) {
    throw new Error(`synth-worker failed (exit ${run.exitCode}): ${run.stderr.toString() || stdout}`);
  }
  const parsed = JSON.parse(stdout.slice(marker + "@@RESULT@@".length)) as Record<
    string,
    { template?: object; error?: string }
  >;
  return Object.fromEntries(
    Object.entries(parsed).map(([name, r]) => [
      name,
      { template: r.template ? Template.fromJSON(r.template) : undefined, error: r.error },
    ]),
  );
}

const results = synthAll();
const template = (name: string): Template => {
  const found = results[name]?.template;
  if (!found) throw new Error(`no template for ${name}: ${results[name]?.error}`);
  return found;
};
const app = () =>
  Object.values(template("defaults").findResources("AWS::Amplify::App"))[0] as { Properties: Record<string, unknown> };

describe("SiteStack Amplify app", () => {
  it("is a static web app built from the repository with the token from Secrets Manager", () => {
    const properties = app().Properties;
    expect(properties.Name).toBe("g26work-site");
    expect(properties.Platform).toBe("WEB");
    expect(properties.Repository).toBe("https://github.com/glennmcd/g26work-site");
    expect(String(properties.AccessToken)).toContain("{{resolve:secretsmanager:example/github-token");
    expect(String(properties.AccessToken)).not.toMatch(/gh[pousr]_|github_pat_/);
  });

  it("builds the site with Bun, checks the output against the policy, and serves site/dist", () => {
    const spec = String(app().Properties.BuildSpec);
    expect(spec).toContain(`npm install --global bun@${BUN_VERSION}`);
    expect(spec).toContain("bun install --frozen-lockfile");
    expect(spec).toMatch(/- bun run build:site\n\s+- bun run check:dist/);
    expect(spec).toContain("baseDirectory: site/dist");
  });

  it("runs the build scripts the build spec names", () => {
    const scripts = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")).scripts;
    expect(scripts["build:site"]).toBeDefined();
    expect(scripts["check:dist"]).toBeDefined();
  });

  it("redirects the bare domain to www first, then sends unknown paths to the 404 page with a 404 status", () => {
    expect(app().Properties.CustomRules).toEqual([
      { Source: "https://example.com", Target: "https://www.example.com", Status: "301" },
      { Source: "/<*>", Target: "/404.html", Status: "404" },
    ]);
  });

  it("sends a strict Content-Security-Policy and the other security headers on every path", () => {
    const headers = String(app().Properties.CustomHeaders);
    expect(headers).toContain("pattern: '**'");
    expect(headers).toContain(`value: "${CONTENT_SECURITY_POLICY}"`);
    for (const key of [
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      expect(headers).toContain(`key: ${key}`);
    }
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'none'");
    expect(CONTENT_SECURITY_POLICY).not.toContain("unsafe-inline");
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/script-src/);
  });

  it("turns Astro telemetry off in the build", () => {
    expect(app().Properties.EnvironmentVariables).toEqual([{ Name: "ASTRO_TELEMETRY_DISABLED", Value: "1" }]);
  });
});

describe("SiteStack branch and domain", () => {
  it("serves main as production with automatic builds", () => {
    template("defaults").hasResourceProperties("AWS::Amplify::Branch", {
      BranchName: "main",
      Stage: "PRODUCTION",
      EnableAutoBuild: true,
    });
  });

  it("serves the bare domain and www from the branch, after the branch exists", () => {
    const domains = template("defaults").findResources("AWS::Amplify::Domain") as Record<
      string,
      { Properties: Record<string, unknown>; DependsOn?: string[] }
    >;
    expect(Object.keys(domains)).toEqual(["Domain"]);
    expect(domains.Domain?.Properties).toMatchObject({
      DomainName: "example.com",
      EnableAutoSubDomain: false,
      SubDomainSettings: [
        { Prefix: "", BranchName: "main" },
        { Prefix: "www", BranchName: "main" },
      ],
    });
    expect(domains.Domain?.DependsOn).toContain("Branch");
    template("branch").hasResourceProperties("AWS::Amplify::Domain", {
      SubDomainSettings: [
        { Prefix: "", BranchName: "release" },
        { Prefix: "www", BranchName: "release" },
      ],
    });
  });

  it("outputs the app id and both URLs", () => {
    const outputs = template("defaults").toJSON().Outputs as Record<string, { Value: unknown }>;
    expect(Object.keys(outputs).sort()).toEqual(["AmplifyAppId", "BranchUrl", "SiteUrl"]);
    expect(outputs.SiteUrl?.Value).toBe("https://www.example.com");
  });

  it("tags everything with the project", () => {
    const tags = app().Properties.Tags as { Key: string; Value: string }[];
    expect(tags).toContainEqual({ Key: "project", Value: "g26work-site" });
  });
});

describe("SiteStack validation", () => {
  it("rejects a malformed domain, a non-https repository and an empty secret name", () => {
    expect(results.badDomain?.error).toContain("domainName must be a lowercase domain");
    expect(results.badRepository?.error).toContain("repository must be https://github.com/<owner>/<repo>");
    expect(results.noSecret?.error).toBe("githubTokenSecretName is empty");
  });
});

describe("configuration in the repository", () => {
  it("names the site's repository, domain and token secret in cdk.json under keys no other app uses", () => {
    const context = JSON.parse(readFileSync(path.join(infraRoot, "cdk.json"), "utf8")).context;
    expect(context.siteRepository).toBe("https://github.com/glennmcd/g26work-site");
    expect(context.siteDomainName).toBe("g26work.com");
    expect(context.siteGithubTokenSecretName).toBe("flakehunter/github-token");
    expect(context).not.toHaveProperty("repository");
  });

  it("pins the same Bun version as CI", () => {
    const ci = readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8");
    expect(/bun-version:\s*([\d.]+)/.exec(ci)?.[1]).toBe(BUN_VERSION);
  });
});

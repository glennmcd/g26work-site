// Runs under Node (via tsx), not Bun: CDK's template validation takes about 100 seconds to start in Bun and about one
// second in Node. The tests call this once with every scenario they need and assert on the JSON it prints.
//
// Usage: node --import tsx test/synth-worker.ts '<{"name": {...SiteStackProps}, ...}>'
import { App } from "aws-cdk-lib";
import { SiteStack, type SiteStackProps } from "../lib/site-stack.js";

const scenarios = JSON.parse(process.argv[2] ?? "{}") as Record<string, Partial<SiteStackProps>>;
const env = { account: "123456789012", region: "us-east-2" };
const defaults: SiteStackProps = {
  repository: "https://github.com/glennmcd/g26work-site",
  githubTokenSecretName: "example/github-token",
  domainName: "example.com",
};

const out: Record<string, { template: unknown; error?: string }> = {};
for (const [name, props] of Object.entries(scenarios)) {
  try {
    const app = new App({ analyticsReporting: false });
    new SiteStack(app, "Test", { env, ...defaults, ...props });
    out[name] = { template: app.synth().getStackByName("Test").template };
  } catch (error) {
    out[name] = { template: undefined, error: error instanceof Error ? error.message : String(error) };
  }
}
process.stdout.write(`\n@@RESULT@@${JSON.stringify(out)}`);

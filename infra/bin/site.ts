import { App } from "aws-cdk-lib";
import { SiteStack } from "../lib/site-stack.js";

// Everything lives in the project's one AWS Region. The account comes from the credentials the CDK CLI runs with
// (CDK_DEFAULT_ACCOUNT), so no account id is committed.
const REGION = "us-east-2";

const app = new App();

// The settings live in this repository's cdk.json under their own keys. Generic keys such as `repository` would also
// pick up values from ~/.cdk.json, which other CDK apps on this machine (FlakeHunter) use for their own repository.
const required = (name: string): string => {
  const value = app.node.tryGetContext(name);
  if (typeof value !== "string" || value === "") throw new Error(`context ${name} is not set (see infra/cdk.json)`);
  return value;
};

new SiteStack(app, "G26WorkSite", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: REGION },
  description: "g26work.com: the public project page on Amplify Hosting",
  repository: required("siteRepository"),
  githubTokenSecretName: required("siteGithubTokenSecretName"),
  domainName: required("siteDomainName"),
});

import { defineConfig } from "astro/config";

// Static output only: the page ships no client JavaScript. Stylesheets are always external files, never inlined, so
// the Content-Security-Policy set in infra/lib/site-stack.ts can forbid inline styles.
export default defineConfig({
  site: "https://www.g26work.com",
  output: "static",
  build: { inlineStylesheets: "never" },
  devToolbar: { enabled: false },
});

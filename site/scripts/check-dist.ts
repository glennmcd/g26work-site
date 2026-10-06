// Checks every built page against the production policy (see src/lib/checkHtml.ts). Run after `astro build`:
//   bun run check:dist
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { checkHtml } from "../src/lib/checkHtml";

const dist = path.join(import.meta.dir, "..", "dist");
const pages = readdirSync(dist, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".html"));
if (pages.length === 0) {
  console.error(`check-dist: no HTML in ${dist}; run the build first`);
  process.exit(1);
}

let failed = false;
for (const page of pages) {
  for (const problem of checkHtml(readFileSync(path.join(dist, page), "utf8"))) {
    console.error(`check-dist: ${page} ${problem}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`check-dist: ${pages.length} page(s) pass`);

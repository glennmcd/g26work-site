// The site's Content-Security-Policy (infra/lib/site-stack.ts) allows no scripts and no inline styles, and every
// link must be https. A built page that breaks any of these would be blocked or insecure in production, so
// scripts/check-dist.ts runs this over the build output in CI and fails the build instead.

/** Every way this HTML would break the production policy; an empty list means it is fine. */
export function checkHtml(html: string): string[] {
  const problems: string[] = [];
  if (/<script\b/i.test(html)) problems.push("contains a <script> element (the page ships no JavaScript)");
  if (/<style\b/i.test(html))
    problems.push("contains an inline <style> element (the CSP allows only stylesheet files)");
  if (/\sstyle\s*=/i.test(html)) problems.push("contains a style attribute (the CSP allows only stylesheet files)");
  for (const match of html.matchAll(/\s(?:href|src)\s*=\s*"(http:[^"]*)"/gi)) {
    problems.push(`links over plain http: ${match[1]}`);
  }
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\salt\s*=\s*"[^"]+"/i.test(match[0])) problems.push(`has an image without alt text: ${match[0]}`);
  }
  if (!/<html[^>]*\slang="[^"]+"/i.test(html)) problems.push("has no lang attribute on <html>");
  return problems;
}

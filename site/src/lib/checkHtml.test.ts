import { describe, expect, it } from "bun:test";
import { checkHtml } from "./checkHtml";

const page = (body: string, head = "") =>
  `<!doctype html><html lang="en"><head>${head}<link rel="stylesheet" href="/_astro/a.css"></head><body>${body}</body></html>`;

describe("checkHtml", () => {
  it("accepts a page with external stylesheets, https links and described images", () => {
    expect(checkHtml(page('<a href="https://github.com/x">x</a><img src="https://x/b.svg" alt="status">'))).toEqual([]);
  });

  it("rejects scripts, inline style elements and style attributes", () => {
    const problems = checkHtml(page('<p style="color:red">x</p><script>1</script>', "<style>p{}</style>"));
    expect(problems).toHaveLength(3);
    expect(problems.join()).toContain("<script>");
    expect(problems.join()).toContain("inline <style>");
    expect(problems.join()).toContain("style attribute");
  });

  it("rejects plain-http links and images", () => {
    expect(checkHtml(page('<a href="http://example.com">x</a>'))).toEqual([
      "links over plain http: http://example.com",
    ]);
  });

  it("rejects an image without alt text", () => {
    expect(checkHtml(page('<img src="https://x/b.svg">'))[0]).toContain("image without alt text");
    expect(checkHtml(page('<img src="https://x/b.svg" alt="">'))[0]).toContain("image without alt text");
  });

  it("requires a language on the document", () => {
    expect(checkHtml("<html><body></body></html>")).toContain("has no lang attribute on <html>");
  });
});

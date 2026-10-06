---
version: 1
slug: "site-src-pages-index-astro"
primary_target: "site/src/pages/index.astro"
related_targets: []
---

# Surface: home page (www.g26work.com)

Scope: the single public page. Visitor mode: Experience (portfolio). Audience: hiring managers and recruiters, one visit,
from a résumé or LinkedIn link. Action: reach a project's source (primary) or demo, or the GitHub/LinkedIn profiles.
Content: PRODUCT.md (intro line verbatim "Projects representing my work"; FlakeHunter only; demo password-protected).

## Direction contract

THESIS: The page is a build-status board for a body of work: each project is one pipeline row whose stages are the
places you can go (source, CI, deploy, demo). It refuses the card grid of icon + title + blurb and the hero-plus-
avatar portfolio.

OWN-WORLD: Daylight board: pale cool ground, ink near-black, one signal green for open/public, one amber for
restricted, live CI shown by GitHub's own workflow badge. Semi-condensed Barlow display set like a board header;
literal strings (repo path, host) in monospace because they are data. Stages are chips joined by a 2px pipeline rule
with round status lamps; elevation is a 1px border, never a shadow.

STORY: The visitor reads the board title (g26work, by glennmcd), sees one project row lit, understands each stage is
a real place, and clicks the source stage; the amber demo stage tells them it is password-protected before they click.

FIRST VIEWPORT: Top rule: "g26work" display left, "glennmcd · GitHub · LinkedIn" right. Caption "Projects
representing my work" with a status summary derived from data (1 project · source public · demo restricted). Then the
FlakeHunter row at full width: name large, one-line description, the four-stage pipeline beneath with the source
stage as the primary action (green lamp, heaviest chip). Legend of lamp meanings closes the board.

FORM: CI status board, my top-ranked grounded candidate (1 of 7), chosen by the user as IMPECCABLE'S PICK; seed key
ef8d4cc4. Signature interaction: on load the pipeline lamps light in stage order once (CSS, already-visible default,
off under prefers-reduced-motion); hovering or focusing a stage lights its segment of the pipeline rule.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

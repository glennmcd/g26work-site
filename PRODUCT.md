# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro (static output, no client JavaScript), plain CSS, built with Bun. Hosted on AWS Amplify Hosting (static `WEB`
platform) in the `g26work` AWS project, us-east-2, deployed by a CDK stack in `infra/`.

## Users

Hiring managers and recruiters evaluating glennmcd for a role. They arrive from a résumé, profile or message link,
spend little time, and want to see quickly what he builds and get to the code.

## Product Purpose

The public home page of `g26work.com` (served at `www.g26work.com`, with the bare domain redirecting there). It lists
projects that represent glennmcd's work and links to each one's source and, where there is one, a live demo. Success:
a visitor reaches a project's GitHub repository, or the LinkedIn profile, in one click.

## Positioning

Every project listed is real, public and running: each links to its own source, and live demos are on subdomains of
`g26work.com`.

## Operating Context

Read on desktop and phone, usually once, often from a link in a hiring conversation. No sign-in, no forms, no tracking.

## Capabilities and Constraints

- One page. Intro line, verbatim: "Projects representing my work".
- Identity: the GitHub handle `glennmcd` (https://github.com/glennmcd) and LinkedIn (https://www.linkedin.com/in/glennmcd).
  No full name on the page.
- Projects come from one data file; adding a project is adding one entry.
- Projects today: FlakeHunter only.
- A live demo behind a password is labelled as password-protected next to its link, so no visitor is surprised by a
  login prompt.

## Brand Commitments

None beyond the names above. The FlakeHunter dashboard's restraint (no shadows, elevation as a 1px border) is a
stated preference for this page too.

## Evidence on Hand

- FlakeHunter: public repo https://github.com/glennmcd/flakehunter; its README's one-line description: "Find the flaky
  tests in your GitHub Actions CI: any test that both passes and fails on the same commit." Live demo at
  https://flakehunter.g26work.com, password-protected (access on request through a GitHub issue).
- No testimonials, employers, metrics, photos or logos. Do not invent any.

## Product Principles

- Get the visitor to the work: source first, demo second.
- State only what is true and checkable from the links.
- Say less: one line of intro, one line per project.

## Accessibility & Inclusion

WCAG 2.2 AA contrast in light and dark themes; fully usable by keyboard and screen reader; no motion required.

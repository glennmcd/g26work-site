// Everything the page says comes from this file. Adding a project is adding one entry to `projects`; `checkProjects`
// runs at build time (src/pages/index.astro) and in the tests, so a malformed entry fails the build, not the page.

/** Who can open a stage's link: anyone, or only people who have been given access. */
export type Access = "public" | "restricted";

/** The pipeline stages a project row can show, in board order. */
export const STAGE_KINDS = ["source", "ci", "deploy", "demo"] as const;
export type StageKind = (typeof STAGE_KINDS)[number];

export interface Stage {
  kind: StageKind;
  /** Where the stage's link goes. Must be https. */
  href: string;
  /** Where the stage points, as a visitor would recognise it: a repo path, a host, or a short description. */
  detail: string;
  /** True when `detail` is a literal string (a path or host), set in monospace; false for a plain description. */
  literal: boolean;
  access: Access;
  /** Required for a restricted stage: what the visitor needs to know before clicking, and how to get access. */
  note?: { text: string; href: string; linkText: string };
  /** A live status image published by the service itself (for example a GitHub Actions workflow badge). */
  badge?: { src: string; alt: string };
}

export interface Project {
  /** Lowercase slug, used as the row's anchor. */
  id: string;
  name: string;
  /** One line, in the project's own words. */
  summary: string;
  /** Year the project started. */
  year: number;
  stack: string[];
  license: string;
  /** Starts with the source stage, which is the row's primary link. */
  stages: Stage[];
}

export const owner = {
  handle: "glennmcd",
  github: "https://github.com/glennmcd",
  linkedin: "https://www.linkedin.com/in/glennmcd",
} as const;

export const intro = "Projects representing my work";

export const projects: Project[] = [
  {
    id: "flakehunter",
    name: "FlakeHunter",
    summary: "Find the flaky tests in your GitHub Actions CI: any test that both passes and fails on the same commit.",
    year: 2026,
    stack: ["TypeScript", "Fastify", "Next.js", "PostgreSQL", "AWS CDK"],
    license: "MIT",
    stages: [
      {
        kind: "source",
        href: "https://github.com/glennmcd/flakehunter",
        detail: "github.com/glennmcd/flakehunter",
        literal: true,
        access: "public",
      },
      {
        kind: "ci",
        href: "https://github.com/glennmcd/flakehunter/actions/workflows/ci.yml",
        detail: "GitHub Actions",
        literal: false,
        access: "public",
        badge: {
          src: "https://github.com/glennmcd/flakehunter/actions/workflows/ci.yml/badge.svg",
          alt: "Current status of the CI workflow on main",
        },
      },
      {
        kind: "deploy",
        href: "https://github.com/glennmcd/flakehunter/blob/main/docs/deployment.md",
        detail: "AWS Lambda and Amplify, via CDK",
        literal: false,
        access: "public",
      },
      {
        kind: "demo",
        href: "https://flakehunter.g26work.com",
        detail: "flakehunter.g26work.com",
        literal: true,
        access: "restricted",
        note: {
          text: "Password-protected.",
          href: "https://github.com/glennmcd/flakehunter/issues",
          linkText: "Ask for access in a GitHub issue",
        },
      },
    ],
  },
];

export const STAGE_LABELS: Record<StageKind, string> = {
  source: "Source",
  ci: "CI",
  deploy: "Deploy",
  demo: "Live demo",
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SUMMARY_MAX = 140;

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Every problem with the data, each naming the project and field; an empty list means the data is valid. */
export function checkProjects(list: readonly Project[]): string[] {
  const problems: string[] = [];
  if (list.length === 0) problems.push("projects: list at least one project");
  const ids = new Set<string>();
  for (const project of list) {
    const at = `projects[${project.id || "?"}]`;
    if (!SLUG.test(project.id)) problems.push(`${at}.id must be a lowercase slug`);
    if (ids.has(project.id)) problems.push(`${at}.id is used twice`);
    ids.add(project.id);
    if (!project.name.trim()) problems.push(`${at}.name is empty`);
    if (!project.summary.trim()) problems.push(`${at}.summary is empty`);
    if (project.summary.length > SUMMARY_MAX) problems.push(`${at}.summary is over ${SUMMARY_MAX} characters`);
    if (!Number.isInteger(project.year) || project.year < 1990 || project.year > 2100) {
      problems.push(`${at}.year must be a four-digit year`);
    }
    if (project.stack.length === 0) problems.push(`${at}.stack lists nothing`);
    if (project.stages[0]?.kind !== "source") problems.push(`${at}.stages must start with the source stage`);

    const kinds = project.stages.map((stage) => stage.kind);
    if (new Set(kinds).size !== kinds.length) problems.push(`${at}.stages lists a stage twice`);
    const ordered = [...kinds].sort((a, b) => STAGE_KINDS.indexOf(a) - STAGE_KINDS.indexOf(b));
    if (ordered.join() !== kinds.join()) problems.push(`${at}.stages must be in the order ${STAGE_KINDS.join(", ")}`);

    for (const stage of project.stages) {
      const where = `${at}.stages[${stage.kind}]`;
      if (!isHttps(stage.href)) problems.push(`${where}.href must be an https URL`);
      if (!stage.detail.trim()) problems.push(`${where}.detail is empty`);
      if (stage.access === "restricted" && !stage.note) {
        problems.push(`${where} is restricted, so it needs a note saying how to get access`);
      }
      if (stage.note && !isHttps(stage.note.href)) problems.push(`${where}.note.href must be an https URL`);
      if (stage.badge && !isHttps(stage.badge.src)) problems.push(`${where}.badge.src must be an https URL`);
      if (stage.badge && !stage.badge.alt.trim()) problems.push(`${where}.badge.alt is empty`);
    }
  }
  return problems;
}

/** The board's status line, derived from the data so it can never disagree with the rows. */
export function summarize(list: readonly Project[]): { projects: number; public: number; restricted: number } {
  const stages = list.flatMap((project) => project.stages);
  return {
    projects: list.length,
    public: stages.filter((stage) => stage.access === "public").length,
    restricted: stages.filter((stage) => stage.access === "restricted").length,
  };
}

/** Throws with every problem listed. Called by the page so a bad entry stops the build. */
export function assertValidProjects(list: readonly Project[]): void {
  const problems = checkProjects(list);
  if (problems.length > 0) throw new Error(`Invalid project data:\n- ${problems.join("\n- ")}`);
}

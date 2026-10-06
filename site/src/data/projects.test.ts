import { describe, expect, it } from "bun:test";
import { assertValidProjects, checkProjects, intro, owner, type Project, projects, summarize } from "./projects";

const valid = (): Project => ({
  id: "demo-app",
  name: "Demo App",
  summary: "Does one thing well.",
  year: 2026,
  stack: ["TypeScript"],
  license: "MIT",
  stages: [
    {
      kind: "source",
      href: "https://github.com/example/demo-app",
      detail: "github.com/example/demo-app",
      literal: true,
      access: "public",
    },
    {
      kind: "demo",
      href: "https://demo.example.com",
      detail: "demo.example.com",
      literal: true,
      access: "restricted",
      note: { text: "Password-protected.", href: "https://github.com/example/demo-app/issues", linkText: "Ask" },
    },
  ],
});

describe("the published data", () => {
  it("is valid", () => {
    expect(checkProjects(projects)).toEqual([]);
  });

  it("uses the intro line and identity agreed for the page", () => {
    expect(intro).toBe("Projects representing my work");
    expect(owner).toEqual({
      handle: "glennmcd",
      github: "https://github.com/glennmcd",
      linkedin: "https://www.linkedin.com/in/glennmcd",
    });
  });

  it("links FlakeHunter's source first and marks its demo password-protected", () => {
    const flakehunter = projects.find((p) => p.id === "flakehunter");
    expect(flakehunter?.stages[0]?.href).toBe("https://github.com/glennmcd/flakehunter");
    const demo = flakehunter?.stages.find((s) => s.kind === "demo");
    expect(demo?.access).toBe("restricted");
    expect(demo?.note?.text).toContain("Password-protected");
  });
});

describe("literal details", () => {
  it("are set only for paths and hosts, so descriptions are not dressed as code", () => {
    const stages = projects.flatMap((p) => p.stages);
    for (const stage of stages) {
      expect(stage.literal).toBe(/^[\w.-]+(\/[\w.-]+)*$/.test(stage.detail));
    }
  });
});

describe("checkProjects", () => {
  it("accepts a well-formed project", () => {
    expect(checkProjects([valid()])).toEqual([]);
  });

  it("rejects an empty list", () => {
    expect(checkProjects([])).toEqual(["projects: list at least one project"]);
  });

  it("rejects a bad or repeated id", () => {
    expect(checkProjects([{ ...valid(), id: "Demo App" }])).toContain("projects[Demo App].id must be a lowercase slug");
    expect(checkProjects([valid(), valid()])).toContain("projects[demo-app].id is used twice");
  });

  it("rejects an empty or over-long summary", () => {
    expect(checkProjects([{ ...valid(), summary: " " }])).toContain("projects[demo-app].summary is empty");
    expect(checkProjects([{ ...valid(), summary: "x".repeat(141) }])).toContain(
      "projects[demo-app].summary is over 140 characters",
    );
  });

  it("rejects a year that is not four digits", () => {
    expect(checkProjects([{ ...valid(), year: 26 }])).toContain("projects[demo-app].year must be a four-digit year");
  });

  it("requires the source stage first, no repeats, and board order", () => {
    const [source, demo] = valid().stages as [Project["stages"][0], Project["stages"][0]];
    expect(checkProjects([{ ...valid(), stages: [demo, source] }])).toContain(
      "projects[demo-app].stages must start with the source stage",
    );
    expect(checkProjects([{ ...valid(), stages: [source, source] }])).toContain(
      "projects[demo-app].stages lists a stage twice",
    );
    const ci = { ...source, kind: "ci" as const };
    expect(checkProjects([{ ...valid(), stages: [source, demo, ci] }])).toContain(
      "projects[demo-app].stages must be in the order source, ci, deploy, demo",
    );
  });

  it("rejects links that are not https", () => {
    const project = valid();
    project.stages[0] = { ...(project.stages[0] as Project["stages"][0]), href: "http://example.com" };
    expect(checkProjects([project])).toContain("projects[demo-app].stages[source].href must be an https URL");
  });

  it("requires a note on a restricted stage, so nobody meets a password prompt unwarned", () => {
    const project = valid();
    const { note: _note, ...demo } = project.stages[1] as Project["stages"][0];
    project.stages[1] = demo;
    expect(checkProjects([project])).toContain(
      "projects[demo-app].stages[demo] is restricted, so it needs a note saying how to get access",
    );
  });

  it("rejects a badge that is not https or has no alt text", () => {
    const project = valid();
    project.stages[0] = {
      ...(project.stages[0] as Project["stages"][0]),
      badge: { src: "http://example.com/badge.svg", alt: "" },
    };
    const problems = checkProjects([project]);
    expect(problems).toContain("projects[demo-app].stages[source].badge.src must be an https URL");
    expect(problems).toContain("projects[demo-app].stages[source].badge.alt is empty");
  });
});

describe("summarize", () => {
  it("counts projects and public versus restricted stages", () => {
    expect(summarize([valid(), { ...valid(), id: "other" }])).toEqual({ projects: 2, public: 2, restricted: 2 });
  });
});

describe("assertValidProjects", () => {
  it("throws with every problem listed", () => {
    expect(() => assertValidProjects([{ ...valid(), id: "", summary: "" }])).toThrow(
      /Invalid project data:\n- .*id must be a lowercase slug\n- .*summary is empty/,
    );
  });
});

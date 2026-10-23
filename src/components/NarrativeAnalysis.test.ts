// NarrativeAnalysis block-splitting tests — pure string processing.

import { describe, it, expect } from "vitest";
import { splitBlocks } from "@/components/NarrativeAnalysis";

describe("splitBlocks", () => {
  it("returns a single markdown block for prose without tables", () => {
    const blocks = splitBlocks("## Heading\n\nSome prose here.");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ kind: "markdown", text: "## Heading\n\nSome prose here." });
  });

  it("extracts a well-formed pipe table with header + separator + rows", () => {
    const md = "Before.\n\n| Metric | Value | Status |\n|---|---|---|\n| NDVI | 0.62 | Good |\n| pH | 6.8 | Optimal |\n\nAfter.";
    const blocks = splitBlocks(md);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({ kind: "markdown", text: "Before.\n\n" });
    expect(blocks[1]).toEqual({
      kind: "table",
      rows: [
        ["Metric", "Value", "Status"],
        ["NDVI", "0.62", "Good"],
        ["pH", "6.8", "Optimal"],
      ],
    });
    expect(blocks[2]).toEqual({ kind: "markdown", text: "\nAfter." });
  });

  it("treats a lone header row as markdown (no separator, no body)", () => {
    const blocks = splitBlocks("Just prose | with a pipe");
    // "Just prose | with a pipe" is not |-delimited at both ends, so it stays prose
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("markdown");
  });

  it("recovers a header-only table as markdown lines", () => {
    const md = "| A | B |\nno separator line";
    const blocks = splitBlocks(md);
    expect(blocks.every((b) => b.kind === "markdown")).toBe(true);
  });

  it("handles escaped-newline AI output (\\n literals)", () => {
    const raw = "## Section\\n| a | b |\\n|---|---|\\n| 1 | 2 |";
    const blocks = splitBlocks(raw);
    const table = blocks.find((b) => b.kind === "table");
    expect(table).toBeDefined();
    expect((table as { rows: string[][] }).rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps bold, lists, and headings in markdown blocks untouched", () => {
    const md = "**Score: 8/10** — strong.\n\n- item one\n- item two";
    const blocks = splitBlocks(md);
    expect(blocks[0].kind).toBe("markdown");
    expect((blocks[0] as { text: string }).text).toContain("**Score: 8/10**");
  });
});

// Narrative renderer for the AI analysis markdown: ReactMarkdown for prose +
// pipe tables extracted into real <table> elements (screen-reader and print
// friendly, and immune to react-markdown table-plugin churn).

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";

type Block =
  | { kind: "markdown"; text: string }
  | { kind: "table"; rows: string[][] };

const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const parseRow = (line: string) =>
  line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const isSeparatorCell = (cell: string) => /^:?-{3,}:?$/.test(cell.trim());

export function splitBlocks(raw: string): Block[] {
  const text = raw.replace(/\\n/g, "\n");
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let md: string[] = [];
  const flush = () => {
    if (md.length) { blocks.push({ kind: "markdown", text: md.join("\n") }); md = []; }
  };
  for (let i = 0; i < lines.length; i++) {
    if (!isTableRow(lines[i])) { md.push(lines[i]); continue; }
    // Keep the visual blank line that separates prose from a rendered table.
    if (md.length > 0 && md[md.length - 1] === "") md.push("");
    flush();
    const rows: string[][] = [];
    while (i < lines.length && isTableRow(lines[i])) { rows.push(parseRow(lines[i])); i++; }
    const hasSeparator = rows[1]?.every(isSeparatorCell);
    if (hasSeparator) rows.splice(1, 1);
    if (rows.length >= 2) blocks.push({ kind: "table", rows });
    else rows.forEach((r) => md.push(`| ${r.join(" | ")} |`));
    i--;
  }
  flush();
  return blocks;
}

export function NarrativeAnalysis({ text, className = "" }: { text: string; className?: string }) {
  const blocks = useMemo(() => splitBlocks(text), [text]);
  return (
    <div className={`space-y-3 text-sm text-foreground ${className}`} data-testid="ai-narrative">
      {blocks.map((b, i) =>
        b.kind === "markdown" ? (
          <div key={i} className="prose prose-invert prose-sm max-w-none [&_h2]:text-base [&_h2]:text-foreground [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_li]:my-0.5 [&_strong]:text-foreground">
            <ReactMarkdown>{b.text}</ReactMarkdown>
          </div>
        ) : (
          <div key={i} className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-accent/40">
                <tr>
                  {b.rows[0].map((cell, j) => (
                    <th key={j} className="px-2.5 py-1.5 text-left font-medium text-foreground">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.slice(1).map((row, r) => (
                  <tr key={r} className="border-t border-border/60">
                    {row.map((cell, j) => (
                      <td key={j} className="px-2.5 py-1.5 text-muted-foreground">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </div>
  );
}

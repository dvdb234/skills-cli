import fs from "node:fs";

// Minimal YAML-frontmatter reader: enough to pull top-level scalars like
// `name` and `description` out of a SKILL.md. Not a full YAML parser — it
// handles single-line scalars and `|` / `>` block scalars, and ignores
// nested (indented) keys such as those under `metadata:`.
export function parseFrontmatter(mdPath) {
  const raw = fs.readFileSync(mdPath, "utf8");
  const m = raw.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/);
  const data = {};
  if (!m) return data;

  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    // Only top-level keys (no leading whitespace).
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const rawValue = kv[2].trim();

    // Block scalar: `|`, `>`, with optional chomping indicators (-, +).
    if (/^[|>][+-]?$/.test(rawValue)) {
      const block = [];
      while (i + 1 < lines.length && /^(\s+\S|\s*$)/.test(lines[i + 1])) {
        i++;
        block.push(lines[i].trim());
      }
      // Collapse to a single readable line (we only use this for display).
      data[key] = block.join(" ").replace(/\s+/g, " ").trim();
      continue;
    }

    // Single-line scalar: strip one matching pair of surrounding quotes.
    let value = rawValue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return data;
}

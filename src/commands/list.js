import fs from "node:fs";
import path from "node:path";
import { skillsRoot } from "../lib/paths.js";
import { parseFrontmatter } from "../lib/frontmatter.js";
import * as log from "../lib/log.js";

export function list() {
  const root = skillsRoot();
  if (!fs.existsSync(root)) {
    log.info(`No skills installed yet (${root} does not exist).`);
    return;
  }

  const skills = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(root, name, "SKILL.md")))
    .sort();

  if (skills.length === 0) {
    log.info(`No skills installed in ${root}.`);
    return;
  }

  log.info(log.bold(`Installed skills  ${log.dim("(" + root + ")")}`));
  for (const name of skills) {
    let desc = "";
    try {
      desc = parseFrontmatter(path.join(root, name, "SKILL.md")).description || "";
    } catch {
      /* ignore unreadable frontmatter */
    }
    const tail = desc ? "  " + log.dim(truncate(desc, 80)) : "";
    log.info(`  ${log.cyan(name)}${tail}`);
  }
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

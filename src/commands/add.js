import fs from "node:fs";
import path from "node:path";
import { resolveSource } from "../lib/sources.js";
import { parseFrontmatter } from "../lib/frontmatter.js";
import { skillsRoot } from "../lib/paths.js";
import * as log from "../lib/log.js";

// Folder name must be a single safe path segment (no separators, no traversal).
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export async function add(source, opts = {}) {
  if (!source) {
    throw new Error(
      "Usage: skills add <source> [--path <subdir>] [--name <name>] [--ref <ref>] [--force] [--dry-run]"
    );
  }

  const { skillDir, cleanup } = await resolveSource(source, opts);
  try {
    const fm = parseFrontmatter(path.join(skillDir, "SKILL.md"));
    const name = String(opts.name || fm.name || path.basename(skillDir)).trim();

    if (!SAFE_NAME.test(name)) {
      throw new Error(
        `Unsafe skill name "${name}". Pass --name with only letters, digits, ".", "_" or "-".`
      );
    }
    if (!fm.name) log.warn(`SKILL.md has no "name" in frontmatter; using "${name}".`);
    if (!fm.description) {
      log.warn('SKILL.md has no "description"; Claude may not know when to use this skill.');
    }

    const root = skillsRoot();
    const dest = path.join(root, name);
    // Defence in depth: dest must be a direct child of the skills root.
    if (path.dirname(path.resolve(dest)) !== path.resolve(root)) {
      throw new Error("Refusing to install outside the skills directory.");
    }

    if (opts["dry-run"]) {
      log.info(`Would install ${log.bold(name)}`);
      if (fm.description) log.info(`  ${log.dim(fm.description)}`);
      log.info(`  from: ${skillDir}`);
      log.info(`  to:   ${dest}`);
      if (fs.existsSync(dest)) {
        log.warn(`"${name}" already exists — would ${opts.force ? "overwrite" : "refuse (needs --force)"}.`);
      }
      return;
    }

    if (fs.existsSync(dest)) {
      if (!opts.force) {
        throw new Error(`"${name}" is already installed at ${dest}. Use --force to overwrite.`);
      }
      fs.rmSync(dest, { recursive: true, force: true });
    }

    fs.mkdirSync(root, { recursive: true });
    fs.cpSync(skillDir, dest, {
      recursive: true,
      filter: (src) => path.basename(src) !== ".git",
    });

    log.ok(`Installed ${log.bold(name)}`);
    if (fm.description) log.info(`  ${log.dim(fm.description)}`);
    log.info(`  ${dest}`);
    log.info("");
    log.info(
      `Start a new Claude Code session, then run ${log.cyan("/" + name)} or just ask Claude to use it.`
    );
  } finally {
    cleanup();
  }
}

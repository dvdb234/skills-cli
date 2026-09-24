import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { skillsRoot } from "../lib/paths.js";
import * as log from "../lib/log.js";

export async function remove(name, opts = {}) {
  if (!name) throw new Error("Usage: skills remove <name> [--yes]");

  const root = skillsRoot();
  const dest = path.join(root, name);
  // Reject names that contain separators or traversal.
  if (path.dirname(path.resolve(dest)) !== path.resolve(root)) {
    throw new Error(`Invalid skill name "${name}".`);
  }
  if (!fs.existsSync(dest)) {
    throw new Error(`"${name}" is not installed (${dest}).`);
  }

  if (!opts.yes) {
    const yes = await confirm(`Remove skill "${name}" from ${dest}? [y/N] `);
    if (!yes) {
      log.info("Aborted.");
      return;
    }
  }

  fs.rmSync(dest, { recursive: true, force: true });
  log.ok(`Removed ${name}`);
}

function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

#!/usr/bin/env node
// Installs the `skills` CLI so it's callable from any shell.
//
// Copies this package to ~/.local/lib/claude-skills-cli and writes launcher
// shims (skills.cmd for Windows, skills for POSIX shells) into ~/.local/bin,
// which is on PATH in this environment. Re-run after editing the source to
// update the installed copy.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const home = os.homedir();
const libDir = path.join(home, ".local", "lib", "claude-skills-cli");
const binDir = path.join(home, ".local", "bin");

// 1. Copy the package into a stable location.
fs.rmSync(libDir, { recursive: true, force: true });
fs.mkdirSync(libDir, { recursive: true });
for (const item of ["bin", "src", "package.json", "README.md"]) {
  const from = path.join(here, item);
  if (fs.existsSync(from)) {
    fs.cpSync(from, path.join(libDir, item), { recursive: true });
  }
}

// 2. Write launcher shims into a bin dir that's on PATH.
fs.mkdirSync(binDir, { recursive: true });
const entry = path.join(libDir, "bin", "skills.js");
const entryPosix = entry.replace(/\\/g, "/");

fs.writeFileSync(path.join(binDir, "skills.cmd"), `@echo off\r\nnode "${entry}" %*\r\n`);

const sh = path.join(binDir, "skills");
fs.writeFileSync(sh, `#!/bin/sh\nexec node "${entryPosix}" "$@"\n`);
try {
  fs.chmodSync(sh, 0o755);
} catch {
  /* no-op on Windows */
}

console.log("Installed the skills CLI.");
console.log("  code:     " + libDir);
console.log("  launcher: " + path.join(binDir, "skills.cmd"));
console.log("");
console.log('Open a new terminal (so PATH refreshes), then run: skills --help');

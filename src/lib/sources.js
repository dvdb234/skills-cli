import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Resolve any supported `source` into a local folder that contains a SKILL.md.
//
// Returns { skillDir, cleanup }. Call cleanup() when done to remove any temp
// files that were created (clones, downloads). For local sources it's a no-op.
//
// Supported sources:
//   - local path to a skill folder or to a SKILL.md file
//   - owner/repo   or   owner/repo/sub/dir           (GitHub shorthand)
//   - https://github.com/owner/repo[/tree|/blob/ref/sub]
//   - any git URL ending in .git, or git@host:owner/repo.git
//   - a direct URL to a SKILL.md
export async function resolveSource(source, opts = {}) {
  // A path that exists on disk always wins over shorthand interpretation.
  if (fs.existsSync(source)) return resolveLocal(source, opts);

  if (/^https?:\/\//i.test(source)) return resolveUrl(source, opts);

  if (/^git@/i.test(source) || /\.git$/i.test(source)) {
    const repoDir = cloneRepo(source, opts.ref);
    return finishRepo(repoDir, opts.path);
  }

  // owner/repo  or  owner/repo/sub/path  -> GitHub
  if (/^[\w.-]+\/[\w.-]+(\/.+)?$/.test(source)) {
    const [owner, repo, ...rest] = source.split("/");
    const url = `https://github.com/${owner}/${repo.replace(/\.git$/, "")}`;
    const repoDir = cloneRepo(url, opts.ref);
    const sub = opts.path || (rest.length ? rest.join("/") : undefined);
    return finishRepo(repoDir, sub);
  }

  throw new Error(
    `Unrecognized source: "${source}".\n` +
      "  Use a local path, an owner/repo, a git URL, a GitHub tree/blob URL, or a URL to a SKILL.md."
  );
}

function resolveLocal(source, opts) {
  const abs = path.resolve(source);
  const st = fs.statSync(abs);
  if (st.isFile()) {
    if (path.basename(abs).toLowerCase() === "skill.md") {
      return { skillDir: path.dirname(abs), cleanup() {} };
    }
    throw new Error(`Local file must be a SKILL.md (got "${path.basename(abs)}").`);
  }
  const base = opts.path ? path.join(abs, opts.path) : abs;
  if (!fs.existsSync(path.join(base, "SKILL.md"))) {
    throw new Error(
      `No SKILL.md in "${base}". Point at the skill folder or pass --path <subdir>.`
    );
  }
  return { skillDir: base, cleanup() {} };
}

async function resolveUrl(source, opts) {
  const u = new URL(source);
  const host = u.hostname.toLowerCase();

  if (host === "github.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    const [owner, repo, kind, ref, ...subParts] = parts;
    if (owner && repo && (kind === "tree" || kind === "blob")) {
      const url = `https://github.com/${owner}/${repo}`;
      const repoDir = cloneRepo(url, opts.ref || ref);
      let sub = opts.path || subParts.join("/");
      if (kind === "blob" && /skill\.md$/i.test(sub)) sub = path.dirname(sub);
      return finishRepo(repoDir, sub || undefined);
    }
    if (owner && repo) {
      const url = `https://github.com/${owner}/${repo.replace(/\.git$/, "")}`;
      const repoDir = cloneRepo(url, opts.ref);
      return finishRepo(repoDir, opts.path);
    }
  }

  // Direct link to a SKILL.md (e.g. raw.githubusercontent.com/.../SKILL.md).
  if (/skill\.md$/i.test(u.pathname)) return fetchSingle(source);

  // Any other git-cloneable URL.
  if (/\.git$/i.test(u.pathname)) {
    const repoDir = cloneRepo(source, opts.ref);
    return finishRepo(repoDir, opts.path);
  }

  throw new Error(
    `Don't know how to install from ${source}.\n` +
      "  Give a git repo URL, a GitHub tree/blob URL, or a direct URL to a SKILL.md."
  );
}

async function fetchSingle(url) {
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(`Could not fetch ${url}: ${e.message}`);
  }
  if (!res.ok) throw new Error(`Fetch failed (HTTP ${res.status}) for ${url}`);
  const text = await res.text();
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, "SKILL.md"), text);
  return { skillDir: dir, cleanup: () => removeTmp(dir) };
}

// Given a cloned repo dir and an optional subpath, validate the skill folder
// (guarding against path traversal) and hand back a skillDir + cleanup.
function finishRepo(repoDir, subpath) {
  const dir = subpath ? path.join(repoDir, subpath) : repoDir;
  const rel = path.relative(repoDir, path.resolve(dir));
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    removeTmp(repoDir);
    throw new Error(`--path "${subpath}" escapes the repository.`);
  }
  if (!fs.existsSync(path.join(dir, "SKILL.md"))) {
    removeTmp(repoDir);
    throw new Error(
      `No SKILL.md at "${subpath || "<repo root>"}". ` +
        "Pass --path <subdir> to point at the skill folder."
    );
  }
  return { skillDir: dir, cleanup: () => removeTmp(repoDir) };
}

function cloneRepo(url, ref) {
  ensureGit();
  const dir = tmpDir();
  try {
    const args = ["clone", "--depth", "1"];
    if (ref) args.push("--branch", ref);
    args.push(url, dir);
    git(args);
    return dir;
  } catch (shallowErr) {
    // A shallow --branch clone can't target a commit SHA; retry with a full
    // clone + checkout, which handles SHAs and awkward refs.
    if (!ref) {
      removeTmp(dir);
      throw new Error(`git clone failed for ${url}:\n${gitErr(shallowErr)}`);
    }
    removeTmp(dir);
    const dir2 = tmpDir();
    try {
      git(["clone", url, dir2]);
      git(["-C", dir2, "checkout", ref]);
      return dir2;
    } catch (fullErr) {
      removeTmp(dir2);
      throw new Error(`git clone failed for ${url} @ ${ref}:\n${gitErr(fullErr)}`);
    }
  }
}

function git(args) {
  return execFileSync("git", args, { stdio: ["ignore", "pipe", "pipe"] });
}

function gitErr(e) {
  const stderr = e.stderr && e.stderr.toString().trim();
  return "  " + (stderr || e.message);
}

function ensureGit() {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error(
      "git is required to install from a repo but was not found on PATH.\n" +
        "  Install git, or install from a local path or a direct SKILL.md URL instead."
    );
  }
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "skills-cli-"));
}

function removeTmp(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}

# skills

A tiny, zero-dependency CLI for installing [Claude Code](https://claude.com/claude-code)
**skills** from a git repo, a URL, or a local path into `~/.claude/skills` — so you
can load a skill onto Claude.

A skill is just a folder with a `SKILL.md` (YAML frontmatter + instructions). Claude
Code discovers skills in `~/.claude/skills/` and you invoke one with `/<name>` or by
asking Claude to use it. This CLI is the "install" step.

## Install the CLI

Requires **Node 18+** and (for git sources) **git** on your PATH.

```bash
node install.js
```

This copies the CLI to `~/.local/lib/claude-skills-cli` and writes a `skills`
launcher into `~/.local/bin` (which is on PATH). Open a new terminal afterwards so
PATH refreshes, then run `skills --help`. Re-run `node install.js` after editing the
source to update the installed copy.

To uninstall: delete `~/.local/bin/skills`, `~/.local/bin/skills.cmd`, and
`~/.local/lib/claude-skills-cli`.

> `npm link` also works where npm's global bin directory is on PATH, but in some
> setups it isn't — `node install.js` avoids that problem.

Prefer not to install at all? Run it directly: `node bin/skills.js <args>`.

## Usage

```
skills add <source> [options]   Install a skill
skills list                     List installed skills
skills remove <name> [--yes]    Remove an installed skill
skills --help | --version
```

### Sources for `add`

| Source | Example |
| --- | --- |
| Local skill folder | `skills add ./my-skill` |
| Local `SKILL.md` file | `skills add ./my-skill/SKILL.md` |
| GitHub repo (root `SKILL.md`) | `skills add owner/repo` |
| Skill inside a GitHub repo | `skills add anthropics/skills/skills/pdf` |
| GitHub tree/blob URL | `skills add https://github.com/anthropics/skills/tree/main/skills/pdf` |
| Any git URL | `skills add https://github.com/owner/repo.git` |
| Direct `SKILL.md` URL | `skills add https://example.com/foo/SKILL.md` |

### Options for `add`

| Option | Meaning |
| --- | --- |
| `--path <subdir>` | Subfolder inside the repo that holds the skill |
| `--name <name>` | Install under this name (default: the `name` in frontmatter) |
| `--ref <ref>` | Git branch, tag, or commit to install from |
| `--force` | Overwrite a skill that's already installed |
| `--dry-run` | Show what would happen without writing anything |

### Examples

```bash
skills add ./my-skill
skills add anthropics/skills/skills/algorithmic-art
skills add https://github.com/anthropics/skills/tree/main/skills/pdf --name pdf-tools
skills add https://raw.githubusercontent.com/owner/repo/main/skills/foo/SKILL.md
skills list
skills remove pdf-tools --yes
```

After installing a skill, **start a new Claude Code session**, then run `/<name>` or
just ask Claude to use it. (Skills are discovered when a session starts, so an
already-running session won't see a freshly installed skill.)

## How it works

1. The source is resolved to a local folder containing a `SKILL.md`:
   - local paths are used as-is;
   - repos are `git clone --depth 1`'d to a temp dir (with a full-clone fallback when
     `--ref` is a commit SHA);
   - a direct `SKILL.md` URL is fetched into a temp folder.
2. The `name` is read from the frontmatter (or `--name`, or the folder name) and
   validated as a safe single path segment.
3. The folder is copied to `~/.claude/skills/<name>/` (excluding any `.git`), and temp
   files are cleaned up.

Set `CLAUDE_SKILLS_DIR` to install somewhere other than `~/.claude/skills` (handy for
testing).

## Notes & limits

- A single `SKILL.md` URL installs only that file — supporting files (e.g. `scripts/`,
  `references/`) aren't discovered. Use a repo/tree URL or a local folder to get them.
- GitHub tree/blob URLs treat the first path segment after `/tree/` (or `/blob/`) as the
  ref, so refs containing `/` need `--path` and `--ref` given explicitly.
- Installs are user-level (`~/.claude/skills`), available across all projects.

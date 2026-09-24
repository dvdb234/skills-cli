import { parseArgs } from "node:util";
import { add } from "./commands/add.js";
import { list } from "./commands/list.js";
import { remove } from "./commands/remove.js";
import * as log from "./lib/log.js";

const VERSION = "0.1.0";

const HELP = `${log.bold("skills")} — install Claude Code skills into ~/.claude/skills

${log.bold("Usage")}
  skills add <source> [options]   Install a skill from a source
  skills list                     List installed skills
  skills remove <name> [--yes]    Remove an installed skill
  skills --help | --version

${log.bold("Sources for `add`")}
  ./path/to/skill                 A local folder containing SKILL.md
  ./path/to/SKILL.md              A local SKILL.md file
  owner/repo                      A GitHub repo (SKILL.md at the root)
  owner/repo/path/to/skill        A skill inside a GitHub repo
  https://github.com/o/r/tree/main/skills/foo
  https://github.com/o/r.git      Any git URL (also git@host:o/r.git)
  https://.../SKILL.md            A direct link to a SKILL.md

${log.bold("Options for `add`")}
  --path <subdir>   Subfolder inside the repo that holds the skill
  --name <name>     Install under this name (default: frontmatter name)
  --ref <ref>       Git branch, tag, or commit to install from
  --force           Overwrite an already-installed skill
  --dry-run         Show what would happen without installing

${log.bold("Examples")}
  skills add ./my-skill
  skills add anthropics/skills/document-skills/pdf
  skills add https://github.com/acme/skills/tree/main/pirate --name pirate
  skills add https://example.com/skills/foo/SKILL.md
  skills list
  skills remove pirate --yes

After installing, start a new Claude Code session, then run /<name> or just
ask Claude to use the skill.`;

export async function run(argv) {
  const [cmd, ...rest] = argv;
  try {
    switch (cmd) {
      case undefined:
      case "help":
      case "--help":
      case "-h":
        console.log(HELP);
        return;

      case "--version":
      case "-v":
        console.log(VERSION);
        return;

      case "add":
      case "install":
      case "i": {
        const { values, positionals } = parseArgs({
          args: rest,
          allowPositionals: true,
          options: {
            path: { type: "string" },
            name: { type: "string" },
            ref: { type: "string" },
            force: { type: "boolean" },
            "dry-run": { type: "boolean" },
          },
        });
        await add(positionals[0], values);
        return;
      }

      case "list":
      case "ls":
        list();
        return;

      case "remove":
      case "rm":
      case "uninstall": {
        const { values, positionals } = parseArgs({
          args: rest,
          allowPositionals: true,
          options: { yes: { type: "boolean", short: "y" } },
        });
        await remove(positionals[0], values);
        return;
      }

      default:
        log.fail(`Unknown command "${cmd}".`);
        console.log("\n" + HELP);
        process.exitCode = 1;
    }
  } catch (err) {
    log.fail(err && err.message ? err.message : String(err));
    process.exitCode = 1;
  }
}

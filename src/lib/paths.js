import os from "node:os";
import path from "node:path";

// Where user-level skills live. Overridable for tests via CLAUDE_SKILLS_DIR.
export function skillsRoot() {
  if (process.env.CLAUDE_SKILLS_DIR) {
    return path.resolve(process.env.CLAUDE_SKILLS_DIR);
  }
  return path.join(os.homedir(), ".claude", "skills");
}

---
description: Refactor an existing AGENTS.md to follow progressive disclosure principles, extracting detailed rules into separate docs
source: https://www.aihero.dev/a-complete-guide-to-agents-md
---

# Task: Refactor my AGENTS.md

I want you to refactor my AGENTS.md file to follow progressive disclosure
principles. If there is no AGENTS.md file, look for a CLAUDE.md file instead.

Follow these steps:

1. **Find contradictions**: Identify any instructions that conflict with each
   other. For each contradiction, ask me which version I want to keep.

2. **Identify the essentials**: Extract only what belongs in the root AGENTS.md:
   - One-sentence project description
   - Package manager (if not npm)
   - Non-standard build/typecheck commands
   - Anything truly relevant to every single task

3. **Group the rest**: Organize remaining instructions into logical categories
   (e.g., TypeScript conventions, testing patterns, API design, Git workflow).
   For each group, create a separate Markdown file.

4. **Create the file structure**: Output:
   - A minimal root AGENTS.md with Markdown links to the separate files
   - Each separate file with its relevant instructions
   - A suggested docs/agents/ folder structure

5. **Flag for deletion**: Identify any instructions that are:
   - Redundant (the agent already knows this)
   - Too vague to be actionable
   - Overly obvious (like "write clean code")

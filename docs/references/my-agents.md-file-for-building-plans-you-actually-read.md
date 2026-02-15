# My AGENTS.md file for building plans you actually read

Most developers are skeptical about AI code generation at first. It seems
impossible that an AI could understand your codebase the way you do, or match
the instincts you've built up over years of experience.

But there's a technique that changes everything: the planning loop. Instead of
asking AI to write code directly, you work through a structured cycle that
dramatically improves the quality of what you get.

This approach transforms AI from an unreliable code generator into an
indispensable coding partner.

## The Plan Loop: A Four-Step Process

Every piece of code now goes through the same cycle.

![Plan Loop
Diagram](./my-agents.md-file-for-building-plans-you-actually-read/plan-loop-diagram.png)

**Plan** with the AI first. Think through the approach together before writing
any code. Discuss the strategy and get alignment on what you're building.

**Execute** by asking the AI to write the code that matches the plan. You're not
asking it to figure out what to build—you've already done that together.

**Test** the code together. Run unit tests, check type safety, or perform manual
QA. Validate that the implementation matches what you planned.

**Commit** the code and start the cycle again for the next piece.

## Why This Matters

This loop is completely indispensable for getting decent outputs from an AI.

If you drop the planning step altogether, you're really hampering yourself.
You're asking the AI to guess what you want, and you'll end up fighting with
hallucinations and misunderstandings.

Planning forces clarity. It makes the AI's job easier and your code better.

## Rules for Creating Great Plans

Here are the key rules from my `CLAUDE.md` file that make plan mode effective:

```md
## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
```

These simple guidelines transform verbose plans into scannable, actionable
documents that keep both you and the AI aligned.

Copy them into your `CLAUDE.md` or `AGENTS.md` file, and enjoy simpler, more
readable plans.

Or, run this script to append them to your `~/.claude/CLAUDE.md` file:

```bash
mkdir -p ~/.claude && cat >> ~/.claude/CLAUDE.md << 'EOF'

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
EOF
```

---
description: Analyze the codebase and generate a minimal, hierarchical AGENTS.md structure with progressive disclosure
sources:
  - https://github.com/RayFernando1337/llm-cursor-rules/blob/main/generate-agents.md
  - https://www.aihero.dev/a-complete-guide-to-agents-md
---

# Task: Analyze this codebase and generate a hierarchical AGENTS.md structure

## Important Caveats

Auto-generated AGENTS.md files tend to be too comprehensive. Use this as a
**starting point only** - then aggressively trim. Target: smallest possible file
that provides value. Most instructions should move to progressive disclosure
(docs/agents/*.md files).

Remember:

- Stale docs actively poison agent context
- File paths go stale quickly - describe capabilities instead
- Each instruction must earn its token cost
- LLMs have ~150-200 instruction limit before degradation

---

## Paths vs Hints

**Bad (goes stale):**

- `Auth logic: src/auth/provider.tsx`
- `API routes: apps/api/src/routes/**`

**Good (survives refactors):**

- `Auth: Uses React Context pattern, look for *Provider or *Context`
- `API routes: Next.js app router convention, check for route.ts files`
- `Models: Prisma schema defines domain entities`

### Anti-Pattern: Static File References

Never document:

- `User model is in src/models/user.ts`
- `Auth handler lives at lib/auth/handlers.ts`

Instead document:

- `User model: Prisma schema, look for "model User"`
- `Auth: middleware pattern, grep for "authenticate" or "withAuth"`

---

## Document Domain Concepts

**Stable (document these):**

- "Organization" vs "Workspace" vs "Team" terminology
- Core domain entities and their relationships
- Business rules that aren't obvious from code

**Unstable (avoid documenting):**

- Specific file paths
- Directory structure
- Import paths

---

## Context & Principles

You are going to help me create a **hierarchical AGENTS.md system** for this
codebase. This is critical for AI coding agents to work efficiently with minimal
token usage.

### Core Principles

1. **Minimal root AGENTS.md** - Only universal guidance, links to sub-files
2. **Nearest-wins hierarchy** - Agents read closest AGENTS.md to edited file
3. **Pattern hints over paths** - Describe grep-able patterns, not file
   locations
4. **Token efficiency** - Small, actionable guidance over encyclopedic docs
5. **Progressive disclosure** - Link to docs/agents/*.md for detailed rules
6. **Domain concepts** - Document terminology and business rules, not structure

---

## Your Process

### Phase 1: Repository Analysis

First, analyze the codebase and provide me with:

1. **Repository type**: Monorepo, multi-package, or simple single project?
2. **Primary technology stack**: Languages, frameworks, key tools
3. **Major packages** that warrant their own AGENTS.md:
   - Only for areas with significantly different tech/patterns
   - Skip if root guidance suffices
   - Prefer fewer, more focused files over many small ones
4. **Build system**: pnpm/npm/yarn workspaces? Turborepo? Or simple?
5. **Testing conventions**: Framework and colocated vs separate?
6. **Key patterns to document** (as grep-able hints):
   - What conventions are used (not where files are)
   - Domain terminology agents should understand
   - Anti-patterns to avoid

Present this as a **structured map** before generating any AGENTS.md files.

---

### Phase 2: Generate Root AGENTS.md

Create a **minimal root AGENTS.md** (~50-100 lines max, ideally under 50).

Per the guide, root AGENTS.md needs only:

1. One-sentence project description
2. Package manager (if not npm)
3. Build/typecheck commands (if non-standard)

#### Required Sections

**1. Project Overview** (3-5 lines)

- One-sentence description of what this project does
- Package manager and key build commands (only if non-standard)

**2. Navigation** (5-10 lines)

Link to sub-AGENTS.md files and describe how to find things:

```
## Navigation

### Sub-package Docs
Each major package has its own AGENTS.md. Look for them in package roots.

### Finding Things
- Components: exported from *.tsx, usually named after component
- API routes: follow framework conventions (route.ts, [...slug], etc.)
- Config: root-level *.config.* files
- Tests: colocated *.test.* or in __tests__ directories
```

**3. Progressive Disclosure** (2-5 lines)

Link to detailed docs instead of inlining them:

```
## Detailed Docs
- TypeScript conventions: see docs/agents/TYPESCRIPT.md
- Testing patterns: see docs/agents/TESTING.md
```

#### Optional Sections (include only if truly needed)

**Conventions** - Only if non-obvious (commit format, unusual style rules)

**Security** - Only if project has specific secret handling beyond standard
`.env` patterns

---

### Phase 3: Generate Sub-Folder AGENTS.md Files

Only create for directories with significantly different tech/patterns. Each
file should be ~30-50 lines max.

#### Required Sections (3-4 essentials)

**1. Package Identity** (1-2 lines)

- What this package/app/service does
- Primary tech if different from root

**2. Setup & Run** (only if different from root)

- Dev, build, test commands for this package

**3. Patterns & Conventions** (5-15 lines)

Describe patterns agents can grep for, not paths they should navigate to:

```
## Patterns

- Auth: Context provider pattern → grep for createContext, Provider
- API calls: Centralized client → grep for fetchClient, apiClient
- Validation: Zod schemas → grep for z.object, .parse
- State: React Query → grep for useQuery, useMutation

### Do/Don't
- DO: Use functional components with hooks
- DON'T: Use class components (legacy only)
```

**4. Pre-PR Check** (1-2 lines)

Single copy-paste command:

```
pnpm --filter @repo/web typecheck && pnpm --filter @repo/web test
```

#### Optional Sections (include only if critical)

- **Gotchas**: Only truly non-obvious issues (1-3 lines max)
- **Quick Find**: Package-specific search commands

---

### Phase 4: Special Considerations

Add these ONLY if the package has them and they're non-obvious:

**Design System** (if exists)

```
## Design System
- Use design tokens (never hardcode colors)
- Component patterns: functional, composable, typed props
```

**Database** (if exists)

```
## Database
- ORM: [name], migrations via `pnpm db:migrate`
- Never run migrations in tests
```

**API** (if exists)

```
## API Patterns
- Validation: Zod schemas
- Errors: Throw typed ApiError
```

---

## Output Format

Provide files in this order:

1. **Analysis Summary** (from Phase 1)
2. **Root AGENTS.md** (complete, ready to copy)
3. **Each Sub-Folder AGENTS.md** (with file path)

Use this format:

```
---
File: `AGENTS.md` (root)
---
[content]

---
File: `apps/web/AGENTS.md`
---
[content]
```

---

## Maintenance Warning

AGENTS.md files go stale. Review quarterly:

- Remove any file paths that crept in
- Verify pattern hints still match codebase conventions
- Update commands that changed
- Delete rules the agent already knows
- Question if each instruction earns its token cost

---

## Quality Checks

Before generating, verify:

- [ ] Root AGENTS.md under 50 lines? (100 max)
- [ ] Sub-folder files under 50 lines each?
- [ ] **No static file paths in documentation?**
- [ ] **Patterns described as grep-able hints?**
- [ ] **Domain concepts over implementation details?**
- [ ] Progressive disclosure used for detailed rules?
- [ ] Does each instruction earn its token cost?
- [ ] Would this survive a major refactor?
- [ ] Commands are copy-paste ready?
- [ ] No duplication between root and sub-files?
- [ ] Not every directory gets its own file?

# Writing Good Evals

Evals are the acceptance contract for a feature. Everything downstream — spec,
implementation, verification — is measured against them. Invest the time to make
them concrete and verifiable.

## Principles

### Be Specific, Not Vague

Bad: "The UI should be fast" Good: "Page load completes in under 2 seconds on a
3G connection with 100 items"

Bad: "Handle errors gracefully" Good: "When the API returns 429, show a retry
countdown and auto-retry after the Retry-After header value"

### Test Inputs and Outputs, Not Implementation

Bad: "Use a hash map for lookups" Good: "Lookups by ID return results in O(1)
time regardless of collection size"

The eval describes WHAT must be true, not HOW to achieve it. Implementation
details belong in the spec.

### Cover the Unhappy Paths

Most bugs live in edge cases. For every happy path criterion, ask:

- What if the input is empty? Null? Extremely large?
- What if the network is slow, down, or returns garbage?
- What if two users do this simultaneously?
- What if the user navigates away mid-operation?
- What if disk is full, permissions are wrong, or the DB is down?

### Make Criteria Independently Verifiable

Each criterion should be testable on its own. Avoid criteria that depend on
other criteria being checked first.

Bad: "After completing the above steps, the dashboard updates" Good: "When a new
item is saved, the dashboard item count increments within 5 seconds without a
page refresh"

### Specify Error Messages and States

Don't just say "show an error." Specify:

- What the user sees (message text, UI state)
- What gets logged (error level, context fields)
- What the system state is after the error (rolled back? partial? retry-able?)

## Structure

### Problem Section

One paragraph. Who has the problem, what is it, why does it matter. This is
context for the agent, not a criterion to verify.

### Acceptance Criteria

Checkboxes. Each one is a hard gate. Write them as "Given X, when Y, then Z"
where possible. These become the verification checklist.

### Test Cases

Concrete scenarios with specific inputs and expected outputs. Organize into:

- **Happy Path** — The normal, expected usage flow
- **Edge Cases** — Unusual but valid inputs (empty strings, boundary values,
  unicode, very large data)
- **Error Cases** — Invalid inputs, system failures, permission issues

### Constraints

Technical or design requirements the implementation must respect:

- Performance budgets (response times, memory limits)
- Compatibility requirements (browsers, OS versions, API versions)
- Security requirements (authentication, authorization, input validation)
- Accessibility requirements (WCAG levels, screen reader support)

### Out of Scope

Explicitly list what this feature does NOT do. This prevents the agent from
over-building. Be specific: "Does NOT support bulk import" is better than "Keep
it simple."

## Anti-Patterns

### The Wish List

A long list of vague desires with no verifiable criteria. "It should be nice to
use" tells the agent nothing actionable.

### The Implementation Spec

Evals that dictate HOW to build rather than WHAT to verify. "Use React Query for
data fetching" belongs in the spec, not the evals. The eval equivalent: "Data
fetching supports caching, background refetching, and optimistic updates."

### The Copy-Paste Template

Filling in template sections mechanically without thinking about the specific
feature. Every feature has unique failure modes — find them.

### The Perfectionist Trap

Trying to anticipate every possible scenario before starting. Evals should cover
realistic production scenarios, not every conceivable edge case. You can always
add more criteria by reverting to Draft status.

## Iterating on Evals

During the Draft phase, evals are freely editable. Use this time to:

1. Start with the obvious happy path criteria
2. Run the eval-brainstormer agent for adversarial suggestions
3. Cherry-pick the suggestions that represent real production risks
4. Have the agent help flesh out test cases with concrete values
5. Review with stakeholders if applicable

When the evals feel solid — when you could hand them to a QA engineer and they'd
know exactly what to test — freeze them with `/edd-spec`.

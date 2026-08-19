# Plans

A plan explains how work will proceed. It is not a specification of the system
and not a diary of the planner's investigation.

## Establish the planning contract

- State the intended outcome and the scope the plan commits to.
- Name material assumptions, constraints, and non-goals. Omit obvious non-goals
  that do not protect the scope from a likely misunderstanding.
- Reuse settled user decisions and current project evidence. Do not reopen them
  without new conflicting information.
- If a decision still blocks execution, expose it as an unresolved question
  rather than hiding a guess inside a step.

## Make the work executable

- Order steps by dependency and decision flow, not by the order in which the
  planner discovered the work.
- Make each step describe a concrete outcome, change, or verification. Avoid
  vague steps such as "handle errors" or "finish the implementation."
- Keep related implementation and validation close enough that the evidence can
  shape the work while it is in progress.
- Identify genuinely parallel work when that affects sequencing or ownership. Do
  not add concurrency merely to make the plan look sophisticated.
- Name important boundaries, migrations, compatibility concerns, or cleanup work
  where they affect implementation order.

## Plan confidence, not ceremony

- Include a testing or verification strategy tied to the change's concrete
  failure modes and risks.
- Distinguish automated tests, static checks, manual validation, runtime
  evidence, and review. Do not list checks that provide duplicate confidence.
- State what success looks like for material behavior. Where useful, connect a
  risk or requirement to the evidence that will validate it.
- Include rollback, recovery, or staged rollout work only when the change's
  operational risk justifies it.

## Present decisions clearly

- Recommend a default when the options are not equally useful. Give the reason
  and the most important tradeoff.
- Include alternatives only when the reader must choose, the rejected option
  explains a consequential constraint, or future maintainers need the rationale.
- Separate settled decisions, assumptions, risks, and unresolved questions so
  the reader can tell which parts are ready for execution.
- Use numbered steps only when order matters. Use parallel action phrases for
  compact steps, but use complete sentences when rationale, conditions, or risks
  need context.

Before finishing, verify that another capable implementer could execute the plan
without reconstructing hidden decisions, and that the plan does not prescribe
implementation details that belong in a specification or in the code itself.

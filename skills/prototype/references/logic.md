# Logic and State Prototype

Create one self-contained HTML, CSS, and JavaScript file that opens directly in
a browser. Keep the state logic separate from DOM rendering so the experiment
tests a coherent model rather than button-handler accidents.

The page contains:

1. the explicit question and assumptions
2. readable current state in domain language, updated after every action
3. free-play controls for every relevant action
4. deterministic guided walkthroughs for the happy path, the awkward edge case,
   and an invalid or disallowed transition
5. a reset to a known initial state for every walkthrough

Use the smallest suitable shape: pure reducer, explicit state machine, pure
transformations, or a state-owning object when ongoing identity is itself part
of the question. Keep DOM, network, and storage concerns out of that logic.

Avoid frameworks, bundlers, persistence, generalized abstractions, and tests.
The browser walkthrough is the proof. Render enough history or transition
context that the user can see not only the final state but how it changed.

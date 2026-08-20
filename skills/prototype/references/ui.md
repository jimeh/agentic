# UI Direction Prototype

Use `frontend-design` for visual direction. Default to three variants and cap at
five. They must differ in layout, information hierarchy, and primary affordance,
not only color, spacing, or copy.

Prefer mounting variants in the real nearby page when repository edits were
explicitly authorized: keep existing routing, data loading, auth, density, and
surrounding chrome, then switch only the rendered prototype subtree. Otherwise
build an isolated temporary page that faithfully recreates the relevant context.

Expose variants through a stable `?variant=` URL parameter and a clearly
prototype-only switcher. The switcher shows the current variant, supports
previous and next controls, persists through reload, and does not intercept
arrow keys while an input, textarea, select, or editable element is focused.
Prevent any repository-local switcher from appearing in production builds.

Keep mutations stubbed or confined to in-memory state. Exercise each variant at
its direct URL in the browser, at representative viewport sizes and the relevant
light or dark modes. Check obvious accessibility failures that would invalidate
the comparison, but do not polish the prototype into production code.

Hand over the variant URLs and a short statement of the tradeoff each explores.
When one wins, the user may combine ideas across variants; treat that as a new
production design, not permission to merge prototype code unchanged.

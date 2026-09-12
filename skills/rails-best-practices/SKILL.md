---
name: rails-best-practices
description: >-
  Create or change Rails migrations using generators and applied-migration
  safety rules. Use for migration work, not unrelated Rails edits.
---

# Rails Best Practices

## Migrations

Create database migrations with the generator rather than by hand:

```bash
rails g migration AddFooToBars foo:string
```

Rails orders migrations by the UTC timestamp prefix in the filename and records
that version in `schema_migrations`. A hand-written file needs a well-formed
prefix that sorts after everything already applied; the generator derives one
from the current time, so it is right by construction.

Edit a migration freely while it is still local and unapplied. Once it has run
anywhere shared, add a new migration instead — editing an applied file leaves
already-migrated databases out of step with it, and changing its timestamp
prefix makes Rails treat it as a migration that has never run.

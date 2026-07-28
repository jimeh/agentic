---
name: rails-best-practices
description: >-
  Conventions for working in a Ruby on Rails application — ActiveRecord
  migrations and the generators that produce them. Use whenever the project is
  a Rails app.
---

# Rails Best Practices

## Migrations

Create database migrations with the generator rather than by hand:

```bash
rails g migration AddFooToBars foo:string
```

The generator stamps the filename with a UTC timestamp prefix, which is what
Rails orders migrations by and records in `schema_migrations`. Hand-written
files routinely sort into the wrong order, and the resulting `schema.rb`
conflicts are worse to untangle than the file was to generate.

Edit a migration freely while it is still local and unapplied. Once it has been
run anywhere shared, write a new migration instead — changing an applied file
leaves already-migrated databases out of step with it, and renaming one makes
Rails treat it as never having run.

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

The generator stamps the filename with an accurate, unique UTC timestamp.
Hand-written migration files routinely collide with a teammate's or sort into
the wrong order, and the resulting `schema.rb` conflicts are worse to untangle
than the file was to generate.

Edit the generated file freely afterwards; it is the timestamp that has to come
from the generator.

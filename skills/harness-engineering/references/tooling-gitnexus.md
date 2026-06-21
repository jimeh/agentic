# GitNexus Tooling

Use this only when the user asks to add GitNexus. Set mise's npm package manager
to `bun`; `aube` and `pnpm` do not currently work correctly for this tool.

## GitNexus via mise

```toml
[tools]
node = "latest"
bun = "latest"

[settings.npm]
package_manager = "bun"

[tools."npm:gitnexus"]
version = "latest"
bun_args = "--trust"
```

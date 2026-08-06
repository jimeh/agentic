# RTK - Rust Token Killer (Claude Code)

**Usage**: Token-optimized CLI proxy for shell commands.

## Rule

Use RTK only for leaf commands that do not read from stdin and whose output is
intended for direct inspection. Prefix eligible commands with `rtk`:

```bash
rtk git status
rtk cargo test
rtk npm run build
rtk pytest -q
```

Run commands without RTK when they participate in shell data flow or may read
from stdin. This includes pipelines, heredocs, input or output redirection,
command or process substitution, stdin markers such as `-` or `/dev/stdin`, and
interactive input. If uncertain, run the command without RTK.

## Meta Commands

```bash
rtk gain            # Token savings analytics
rtk gain --history  # Recent command savings history
rtk discover        # Analyze Claude Code history for missed opportunities
```

## Verification

```bash
rtk --version
rtk gain
which rtk
```

If `rtk gain` fails, verify that the installed binary is rtk-ai/rtk rather than
reachingforthejack/rtk (Rust Type Kit).

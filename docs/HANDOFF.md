# Handoff — continuing this project in another agent

This project is built with Entire enabled, which means **every commit carries the agent
session that produced it**. Picking up in a different agent does not start from zero.

## Continue in Codex

Codex is already installed and its Entire hooks are already added to this repo.

```bash
cd <this repo>
codex
```

If Codex asks how to authenticate, use your OpenAI API key — the same credits this
project already uses:

```bash
export OPENAI_API_KEY="<your key>"
```

**One-time:** `entire status` reports pending Codex hooks. Approve them inside Codex
(`/hooks`) so it also records checkpoints. Without this, Codex works fine but its
sessions are not captured.

## First prompt to give the new agent

> Read `docs/DESIGN.md` and `README.md` for what this project is.
> Then run `entire checkpoint list` and `entire checkpoint explain <most recent id> --full`
> to see the reasoning behind the latest work. Then tell me where things stand.

That is the whole handoff. The design doc carries intent, the README carries the
architecture, and Entire carries the reasoning behind every change.

## Useful Entire commands

| Command | What it gives you |
|---|---|
| `entire checkpoint list` | Every checkpoint on this branch, newest first |
| `entire checkpoint explain <id>` | Why a change was made |
| `entire checkpoint explain <id> --full` | The complete session transcript behind it |
| `entire search "<topic>"` | Semantic search across checkpoints, commits and sessions |
| `entire session list` | All agent sessions across worktrees |
| `entire recap --since 1d` | Summary of recent activity |

## State of play

Run this to see exactly where the last session stopped:

```bash
entire recap --since 1d
```

## What must not be lost

- `.env.local` is **not** in the repo. Recreate it from `.env.example` with a Cala key
  (`console.cala.ai`) and an OpenAI key (`platform.openai.com`).
- `.cache/` holds pre-warmed demo answers and is not in the repo either. Regenerate with
  `bash scripts/warm.sh` while the dev server is running.

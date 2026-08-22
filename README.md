# elastic-tui

A demo-scoped TUI prototype built as an **Elastic CLI extension** (`elastic tui`).
No fork of `elastic/cli` — this is a standalone executable the CLI spawns as a
subprocess, receiving the active context via environment variables.

Built with [Ink](https://github.com/vadimdemedes/ink) (React for the terminal)
and [@inkjs/ui](https://github.com/vadimdemedes/ink-ui). TypeScript runs directly
via [tsx](https://github.com/privatenumber/tsx) — no build step.

## Prerequisites

- Node.js >= 18
- [`@elastic/cli`](https://github.com/elastic/cli) installed globally (`npm i -g @elastic/cli`)
- An active Elastic context (`elastic config context add …`)

## Run locally (no CLI)

```bash
npm install
npm run dev
```

`npm run dev` renders the TUI directly. It reads `ELASTIC_ES_URL` /
`ELASTIC_ES_API_KEY` from the environment, so export those first or run it
through the CLI (below).

## Register as an `elastic` extension

Register this directory as a local extension. The command becomes `elastic tui`:

```bash
elastic extension create tui --path .
elastic tui
```

The CLI passes the active context to the extension as env vars
(`ELASTIC_ES_URL`, `ELASTIC_ES_API_KEY`, `ELASTIC_KIBANA_URL`,
`ELASTIC_KIBANA_API_KEY`, `ELASTIC_CLOUD_URL`, `ELASTIC_CLOUD_API_KEY`).
Use a specific context for one session with:

```bash
elastic --use-context my-context tui
```

## Install from GitHub (enterprise-hosted)

```bash
elastic extension install github:<enterprise-org>/elastic-tui
elastic extension upgrade tui   # pull latest after each push
```

## Flows

- **Home menu** — Select-based entry point that routes to each flow.
- **Browse indices → search** — lists indices, drill into one, run a
  `match_all` search, see results in a table.
- **Show connection context** — displays the resolved active context (keys masked).

## Known TTY caveat

An interactive Ink TUI needs a real TTY with raw-mode stdin. If the CLI captures
the subprocess's stdout instead of handing the TTY through, `src/index.tsx`
degrades to printing the context as JSON rather than crashing — which is also
the quickest way to confirm whether the CLI passes the TTY through to
extensions. If it doesn't, the fallback is a thin launcher that re-execs with
inherited stdio.

## Project layout

```
bin/elastic-tui.mjs   # entrypoint shim (registers tsx, imports src/index.tsx)
src/index.tsx         # reads context, renders App (or JSON fallback if no TTY)
src/context.ts        # reads the active context from env vars
src/esClient.ts       # official @elastic/elasticsearch client from context
src/App.tsx           # home menu + screen routing
src/flows/            # individual flows
```

# Elastic CLI TUI Prototype — Plan

## What
A **demo-scoped** TUI prototype built as an `elastic/cli` **extension** (`elastic tui`), not a fork. No changes to `elastic/cli` source required. Goal is to show several flows and a command menu — not production packaging.

## Why this shape
- Extensions are standalone executables spawned as subprocesses — the CLI's only job is passing connection context via env vars (`ELASTIC_ES_URL`, `ELASTIC_ES_API_KEY`, `ELASTIC_KIBANA_URL`, `ELASTIC_KIBANA_API_KEY`, `ELASTIC_CLOUD_URL`, `ELASTIC_CLOUD_API_KEY`).
- Zero coupling to CLI internals, zero fork-maintenance burden, fully reversible.
- Known gap: extensions don't inherit multi-context switching (`--use-context`, keychain resolvers) — only the currently-active context's resolved values. Workable via `elastic --use-context X tui` per session; revisit if it becomes a real friction point.

## Steps

1. **Scaffold locally**
   `elastic extension create tui` → generates `~/.elastic/extensions/elastic-tui/` with a runnable `index.js` stub, auto-registered as `elastic tui`.

2. **Move to enterprise account**
   - Init git in the scaffolded directory (or scaffold straight into a repo you've already created under the enterprise account/org).
   - Push to `<enterprise-org>/elastic-tui` on GitHub.
   - Confirm `package.json` has a valid `bin` entry pointing at your entrypoint (this is what the CLI reads on install/discovery).

3. **Build the prototype**
   - Read the env vars on startup; whatever context is active at demo time is fine — no multi-context switching needed.
   - Use `@elastic/elasticsearch` (official JS client) for API calls — not CLI internals.
   - Use Ink (React-based TUI) for rendering; InkUI (`npx inkui add`) for Select/Table/Spinner components rather than hand-rolling them.
   - **Menu screen**: a top-level command menu (Select list) as the entry point — lists available flows/commands, routes to each on selection. This becomes the "home" screen of the demo.
   - **Flows** (pick 2-3, not a scattered feature list): candidate arc is browse indices → drill into one → run a search → see results in a table. Given the DevEx pitch, the crawler-extraction-failure flow is probably the strongest one to prioritize.
   - Skip: error-handling rigor, auth edge cases, config-context switching, versioning/upgrade polish.

4. **Install/test the enterprise-hosted version**
   `elastic extension install github:<enterprise-org>/elastic-tui`
   (or `npm:` if you publish it to a private/enterprise npm registry instead).

5. **Iterate**
   `elastic extension upgrade tui` pulls latest after each push — no reinstall ceremony.

## Open questions for you
- Enterprise GitHub org name / repo visibility (private repo, presumably)?
- Any org policy on installing CLI extensions from arbitrary repos, or does this need to go through an internal registry?

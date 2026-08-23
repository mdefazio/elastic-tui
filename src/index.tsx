import React from "react";
import { render } from "ink";
import { readContext } from "./context.js";
import { App } from "./App.js";

const ctx = readContext();

// The extension is spawned as a subprocess by the Elastic CLI. An interactive
// Ink TUI needs a real TTY with raw-mode stdin. If we don't have one (e.g. the
// parent captured stdout, or output is piped), degrade gracefully to JSON
// instead of crashing. This fallback also doubles as the quickest way to
// confirm whether the CLI hands the TTY through to extensions.
const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

if (!interactive) {
  process.stdout.write(
    JSON.stringify(
      {
        message:
          "elastic-tui: no interactive TTY detected — printing context instead.",
        context: ctx,
      },
      null,
      2
    ) + "\n"
  );
  process.exit(0);
}

render(<App ctx={ctx} />);

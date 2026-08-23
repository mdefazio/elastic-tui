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

// A flow can "emit" a command on exit — we print it to the terminal after the
// TUI tears down, so it lands in your scrollback ready to copy, edit, or run.
let emitted: string | null = null;
const app = render(<App ctx={ctx} onEmit={(cmd) => (emitted = cmd)} />);
await app.waitUntilExit();
if (emitted) process.stdout.write(`\n${emitted}\n`);

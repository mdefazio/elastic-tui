// Catalog of the Elastic CLI's top-level commands (plus a few common
// subcommands), used to drive the fuzzy command palette. `action` decides what
// the TUI does on select: routes to a built flow, or shows an info screen with
// the equivalent CLI invocation for anything the prototype doesn't wire up.

export type CommandAction = "browse" | "context" | "status" | "info";

export interface Command {
  path: string; // e.g. "es", "es search", "cloud serverless"
  aliases?: string[]; // e.g. ["elasticsearch"]
  desc: string;
  group: "common" | "more";
  action: CommandAction;
  subcommands?: string[];
}

export const COMMANDS: Command[] = [
  // Common
  {
    path: "es",
    aliases: ["elasticsearch"],
    desc: "Elasticsearch APIs (search, indices, ingest, …)",
    group: "common",
    action: "browse",
    subcommands: ["search", "indices", "cat", "cluster", "inference", "esql"],
  },
  {
    path: "es search",
    desc: "Run a search against an index",
    group: "common",
    action: "browse",
  },
  {
    path: "kb",
    aliases: ["kibana"],
    desc: "Kibana APIs (data views, cases, alerting)",
    group: "common",
    action: "info",
    subcommands: ["data-views", "cases", "alerting"],
  },
  {
    path: "cloud",
    desc: "Manage Elastic Cloud: hosted deployments & serverless projects",
    group: "common",
    action: "info",
    subcommands: ["serverless", "hosted", "orgs", "billing", "auth"],
  },
  {
    path: "cloud serverless",
    desc: "Serverless projects (create, list, reset-credentials)",
    group: "common",
    action: "info",
  },
  {
    path: "docs",
    desc: "Search, read, and ask questions about Elastic documentation",
    group: "common",
    action: "info",
  },
  {
    path: "config",
    desc: "Author and maintain the elastic config file",
    group: "common",
    action: "context",
    subcommands: ["context", "current-context"],
  },
  {
    path: "status",
    desc: "Verify connectivity and authentication for the active context",
    group: "common",
    action: "status",
  },
  // More
  {
    path: "stack",
    desc: "Interact with Elastic Stack components (Elasticsearch, Kibana, Fleet)",
    group: "more",
    action: "info",
  },
  {
    path: "sanitize",
    desc: "Sanitize values for safe use in Elasticsearch",
    group: "more",
    action: "info",
  },
  {
    path: "cli-schema",
    desc: "Emit the CLI structure as argh-schema JSON",
    group: "more",
    action: "info",
  },
  {
    path: "completion",
    desc: "Print a shell completion script (bash, zsh, fish)",
    group: "more",
    action: "info",
  },
  {
    path: "extension",
    desc: "Manage elastic CLI extensions",
    group: "more",
    action: "info",
  },
  {
    path: "version",
    desc: "Print the elastic CLI version",
    group: "more",
    action: "info",
  },
  {
    path: "help",
    desc: "Display help for a command",
    group: "more",
    action: "info",
  },
];

function isSubsequence(q: string, target: string): boolean {
  let i = 0;
  for (const ch of target) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return q.length === 0;
}

// Rank a command against the query. Lower is better; -1 means no match.
function score(cmd: Command, q: string): number {
  const path = cmd.path.toLowerCase();
  const names = [path, ...(cmd.aliases ?? []).map((a) => a.toLowerCase())];
  const groupBias = cmd.group === "common" ? 0 : 100;

  if (!q) return groupBias; // no query: preserve catalog order, common first

  for (const name of names) {
    if (name.startsWith(q)) return groupBias + 0;
  }
  for (const name of names) {
    if (name.includes(q)) return groupBias + 10;
  }
  for (const name of names) {
    if (isSubsequence(q, name)) return groupBias + 20;
  }
  if (cmd.desc.toLowerCase().includes(q)) return groupBias + 30;
  return -1;
}

export function filterCommands(query: string): Command[] {
  const q = query.trim().toLowerCase();
  return COMMANDS.map((cmd, i) => ({ cmd, i, s: score(cmd, q) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.cmd);
}

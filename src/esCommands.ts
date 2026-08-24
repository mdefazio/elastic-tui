import { readFileSync } from "node:fs";

// Catalog of `elastic es` commands, from `elastic es --help` (@elastic/cli
// v0.4.0). Flags and subcommands per command come from `elastic cli-schema`
// (baked into esFlags.json) so the detail pane can show real options.

export interface EsFlag {
  name: string;
  type: string;
  required: boolean;
  summary: string;
}

export interface EsSub {
  name: string;
  summary: string;
}

const schema = JSON.parse(
  readFileSync(new URL("./esFlags.json", import.meta.url), "utf8")
) as { flags: Record<string, EsFlag[]>; subs: Record<string, EsSub[]> };

export function getFlags(name: string): EsFlag[] {
  const flags = schema.flags[name] ?? [];
  // Required first, then alphabetical.
  return [...flags].sort(
    (a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name)
  );
}

export function getSubcommands(name: string): EsSub[] {
  return schema.subs[name] ?? [];
}

// Build a copy-pasteable invocation: base command plus any required flags.
export function invocation(name: string): string {
  const required = getFlags(name).filter((f) => f.required);
  const args = required.map((f) => ` --${f.name} <${f.type}>`).join("");
  return `elastic es ${name}${args}`;
}

export interface EsCommand {
  name: string;
  desc: string;
  category: string;
  kind: "namespace" | "command";
  common?: boolean;
}

const NAMESPACES: Array<[string, string]> = [
  ["async-search", "async-search API commands"],
  ["cat", "cat API commands"],
  ["ccr", "ccr API commands"],
  ["cluster", "cluster API commands"],
  ["connector", "connector API commands"],
  ["dangling-indices", "dangling-indices API commands"],
  ["encryption", "encryption API commands"],
  ["enrich", "enrich API commands"],
  ["eql", "eql API commands"],
  ["esql", "esql API commands"],
  ["features", "features API commands"],
  ["fleet", "fleet API commands"],
  ["graph", "graph API commands"],
  ["ilm", "ilm API commands"],
  ["indices", "indices API commands"],
  ["inference", "inference API commands"],
  ["ingest", "ingest API commands"],
  ["license", "license API commands"],
  ["logstash", "logstash API commands"],
  ["migration", "migration API commands"],
  ["ml", "ml API commands"],
  ["nodes", "nodes API commands"],
  ["project", "project API commands"],
  ["query-rules", "query-rules API commands"],
  ["rollup", "rollup API commands"],
  ["search-application", "search-application API commands"],
  ["searchable-snapshots", "searchable-snapshots API commands"],
  ["security", "security API commands"],
  ["simulate", "simulate API commands"],
  ["slm", "slm API commands"],
  ["snapshot", "snapshot API commands"],
  ["sql", "sql API commands"],
  ["ssl", "ssl API commands"],
  ["streams", "streams API commands"],
  ["synonyms", "synonyms API commands"],
  ["tasks", "tasks API commands"],
  ["text-structure", "text-structure API commands"],
  ["transform", "transform API commands"],
  ["watcher", "watcher API commands"],
  ["xpack", "xpack API commands"],
];

const GROUPS: Array<[string, Array<[string, string]>]> = [
  [
    "Search",
    [
      ["search", "Run a search."],
      ["search-template", "Run a search with a search template."],
      ["render-search-template", "Render a search template."],
      ["msearch", "Run multiple searches."],
      ["msearch-template", "Run multiple templated searches."],
      ["open-point-in-time", "Open a point in time."],
      ["close-point-in-time", "Close a point in time."],
      ["scroll", "Run a scrolling search."],
      ["clear-scroll", "Clear a scrolling search."],
      ["search-mvt", "Search a vector tile."],
      ["search-shards", "Get the search shards."],
    ],
  ],
  [
    "Documents",
    [
      ["bulk", "Bulk index or delete documents."],
      ["create", "Create a new document in the index."],
      ["delete", "Delete a document."],
      ["delete-by-query", "Delete documents."],
      ["exists", "Check a document."],
      ["exists-source", "Check for a document source."],
      ["get", "Get a document by its ID."],
      ["get-source", "Get a document's source."],
      ["index", "Create or update a document in an index."],
      ["mget", "Get multiple documents."],
      ["reindex", "Reindex documents."],
      ["update", "Update a document."],
      ["update-by-query", "Update documents."],
    ],
  ],
  [
    "Analysis",
    [
      ["count", "Count search results."],
      ["explain", "Explain a document match result."],
      ["field-caps", "Get the field capabilities."],
      ["mtermvectors", "Get multiple term vectors."],
      ["rank-eval", "Evaluate ranked search results."],
      ["terms-enum", "Get terms in an index."],
      ["termvectors", "Get term vector information."],
    ],
  ],
  [
    "Scripts",
    [
      ["delete-script", "Delete a script or search template."],
      ["get-script", "Get a script or search template."],
      ["get-script-context", "Get script contexts."],
      ["get-script-languages", "Get script languages."],
      ["put-script", "Create or update a script or search template."],
      ["scripts-painless-execute", "Run a script."],
    ],
  ],
  [
    "Cluster",
    [
      ["health-report", "Get the cluster health."],
      ["info", "Get cluster info."],
      ["ping", "Ping the cluster."],
    ],
  ],
  [
    "Advanced",
    [
      ["delete-by-query-rethrottle", "Throttle a delete by query operation."],
      ["reindex-rethrottle", "Throttle a reindex operation."],
      ["update-by-query-rethrottle", "Throttle an update by query operation."],
    ],
  ],
  [
    "Other",
    [
      ["cancel-reindex", "Cancel an ongoing reindex task."],
      ["get-reindex", "Get the status and progress of a specific reindex task."],
      ["list-reindex", "Get information about all currently running reindex tasks."],
    ],
  ],
  [
    "Helpers",
    [["helpers", "High-level helper commands for common Elasticsearch workflows"]],
  ],
];

const COMMON = new Set(["search", "indices", "count", "cat", "cluster", "esql", "inference", "get"]);

export const ES_COMMANDS: EsCommand[] = [
  ...GROUPS.flatMap(([category, items]) =>
    items.map<EsCommand>(([name, desc]) => ({
      name,
      desc,
      category,
      kind: "command",
      common: COMMON.has(name),
    }))
  ),
  ...NAMESPACES.map<EsCommand>(([name, desc]) => ({
    name,
    desc: `Elasticsearch ${desc}`,
    category: "API namespaces",
    kind: "namespace",
    common: COMMON.has(name),
  })),
];

function isSubsequence(q: string, target: string): boolean {
  let i = 0;
  for (const ch of target) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return q.length === 0;
}

function score(cmd: EsCommand, q: string): number {
  const name = cmd.name.toLowerCase();
  const bias = cmd.common ? 0 : 50;
  if (!q) return bias;
  if (name.startsWith(q)) return bias + 0;
  if (name.includes(q)) return bias + 10;
  if (isSubsequence(q, name)) return bias + 20;
  if (cmd.desc.toLowerCase().includes(q)) return bias + 30;
  return -1;
}

export function filterEsCommands(query: string): EsCommand[] {
  const q = query.trim().toLowerCase();
  return ES_COMMANDS.map((cmd, i) => ({ cmd, i, s: score(cmd, q) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.cmd);
}

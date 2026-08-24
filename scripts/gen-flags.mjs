#!/usr/bin/env node
// Regenerate src/esFlags.json from the installed Elastic CLI's machine-readable
// schema (`elastic cli-schema`). Run: npm run gen:flags
// Override the binary with ELASTIC_BIN if `elastic` isn't on your PATH.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const bin = process.env.ELASTIC_BIN || "elastic";
const out = fileURLToPath(new URL("../src/esFlags.json", import.meta.url));

const raw = execFileSync(bin, ["cli-schema"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const schema = JSON.parse(raw);

const stack = schema.namespaces.find((n) => n.segment === "stack");
const es = stack?.namespaces.find((n) => n.segment === "es");
if (!es) throw new Error("Could not find the `es` namespace in cli-schema output.");

const flags = {};
for (const c of es.commands ?? []) {
  flags[c.name] = (c.parameters ?? [])
    .filter((p) => p.role === "flag")
    .map((p) => ({
      name: p.name,
      type: p.type,
      required: !!p.required,
      summary: p.summary ?? "",
    }));
}

const subs = {};
for (const ns of es.namespaces ?? []) {
  subs[ns.segment] = [
    ...(ns.commands ?? []).map((c) => ({ name: c.name, summary: c.summary ?? "" })),
    ...(ns.namespaces ?? []).map((n) => ({ name: n.segment, summary: n.summary ?? "" })),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

writeFileSync(out, JSON.stringify({ flags, subs }));
console.log(
  `Wrote ${out} — ${Object.keys(flags).length} commands, ${Object.keys(subs).length} namespaces (CLI ${schema.version}).`
);

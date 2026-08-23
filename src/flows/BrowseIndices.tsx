import React, { useEffect, useState } from "react";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Box, Text, useInput } from "ink";
import { Select, Spinner, TextInput } from "@inkjs/ui";
import type { ElasticContext } from "../context.js";
import { createEsClient } from "../esClient.js";

const QUERIES_DIR = fileURLToPath(new URL("../../queries/", import.meta.url));
const PREVIEW_LINES = 10;
const INDEX_WINDOW = 12;
const DETAIL_LINES = 18;

type Phase =
  | { k: "loading" }
  | { k: "pick-index" }
  | { k: "menu"; index: string }
  | { k: "queries"; index: string; files: string[] }
  | {
      k: "prompt";
      index: string;
      file: string;
      raw: string;
      tokens: string[];
      values: Record<string, string>;
      current: number;
    }
  | { k: "searching"; index: string }
  | {
      k: "results";
      index: string;
      query: string;
      hits: Array<Record<string, unknown>>;
      fields: string[] | null;
      metrics: { status: number; total: number; relation: string; latencyMs: number };
    }
  | { k: "detail-loading"; index: string; title: string }
  | { k: "fields"; index: string; rows: Array<{ name: string; type: string }> }
  | { k: "settings"; index: string; lines: string[] }
  | { k: "error"; message: string; back: "home" | "menu"; index?: string };

export function BrowseIndices({
  ctx,
  onBack,
}: {
  ctx: ElasticContext;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ k: "loading" });
  const [indices, setIndices] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [scroll, setScroll] = useState(0);

  // Load the index list on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const client = createEsClient(ctx);
        const cat = await client.cat.indices({ format: "json", h: "index" });
        const list = (cat as Array<{ index?: string }>)
          .map((r) => r.index)
          .filter((i): i is string => typeof i === "string" && !i.startsWith("."))
          .sort();
        if (cancelled) return;
        if (!list.length) {
          setPhase({ k: "error", message: "No user indices found in this cluster.", back: "home" });
        } else {
          setIndices(list);
          setPhase({ k: "pick-index" });
        }
      } catch (err) {
        if (!cancelled)
          setPhase({ k: "error", message: (err as Error).message, back: "home" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx]);

  const filtered = indices.filter((i) => i.includes(filter.trim()));

  function openMenu(index: string) {
    setHighlight(0);
    setPhase({ k: "menu", index });
  }

  function startSearch(index: string) {
    try {
      const files = readdirSync(QUERIES_DIR)
        .filter((f) => f.endsWith(".json"))
        .sort();
      if (!files.length) {
        setPhase({ k: "error", message: `No .json queries found in ${QUERIES_DIR}`, back: "menu", index });
        return;
      }
      setHighlight(0);
      setPhase({ k: "queries", index, files });
    } catch (err) {
      setPhase({ k: "error", message: (err as Error).message, back: "menu", index });
    }
  }

  // Selecting a query: if it contains {{variables}}, prompt for each before
  // running; otherwise run it straight.
  function beginQuery(index: string, file: string) {
    try {
      const raw = readFileSync(QUERIES_DIR + file, "utf8");
      const tokens = scanTokens(raw);
      if (!tokens.length) {
        runQuery(index, file);
        return;
      }
      setPhase({ k: "prompt", index, file, raw, tokens, values: {}, current: 0 });
    } catch (err) {
      setPhase({ k: "error", message: (err as Error).message, back: "menu", index });
    }
  }

  function submitValue(value: string) {
    if (phase.k !== "prompt") return;
    const values = { ...phase.values, [phase.tokens[phase.current]!]: value };
    if (phase.current + 1 < phase.tokens.length) {
      setPhase({ ...phase, values, current: phase.current + 1 });
    } else {
      const filled = substitute(phase.raw, values);
      runQuery(phase.index, phase.file, filled);
    }
  }

  // `override` is pre-substituted JSON text (templated queries); otherwise the
  // file is re-read fresh so any edits you made since selecting it land.
  async function runQuery(index: string, file: string, override?: string) {
    setPhase({ k: "searching", index });
    try {
      const raw = override ?? readFileSync(QUERIES_DIR + file, "utf8");
      const body = JSON.parse(raw) as Record<string, unknown>;
      const client = createEsClient(ctx);
      // `meta: true` returns the HTTP envelope (status code + headers) around
      // the body, so we can report the response status alongside the results.
      const t0 = Date.now();
      const res = (await client.search({ index, ...body }, { meta: true })) as any;
      const latencyMs = Date.now() - t0;
      const status: number = res.statusCode ?? 200;
      const totalRaw = res.body.hits.total;
      const total = typeof totalRaw === "number" ? totalRaw : (totalRaw?.value ?? 0);
      const relation = typeof totalRaw === "object" ? (totalRaw?.relation ?? "eq") : "eq";
      // Columns come from the query's `_source` (in the order you list them);
      // `_score` is hit metadata, so it's always available and pinned first.
      const fields =
        Array.isArray(body._source) && body._source.every((f) => typeof f === "string")
          ? (body._source as string[])
          : null;
      const hits = res.body.hits.hits.map((h: any) => ({
        _score: h._score,
        ...(h._source as object),
      }));
      setPhase({
        k: "results",
        index,
        query: file,
        hits,
        fields,
        metrics: { status, total, relation, latencyMs },
      });
    } catch (err) {
      setPhase({ k: "error", message: (err as Error).message, back: "menu", index });
    }
  }

  async function viewMappings(index: string) {
    setPhase({ k: "detail-loading", index, title: `Fields — ${index}` });
    try {
      const client = createEsClient(ctx);
      const resp = (await client.indices.getMapping({ index })) as any;
      const mappings = (resp[index] ?? Object.values(resp)[0])?.mappings ?? {};
      const rows = listFields(mappings.properties ?? {});
      setScroll(0);
      setPhase({
        k: "fields",
        index,
        rows: rows.length ? rows : [{ name: "(no fields defined)", type: "" }],
      });
    } catch (err) {
      setPhase({ k: "error", message: (err as Error).message, back: "menu", index });
    }
  }

  async function viewSettings(index: string) {
    setPhase({ k: "detail-loading", index, title: `Settings — ${index}` });
    try {
      const client = createEsClient(ctx);
      const resp = (await client.indices.getSettings({ index })) as any;
      const settings = (resp[index] ?? Object.values(resp)[0])?.settings ?? {};
      const lines = flatten(settings);
      setScroll(0);
      setPhase({
        k: "settings",
        index,
        lines: lines.length ? lines : ["(no settings)"],
      });
    } catch (err) {
      setPhase({ k: "error", message: (err as Error).message, back: "menu", index });
    }
  }

  // Keyboard handling. Each phase owns its own escape (back-stack); at the root
  // (pick-index) escape calls onBack() to return to the home menu.
  useInput((input, key) => {
    if (phase.k === "pick-index") {
      const n = filtered.length;
      if (key.escape) onBack();
      else if (key.upArrow) setHighlight((h) => (n ? (h - 1 + n) % n : 0));
      else if (key.downArrow) setHighlight((h) => (n ? (h + 1) % n : 0));
      else if (key.return) {
        if (filtered[highlight]) openMenu(filtered[highlight]!);
      } else if (key.backspace || key.delete) {
        setFilter((f) => f.slice(0, -1));
        setHighlight(0);
      } else if (input && !key.ctrl && !key.meta && !key.tab) {
        setFilter((f) => f + input);
        setHighlight(0);
      }
    } else if (phase.k === "queries") {
      const n = phase.files.length;
      if (key.escape) openMenu(phase.index);
      else if (key.upArrow) setHighlight((h) => (h - 1 + n) % n);
      else if (key.downArrow) setHighlight((h) => (h + 1) % n);
      else if (key.return) beginQuery(phase.index, phase.files[highlight]!);
    } else if (phase.k === "prompt") {
      if (key.escape) startSearch(phase.index);
    } else if (phase.k === "results") {
      if (key.escape) openMenu(phase.index);
    } else if (phase.k === "fields" || phase.k === "settings") {
      const total = phase.k === "fields" ? phase.rows.length : phase.lines.length;
      const maxScroll = Math.max(0, total - DETAIL_LINES);
      if (key.escape) openMenu(phase.index);
      else if (key.upArrow || input === "k") setScroll((s) => Math.max(0, s - 1));
      else if (key.downArrow || input === "j") setScroll((s) => Math.min(maxScroll, s + 1));
      else if (key.pageUp) setScroll((s) => Math.max(0, s - DETAIL_LINES));
      else if (key.pageDown) setScroll((s) => Math.min(maxScroll, s + DETAIL_LINES));
      else if (input === "g") setScroll(0);
      else if (input === "G") setScroll(maxScroll);
    } else if (phase.k === "menu") {
      if (key.escape) setPhase({ k: "pick-index" });
    } else if (phase.k === "error") {
      if (key.escape) phase.back === "menu" && phase.index ? openMenu(phase.index) : onBack();
    }
  });

  if (phase.k === "loading")
    return (
      <Box paddingY={1}>
        <Spinner label="Loading indices…" />
      </Box>
    );

  if (phase.k === "error")
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">Error: {phase.message}</Text>
        <Text dimColor>esc to go back</Text>
      </Box>
    );

  if (phase.k === "pick-index") {
    let start = 0;
    if (filtered.length > INDEX_WINDOW) {
      start = Math.min(
        Math.max(0, highlight - Math.floor(INDEX_WINDOW / 2)),
        filtered.length - INDEX_WINDOW
      );
    }
    const visible = filtered.slice(start, start + INDEX_WINDOW);
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          Browse indices
        </Text>
        <Box marginTop={1}>
          <Text>filter: </Text>
          <Text color="yellow">{filter}</Text>
          <Text inverse> </Text>
          <Text dimColor>
            {"  "}
            {filtered.length}/{indices.length}
          </Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          {visible.length === 0 && <Text dimColor>(no matches)</Text>}
          {visible.map((name, i) => {
            const idx = start + i;
            return (
              <Text key={name} color={idx === highlight ? "green" : undefined}>
                {idx === highlight ? "❯ " : "  "}
                {name}
              </Text>
            );
          })}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>type to filter · ↑/↓ move · enter select · esc back</Text>
        </Box>
      </Box>
    );
  }

  if (phase.k === "menu")
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {phase.index}
        </Text>
        <Box marginY={1}>
          <Select
            options={[
              { label: "Search (saved queries)", value: "search" },
              { label: "View mappings (fields)", value: "mappings" },
              { label: "View settings", value: "settings" },
            ]}
            onChange={(v) => {
              if (v === "search") startSearch(phase.index);
              else if (v === "mappings") viewMappings(phase.index);
              else viewSettings(phase.index);
            }}
          />
        </Box>
        <Text dimColor>enter to choose · esc back to indices</Text>
      </Box>
    );

  if (phase.k === "queries") {
    const current = phase.files[highlight]!;
    const preview = readPreview(QUERIES_DIR + current, PREVIEW_LINES);
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          Pick a saved query
        </Text>
        <Text dimColor>index: {phase.index}</Text>
        <Box marginTop={1}>
          <Box flexDirection="column" width={30} marginRight={2}>
            {phase.files.map((f, i) => (
              <Text key={f} color={i === highlight ? "green" : undefined}>
                {i === highlight ? "❯ " : "  "}
                {f}
              </Text>
            ))}
          </Box>
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="gray"
            paddingX={1}
            minWidth={48}
          >
            {preview.map((ln, i) => (
              <Text key={i}>{ln.length ? ln : " "}</Text>
            ))}
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>↑/↓ move · enter run · esc back</Text>
        </Box>
      </Box>
    );
  }

  if (phase.k === "prompt") {
    const token = phase.tokens[phase.current]!;
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          {phase.file}
        </Text>
        <Text dimColor>
          variable {phase.current + 1} of {phase.tokens.length}
        </Text>
        {phase.tokens.slice(0, phase.current).map((t) => (
          <Text key={t} dimColor>
            {t}: {phase.values[t]}
          </Text>
        ))}
        <Box marginTop={1}>
          <Text color="magenta">{token}: </Text>
          <TextInput
            key={token}
            placeholder={`value for {{${token}}}`}
            onSubmit={submitValue}
          />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>enter to continue · esc back</Text>
        </Box>
      </Box>
    );
  }

  if (phase.k === "searching")
    return (
      <Box paddingY={1}>
        <Spinner label={`Searching ${phase.index}…`} />
      </Box>
    );

  if (phase.k === "detail-loading")
    return (
      <Box paddingY={1}>
        <Spinner label={`Loading ${phase.title}…`} />
      </Box>
    );

  if (phase.k === "fields") {
    const total = phase.rows.length;
    const shown = phase.rows.slice(scroll, scroll + DETAIL_LINES);
    const nameW = Math.min(44, Math.max(9, ...phase.rows.map((r) => r.name.length)));
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          Fields — {phase.index}
        </Text>
        <Text dimColor>{rangeLabel(scroll, shown.length, total)} fields</Text>
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Box width={nameW + 2}>
              <Text bold>FIELD</Text>
            </Box>
            <Text bold>TYPE</Text>
          </Box>
          <Text dimColor>
            {"─".repeat(nameW)}
            {"  "}
            {"─".repeat(12)}
          </Text>
          {shown.map((r, i) => (
            <Box key={i}>
              <Box width={nameW + 2}>
                <Text>{truncate(r.name, nameW)}</Text>
              </Box>
              <Text color="green">{r.type}</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>↑/↓ scroll · pgup/pgdn page · esc back to {phase.index}</Text>
        </Box>
      </Box>
    );
  }

  if (phase.k === "settings") {
    const total = phase.lines.length;
    const shown = phase.lines.slice(scroll, scroll + DETAIL_LINES);
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          Settings — {phase.index}
        </Text>
        <Text dimColor>{rangeLabel(scroll, shown.length, total)} entries</Text>
        <Box marginY={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
          {shown.map((ln, i) => (
            <Text key={i}>{ln}</Text>
          ))}
        </Box>
        <Text dimColor>↑/↓ scroll · pgup/pgdn page · esc back to {phase.index}</Text>
      </Box>
    );
  }

  // results — `_score` is always the first column; the rest come from the
  // query's `_source` order (or, if none declared, the source keys returned).
  const sourceCols =
    phase.fields ??
    Array.from(new Set(phase.hits.flatMap((h) => Object.keys(h)))).filter(
      (c) => c !== "_score"
    );
  const columns = ["_score", ...sourceCols];
  const colWidth = (c: string) => (c === "_score" ? 10 : 26);
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="cyan">
        {phase.index} · {phase.query}
      </Text>
      <Box>
        <Text color={phase.metrics.status < 400 ? "green" : "red"}>
          {phase.metrics.status} {statusText(phase.metrics.status)}
        </Text>
        <Text dimColor>
          {"  ·  "}
          {phase.metrics.relation === "gte" ? "≥" : ""}
          {phase.metrics.total} hits
          {"  ·  "}
          {phase.metrics.latencyMs} ms
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Box>
          {columns.map((c) => (
            <Box key={c} width={colWidth(c)}>
              <Text bold>{c}</Text>
            </Box>
          ))}
        </Box>
        {phase.hits.map((h, idx) => (
          <Box key={idx}>
            {columns.map((c) => (
              <Box key={c} width={colWidth(c)}>
                <Text color={c === "_score" ? "yellow" : undefined}>
                  {cell(c, h[c], colWidth(c) - 2)}
                </Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>esc back to {phase.index}</Text>
      </Box>
    </Box>
  );
}

// Recursively list mapping fields as { name: path, type }.
function listFields(
  properties: Record<string, any>,
  prefix = ""
): Array<{ name: string; type: string }> {
  const out: Array<{ name: string; type: string }> = [];
  for (const [key, val] of Object.entries(properties)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const type = val?.type ?? (val?.properties ? "object" : "—");
    out.push({ name: path, type });
    if (val?.properties) out.push(...listFields(val.properties, path));
  }
  return out;
}

// Flatten a settings object to "path: value" lines.
function flatten(obj: Record<string, any>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      out.push(...flatten(val, path));
    } else {
      out.push(`${path}: ${Array.isArray(val) ? val.join(", ") : String(val)}`);
    }
  }
  return out;
}

function readPreview(path: string, n: number): string[] {
  let lines: string[];
  try {
    lines = readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((l) => truncate(l, 46));
  } catch (err) {
    lines = [`<could not read: ${(err as Error).message}>`];
  }
  const out = lines.slice(0, n);
  while (out.length < n) out.push("");
  return out;
}

function truncate(s: string, n = 20): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Find unique {{variable}} tokens in a query file, in first-seen order.
function scanTokens(raw: string): string[] {
  const re = /\{\{\s*([\w.-]+)\s*\}\}/g;
  const seen: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    if (!seen.includes(m[1]!)) seen.push(m[1]!);
  }
  return seen;
}

// Replace {{token}} occurrences with the entered value, escaped so it stays
// valid JSON when the placeholder sits inside a quoted string.
function substitute(raw: string, values: Record<string, string>): string {
  let out = raw;
  for (const [key, val] of Object.entries(values)) {
    const re = new RegExp(`\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`, "g");
    const escaped = val.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    out = out.replace(re, escaped);
  }
  return out;
}

function statusText(code: number): string {
  const map: Record<number, string> = {
    200: "OK",
    201: "Created",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
  };
  return map[code] ?? "";
}

// Format a single result cell. `_score` is rounded; a null score (e.g. an
// unscored query) shows a dash.
function cell(col: string, value: unknown, width: number): string {
  if (col === "_score") return value == null ? "—" : Number(value).toFixed(3);
  return truncate(String(value ?? ""), width);
}

// "1–18 of 42" style range label for scrollable views.
function rangeLabel(scroll: number, shownCount: number, total: number): string {
  if (total === 0) return "0 of 0";
  return `${scroll + 1}–${scroll + shownCount} of ${total}`;
}

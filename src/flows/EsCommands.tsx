import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import {
  filterEsCommands,
  getFlags,
  getSubcommands,
  type EsCommand,
} from "../esCommands.js";

const WINDOW = 14;
const DETAIL_WINDOW = 12;

export function EsCommands({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<"list" | "detail">("list");
  const [detailCmd, setDetailCmd] = useState<EsCommand | null>(null);

  // list state
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  // detail (drill-in) state
  const [dQuery, setDQuery] = useState("");
  const [dHi, setDHi] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  const matches = filterEsCommands(query);
  const current = matches[highlight];

  function enterDetail(cmd: EsCommand) {
    setDetailCmd(cmd);
    setDQuery("");
    setDHi(0);
    setSelected([]);
    setView("detail");
  }

  // ----- detail derived data -----
  const cmd = detailCmd;
  const flags = cmd ? getFlags(cmd.name) : [];
  const subs = cmd ? getSubcommands(cmd.name) : [];
  const isNs = flags.length === 0 && subs.length > 0;
  const pool = isNs
    ? subs.map((s) => ({ name: s, type: "", required: false }))
    : flags;
  const dq = dQuery.trim().toLowerCase();
  const dFiltered = pool.filter((it) => dq === "" || it.name.toLowerCase().includes(dq));
  const assembled =
    cmd &&
    `elastic es ${cmd.name}` +
      selected
        .map((n) => ` --${n} <${flags.find((f) => f.name === n)?.type ?? "string"}>`)
        .join("");

  useInput((input, key) => {
    if (view === "list") {
      const n = matches.length;
      if (key.escape) onBack();
      else if (key.upArrow) setHighlight((h) => (n ? (h - 1 + n) % n : 0));
      else if (key.downArrow) setHighlight((h) => (n ? (h + 1) % n : 0));
      else if (key.return) {
        if (current) enterDetail(current);
      } else if (key.backspace || key.delete) {
        setQuery((q) => q.slice(0, -1));
        setHighlight(0);
      } else if (input && input !== " " && !key.ctrl && !key.meta && !key.tab) {
        setQuery((q) => q + input);
        setHighlight(0);
      }
    } else {
      // detail
      const n = dFiltered.length;
      if (key.escape) {
        setView("list");
      } else if (key.upArrow) {
        setDHi((h) => (n ? (h - 1 + n) % n : 0));
      } else if (key.downArrow) {
        setDHi((h) => (n ? (h + 1) % n : 0));
      } else if (input === " " && !isNs) {
        const nm = dFiltered[dHi]?.name;
        if (nm)
          setSelected((sel) =>
            sel.includes(nm) ? sel.filter((x) => x !== nm) : [...sel, nm]
          );
      } else if (key.backspace || key.delete) {
        setDQuery((q) => q.slice(0, -1));
        setDHi(0);
      } else if (input && input !== " " && !key.ctrl && !key.meta && !key.tab) {
        setDQuery((q) => q + input);
        setDHi(0);
      }
    }
  });

  if (view === "detail" && cmd) {
    let start = 0;
    if (dFiltered.length > DETAIL_WINDOW) {
      start = Math.min(
        Math.max(0, dHi - Math.floor(DETAIL_WINDOW / 2)),
        dFiltered.length - DETAIL_WINDOW
      );
    }
    const visible = dFiltered.slice(start, start + DETAIL_WINDOW);
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box>
          <Text bold color="cyan">
            es {cmd.name}
          </Text>
          <Text dimColor> — {isNs ? "subcommands" : "arguments"}</Text>
        </Box>
        {!isNs && <Text color="yellow">$ {assembled}</Text>}
        <Box marginTop={1}>
          <Text color="magenta">{"> "}</Text>
          <Text>{dQuery}</Text>
          <Text inverse> </Text>
          <Text dimColor>
            {"   "}
            {dFiltered.length}/{pool.length}
          </Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          {visible.length === 0 && <Text dimColor>(no matches)</Text>}
          {visible.map((it, i) => {
            const idx = start + i;
            const active = idx === dHi;
            const checked = selected.includes(it.name);
            return (
              <Box key={it.name}>
                <Text color={active ? "green" : undefined}>
                  {active ? "❯ " : "  "}
                  {!isNs && (checked ? "[x] " : "[ ] ")}
                  {isNs ? it.name : `--${it.name}`}
                </Text>
                {!isNs && (
                  <Text dimColor>
                    {" "}
                    {`<${it.type}>`}
                    {it.required ? " *" : ""}
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            {isNs
              ? "type filter · ↑/↓ move · esc back"
              : "type filter · ↑/↓ move · space toggle (copy command above) · esc back"}
          </Text>
        </Box>
      </Box>
    );
  }

  // ----- list view -----
  let start = 0;
  if (matches.length > WINDOW) {
    start = Math.min(
      Math.max(0, highlight - Math.floor(WINDOW / 2)),
      matches.length - WINDOW
    );
  }
  const visible = matches.slice(start, start + WINDOW);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="cyan">
        es | elasticsearch
      </Text>
      <Box>
        <Text color="magenta">{"> "}</Text>
        <Text>{query}</Text>
        <Text inverse> </Text>
        <Text dimColor>
          {"   "}
          {matches.length}/{ES_TOTAL}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Box flexDirection="column" width={30} marginRight={2}>
          {visible.length === 0 && <Text dimColor>(no matches)</Text>}
          {visible.map((c, i) => {
            const idx = start + i;
            const active = idx === highlight;
            return (
              <Text key={c.category + c.name} color={active ? "green" : undefined}>
                {active ? "❯ " : "  "}
                {c.name}
              </Text>
            );
          })}
        </Box>

        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingX={1}
          minWidth={46}
        >
          {current ? <Detail cmd={current} /> : <Text dimColor> </Text>}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>type to filter · ↑/↓ move · enter browse args · esc back</Text>
      </Box>
    </Box>
  );
}

function Detail({ cmd }: { cmd: EsCommand }) {
  const flags = getFlags(cmd.name);
  const subs = getSubcommands(cmd.name);
  return (
    <>
      <Text dimColor>{cmd.category}</Text>
      <Text bold>{cmd.name}</Text>
      <Box marginTop={1}>
        <Text>{cmd.desc}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          {flags.length > 0
            ? `${flags.length} flags`
            : subs.length > 0
              ? `${subs.length} subcommands`
              : "no arguments"}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>enter → browse</Text>
      </Box>
    </>
  );
}

const ES_TOTAL = filterEsCommands("").length;

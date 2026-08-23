import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { filterCommands, type Command } from "../commands.js";

const WINDOW = 12;

export function CommandPalette({
  connection,
  onSelect,
  onExit,
}: {
  connection: string;
  onSelect: (cmd: Command) => void;
  onExit: () => void;
}) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const matches = filterCommands(query);

  useInput((input, key) => {
    const n = matches.length;
    if (key.escape) {
      onExit();
    } else if (key.upArrow) {
      setHighlight((h) => (n ? (h - 1 + n) % n : 0));
    } else if (key.downArrow) {
      setHighlight((h) => (n ? (h + 1) % n : 0));
    } else if (key.return) {
      if (matches[highlight]) onSelect(matches[highlight]!);
    } else if (key.backspace || key.delete) {
      setQuery((q) => q.slice(0, -1));
      setHighlight(0);
    } else if (input && !key.ctrl && !key.meta && !key.tab) {
      setQuery((q) => q + input);
      setHighlight(0);
    }
  });

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
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Elastic TUI
        </Text>
        <Text dimColor> — {connection}</Text>
      </Box>

      <Box>
        <Text color="magenta">{"> "}</Text>
        <Text>{query}</Text>
        <Text inverse> </Text>
        <Text dimColor>
          {"   "}
          {matches.length}/{filterCommands("").length}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {visible.length === 0 && <Text dimColor>(no matching commands)</Text>}
        {visible.map((cmd, i) => {
          const idx = start + i;
          const active = idx === highlight;
          const label = cmd.aliases?.length
            ? `${cmd.path} | ${cmd.aliases.join(" | ")}`
            : cmd.path;
          return (
            <Box key={cmd.path}>
              <Box width={26}>
                <Text color={active ? "green" : undefined}>
                  {active ? "❯ " : "  "}
                  {label}
                </Text>
              </Box>
              <Text dimColor>{cmd.desc}</Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>type to filter · ↑/↓ move · enter select · esc quit</Text>
      </Box>
    </Box>
  );
}

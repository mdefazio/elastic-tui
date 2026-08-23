import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { filterEsCommands, type EsCommand } from "../esCommands.js";

const WINDOW = 14;

export function EsCommands({
  onRun,
  onBack,
}: {
  onRun: (command: string) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const matches = filterEsCommands(query);
  const current = matches[highlight];

  useInput((input, key) => {
    const n = matches.length;
    if (key.escape) {
      onBack();
    } else if (key.upArrow) {
      setHighlight((h) => (n ? (h - 1 + n) % n : 0));
    } else if (key.downArrow) {
      setHighlight((h) => (n ? (h + 1) % n : 0));
    } else if (key.return) {
      if (current) onRun(`elastic es ${current.name}`);
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
        {/* left: fuzzy command list */}
        <Box flexDirection="column" width={30} marginRight={2}>
          {visible.length === 0 && <Text dimColor>(no matches)</Text>}
          {visible.map((cmd, i) => {
            const idx = start + i;
            const active = idx === highlight;
            return (
              <Text key={cmd.category + cmd.name} color={active ? "green" : undefined}>
                {active ? "❯ " : "  "}
                {cmd.name}
              </Text>
            );
          })}
        </Box>

        {/* right: detail pane */}
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
        <Text dimColor>type to filter · ↑/↓ move · enter select · esc back</Text>
      </Box>
    </Box>
  );
}

function Detail({ cmd }: { cmd: EsCommand }) {
  return (
    <>
      <Text dimColor>{cmd.category}</Text>
      <Text bold>{cmd.name}</Text>
      <Box marginTop={1}>
        <Text>{cmd.desc}</Text>
      </Box>
      {cmd.kind === "namespace" && (
        <Box marginTop={1}>
          <Text dimColor>API namespace — has its own subcommands.</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="yellow">$ elastic es {cmd.name}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>enter → send to terminal</Text>
      </Box>
    </>
  );
}

const ES_TOTAL = filterEsCommands("").length;

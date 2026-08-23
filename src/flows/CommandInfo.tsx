import React from "react";
import { Box, Text, useInput } from "ink";
import type { Command } from "../commands.js";

// Shown for commands the prototype doesn't implement a flow for yet. Surfaces
// the description, subcommands, and the equivalent real CLI invocation.
export function CommandInfo({
  cmd,
  onBack,
}: {
  cmd: Command;
  onBack: () => void;
}) {
  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  const label = cmd.aliases?.length
    ? `${cmd.path} | ${cmd.aliases.join(" | ")}`
    : cmd.path;

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="cyan">
        {label}
      </Text>
      <Box marginTop={1}>
        <Text>{cmd.desc}</Text>
      </Box>

      {cmd.subcommands?.length ? (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Subcommands:</Text>
          {cmd.subcommands.map((s) => (
            <Text key={s}> · {s}</Text>
          ))}
        </Box>
      ) : null}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Not wired up in this prototype. Run it in the CLI:</Text>
        <Text color="yellow">$ elastic {cmd.path} --help</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>esc to go back</Text>
      </Box>
    </Box>
  );
}

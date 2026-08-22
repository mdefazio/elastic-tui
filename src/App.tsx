import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { Select } from "@inkjs/ui";
import type { ElasticContext } from "./context.js";
import { hasEsConnection } from "./context.js";
import { BrowseIndices } from "./flows/BrowseIndices.js";
import { ContextView } from "./flows/ContextView.js";

type Screen = "menu" | "browse" | "context";

export function App({ ctx }: { ctx: ElasticContext }) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("menu");

  // Global escape hatch back to the menu / out of the app.
  useInput((input, key) => {
    if (input === "q" && screen === "menu") exit();
    if (key.escape) setScreen("menu");
  });

  if (screen === "browse") return <BrowseIndices ctx={ctx} />;
  if (screen === "context") return <ContextView ctx={ctx} />;

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Elastic TUI
        </Text>
        <Text dimColor> — {hasEsConnection(ctx) ? ctx.es.url : "no active ES context"}</Text>
      </Box>

      <Select
        options={[
          { label: "Browse indices → search", value: "browse" },
          { label: "Show connection context", value: "context" },
          { label: "Quit", value: "quit" },
        ]}
        onChange={(value) => {
          if (value === "quit") exit();
          else setScreen(value as Screen);
        }}
      />

      <Box marginTop={1}>
        <Text dimColor>↑/↓ to move · enter to select · esc to go back · q to quit</Text>
      </Box>
    </Box>
  );
}

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

  // The home menu owns escape/quit. Sub-flows own their own escape (they run a
  // back-stack) and call `onBack` when they're at their root.
  useInput((input, key) => {
    if (screen !== "menu") return;
    if (input === "q" || key.escape) exit();
  });

  const goHome = () => setScreen("menu");

  if (screen === "browse") return <BrowseIndices ctx={ctx} onBack={goHome} />;
  if (screen === "context") return <ContextView ctx={ctx} onBack={goHome} />;

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
          { label: "Browse indices", value: "browse" },
          { label: "Show connection context", value: "context" },
          { label: "Quit", value: "quit" },
        ]}
        onChange={(value) => {
          if (value === "quit") exit();
          else setScreen(value as Screen);
        }}
      />

      <Box marginTop={1}>
        <Text dimColor>↑/↓ to move · enter to select · esc/q to quit</Text>
      </Box>
    </Box>
  );
}

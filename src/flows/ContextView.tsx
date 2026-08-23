import React from "react";
import { Box, Text, useInput } from "ink";
import type { ElasticContext } from "../context.js";

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <Box>
      <Box width={20}>
        <Text dimColor>{label}</Text>
      </Box>
      <Text>{value ? mask(value, label) : <Text color="red">— not set —</Text>}</Text>
    </Box>
  );
}

function mask(value: string, label: string): string {
  return label.toLowerCase().includes("key") ? value.slice(0, 6) + "…" : value;
}

export function ContextView({
  ctx,
  onBack,
}: {
  ctx: ElasticContext;
  onBack: () => void;
}) {
  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="cyan">
        Active context
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Row label="ES url" value={ctx.es.url} />
        <Row label="ES api key" value={ctx.es.apiKey} />
        <Row label="Kibana url" value={ctx.kibana.url} />
        <Row label="Kibana api key" value={ctx.kibana.apiKey} />
        <Row label="Cloud url" value={ctx.cloud.url} />
        <Row label="Cloud api key" value={ctx.cloud.apiKey} />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>esc to go back</Text>
      </Box>
    </Box>
  );
}

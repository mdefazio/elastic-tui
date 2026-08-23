import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import type { ElasticContext } from "../context.js";
import { createEsClient } from "../esClient.js";

type State =
  | { k: "checking" }
  | { k: "ok"; status: number; cluster: string; version: string; latencyMs: number }
  | { k: "error"; message: string };

// Live connectivity check against the active context — the TUI's take on
// `elastic status`.
export function Status({ ctx, onBack }: { ctx: ElasticContext; onBack: () => void }) {
  const [state, setState] = useState<State>({ k: "checking" });

  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const client = createEsClient(ctx);
        const t0 = Date.now();
        const res = (await client.info(undefined, { meta: true })) as any;
        const latencyMs = Date.now() - t0;
        if (cancelled) return;
        setState({
          k: "ok",
          status: res.statusCode ?? 200,
          cluster: res.body?.cluster_name ?? res.body?.name ?? "unknown",
          version: res.body?.version?.number ?? "unknown",
          latencyMs,
        });
      } catch (err) {
        if (!cancelled) setState({ k: "error", message: (err as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx]);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="cyan">
        Status
      </Text>
      <Text dimColor>{ctx.es.url ?? "no ES url in active context"}</Text>
      <Box marginTop={1} flexDirection="column">
        {state.k === "checking" && <Spinner label="Checking connectivity…" />}
        {state.k === "ok" && (
          <>
            <Text color="green">
              ● connected · {state.status} OK · {state.latencyMs} ms
            </Text>
            <Text>cluster: {state.cluster}</Text>
            <Text>version: {state.version}</Text>
          </>
        )}
        {state.k === "error" && <Text color="red">● failed · {state.message}</Text>}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>esc to go back</Text>
      </Box>
    </Box>
  );
}

import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { Select, Spinner } from "@inkjs/ui";
import type { ElasticContext } from "../context.js";
import { createEsClient } from "../esClient.js";

type State =
  | { phase: "loading-indices" }
  | { phase: "pick-index"; indices: string[] }
  | { phase: "searching"; index: string }
  | { phase: "results"; index: string; hits: Array<Record<string, unknown>> }
  | { phase: "error"; message: string };

export function BrowseIndices({ ctx }: { ctx: ElasticContext }) {
  const [state, setState] = useState<State>({ phase: "loading-indices" });

  // Load the index list on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const client = createEsClient(ctx);
        const cat = await client.cat.indices({ format: "json", h: "index" });
        const indices = (cat as Array<{ index?: string }>)
          .map((r) => r.index)
          .filter((i): i is string => Boolean(i) && !i.startsWith("."))
          .sort();
        if (!cancelled) {
          setState(
            indices.length
              ? { phase: "pick-index", indices }
              : { phase: "error", message: "No user indices found in this cluster." }
          );
        }
      } catch (err) {
        if (!cancelled)
          setState({ phase: "error", message: (err as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx]);

  async function runSearch(index: string) {
    setState({ phase: "searching", index });
    try {
      const client = createEsClient(ctx);
      const res = await client.search({
        index,
        size: 10,
        query: { match_all: {} },
      });
      const hits = res.hits.hits.map((h) => ({ _id: h._id, ...(h._source as object) }));
      setState({ phase: "results", index, hits });
    } catch (err) {
      setState({ phase: "error", message: (err as Error).message });
    }
  }

  if (state.phase === "loading-indices")
    return (
      <Box paddingY={1}>
        <Spinner label="Loading indices…" />
      </Box>
    );

  if (state.phase === "error")
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">Error: {state.message}</Text>
        <Text dimColor>esc to go back</Text>
      </Box>
    );

  if (state.phase === "pick-index")
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          Pick an index
        </Text>
        <Box marginY={1}>
          <Select
            options={state.indices.map((i) => ({ label: i, value: i }))}
            onChange={runSearch}
          />
        </Box>
        <Text dimColor>enter to search · esc to go back</Text>
      </Box>
    );

  if (state.phase === "searching")
    return (
      <Box paddingY={1}>
        <Spinner label={`Searching ${state.index}…`} />
      </Box>
    );

  // results
  const columns = Array.from(
    new Set(state.hits.flatMap((h) => Object.keys(h)))
  ).slice(0, 4);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text bold color="cyan">
        {state.hits.length} hits in {state.index}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Box>
          {columns.map((c) => (
            <Box key={c} width={22}>
              <Text bold>{c}</Text>
            </Box>
          ))}
        </Box>
        {state.hits.map((h, idx) => (
          <Box key={idx}>
            {columns.map((c) => (
              <Box key={c} width={22}>
                <Text>{truncate(String(h[c] ?? ""))}</Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>esc to go back</Text>
      </Box>
    </Box>
  );
}

function truncate(s: string, n = 20): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

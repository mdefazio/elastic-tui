import { Client } from "@elastic/elasticsearch";
import type { ElasticContext } from "./context.js";

// Uses the official JS client rather than CLI internals (per the plan).
// The 8.x client works against both stateful ES and serverless endpoints.
export function createEsClient(ctx: ElasticContext): Client {
  if (!ctx.es.url || !ctx.es.apiKey) {
    throw new Error(
      "No Elasticsearch connection in the active context. " +
        "Run the extension via `elastic tui` with an active context, or set " +
        "ELASTIC_ES_URL and ELASTIC_ES_API_KEY."
    );
  }
  return new Client({
    node: ctx.es.url,
    auth: { apiKey: ctx.es.apiKey },
  });
}

// Reads the active Elastic CLI context, passed to the extension as env vars.
// See: https://github.com/elastic/cli#creating-a-local-extension
export interface ElasticContext {
  es: { url?: string; apiKey?: string };
  kibana: { url?: string; apiKey?: string };
  cloud: { url?: string; apiKey?: string };
}

export function readContext(): ElasticContext {
  return {
    es: {
      url: process.env.ELASTIC_ES_URL,
      apiKey: process.env.ELASTIC_ES_API_KEY,
    },
    kibana: {
      url: process.env.ELASTIC_KIBANA_URL,
      apiKey: process.env.ELASTIC_KIBANA_API_KEY,
    },
    cloud: {
      url: process.env.ELASTIC_CLOUD_URL,
      apiKey: process.env.ELASTIC_CLOUD_API_KEY,
    },
  };
}

export function hasEsConnection(ctx: ElasticContext): boolean {
  return Boolean(ctx.es.url && ctx.es.apiKey);
}

#!/usr/bin/env node
// Runtime shim: register tsx so we can run the TypeScript/TSX source directly
// with no separate build step. The Elastic CLI spawns this file as the
// extension entrypoint (see package.json "bin").
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { register } from "tsx/esm/api";

const unregister = register();
const here = dirname(fileURLToPath(import.meta.url));

try {
  await import(join(here, "..", "src", "index.tsx"));
} finally {
  unregister();
}

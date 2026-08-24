import React, { useState } from "react";
import { useApp } from "ink";
import type { ElasticContext } from "./context.js";
import { hasEsConnection } from "./context.js";
import type { Command } from "./commands.js";
import { CommandPalette } from "./flows/CommandPalette.js";
import { CommandInfo } from "./flows/CommandInfo.js";
import { EsCommands } from "./flows/EsCommands.js";
import { BrowseIndices } from "./flows/BrowseIndices.js";
import { ContextView } from "./flows/ContextView.js";
import { Status } from "./flows/Status.js";

type Route =
  | { k: "palette" }
  | { k: "es" }
  | { k: "browse" }
  | { k: "context" }
  | { k: "status" }
  | { k: "info"; cmd: Command };

export function App({ ctx }: { ctx: ElasticContext }) {
  const { exit } = useApp();
  const [route, setRoute] = useState<Route>({ k: "palette" });

  const goHome = () => setRoute({ k: "palette" });
  const connection = hasEsConnection(ctx) ? ctx.es.url! : "no active ES context";

  function onSelect(cmd: Command) {
    switch (cmd.action) {
      case "es":
        return setRoute({ k: "es" });
      case "browse":
        return setRoute({ k: "browse" });
      case "context":
        return setRoute({ k: "context" });
      case "status":
        return setRoute({ k: "status" });
      default:
        return setRoute({ k: "info", cmd });
    }
  }

  if (route.k === "es")
    return <EsCommands onBack={goHome} />;
  if (route.k === "browse") return <BrowseIndices ctx={ctx} onBack={goHome} />;
  if (route.k === "context") return <ContextView ctx={ctx} onBack={goHome} />;
  if (route.k === "status") return <Status ctx={ctx} onBack={goHome} />;
  if (route.k === "info") return <CommandInfo cmd={route.cmd} onBack={goHome} />;

  return <CommandPalette connection={connection} onSelect={onSelect} onExit={exit} />;
}

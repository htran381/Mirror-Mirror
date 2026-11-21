# Move Module Design

MirrorMirror lets users reposition a MagicMirror² module with a voice command such as “Mirror, move the clock to the top right.” The move takes effect on the running display. Each destination accepts up to three modules. When a destination is full, the oldest arrival is swapped back to the requested module’s original region.

## Functional requirements

1. Identify the requested module and its destination from the user’s natural-language request.
2. Move the requested module to the destination during runtime.
3. Support a maximum of three modules in each position.
4. If the destination contains fewer than three modules, move the requested module there without swapping any existing modules.
5. If the destination already contains three modules, swap the requested module with the module that was added to that position earliest (FIFO).
6. Move the displaced module to the requested module’s original position.
7. If no swap is necessary, leave the remaining modules in the original position unchanged. If the requested module was the only occupant, the original position becomes empty.
8. Perform the operation without restarting MagicMirror.

The physical mirror is planned for portrait orientation. Three modules per position is the current design limit.

## Request flow

1. **MMM-Chat** routes the request to Claude with MCP tools enabled. Its schema adapter converts the discovered `mirror.module.move` tool to `mirror_module_move` for Anthropic and passes the selected arguments back to MCP. [Router](../MagicMirror/modules/MMM-Chat/models/router.js) · [Claude adapter](../MagicMirror/modules/MMM-Chat/models/claude.js)
2. **The MCP tool** accepts the exact instance identifier returned by `mirror.module.list` and a canonical position such as `top_right`. Exact identifiers let the mirror distinguish current weather, hourly weather, and forecast even though all three use the same module name. The HTTP client sends `POST /api/module/:identifier/move` with a JSON body such as `{"position":"top_right"}`. [Tool definition](../magicmirror-mcp/src/plugins/mirrorPlugin.ts) · [HTTP client](../magicmirror-mcp/src/client/MagicMirrorClient.ts)
3. **MMM-Remote-Control** sends a `MOVE` socket notification with the identifier, position, and request ID. The frontend finds the instance, calls `MM.moveModule()`, and returns a result. The Node helper matches the reply to the pending HTTP request. The endpoint returns `200` on confirmation, `400` for a rejected request, or `504` if no frontend replies within three seconds. The first reply determines the HTTP result when several mirror frontends are connected. [API route](../MagicMirror/modules/MMM-Remote-Control/API/api.js) · [Node helper](../MagicMirror/modules/MMM-Remote-Control/node_helper.js) · [Frontend handler](../MagicMirror/modules/MMM-Remote-Control/MMM-Remote-Control.js)

## Runtime layout

MagicMirror mounts each displayed module in a wrapper whose DOM ID matches the module’s instance identifier. Each wrapper is a direct child of a region’s `.container`. Moving the existing wrapper with `appendChild()` preserves its identity and underlying module instance. Normal module updates can still find the wrapper by ID. After moving, the core updates `module.data.position` for each affected instance and recalculates container visibility so an empty destination can open and a vacated source can collapse. [Region markup](../MagicMirror/index.html) · [Core implementation](../MagicMirror/js/main.js) · [Canonical positions](../MagicMirror/js/positions.js)

| Destination state | Behavior |
| --- | --- |
| Fewer than three modules | Append the requested module. Existing modules stay in their regions. |
| Exactly three modules | Append the oldest destination module to the source, then append the requested module to the destination. |
| Already above capacity | Reject the request because a swap would leave the destination above capacity. |
| Same region as the source | Return success and preserve the current order. |

FIFO uses direct-child DOM order. Startup establishes the initial order, and each arrival joins the end of its new region’s queue. Hidden modules keep their wrappers and count toward capacity. CSS flex order can affect how modules appear on screen while FIFO still follows insertion order.

For example, if top right contains Current Weather, Hourly Weather, and Forecast in that order, moving Clock there sends Current Weather to Clock’s previous region. Top right then contains Hourly Weather, Forecast, and Clock.

## Layout and persistence

The capacity rule limits the number of modules in a region. Their size and placement still follow MagicMirror’s CSS. For example, `bottom_center` sits above `bottom_bar`. A tall MMM-Chat panel in the bottom bar can push a clock in bottom center upward. [Region styles](../MagicMirror/css/main.css)

Moves last for the lifetime of the display page. Refreshing the page or restarting the mirror restores the configured layout. Persistence across restarts is deferred. Any future persistence design should save both region membership and FIFO order.

## Manual verification

With the mirror running in normal mode and Claude enabled, move the clock into an empty region, then into a partially occupied region, and finally into a full region. Check that the clock keeps updating, existing occupants stay put when there is room, and only the oldest occupant is displaced when the destination is full. In the terminal, `mirror_module_move` should return `success: true` and the requested position for each successful move.

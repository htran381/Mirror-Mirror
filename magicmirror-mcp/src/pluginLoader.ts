import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { MCPPlugin, PluginContext } from "./plugins/plugin.js"

export async function loadPlugins(server: McpServer, context: PluginContext) {

  const plugins: MCPPlugin[] = [
    (await import("./plugins/mirrorPlugin.js")).default,
    (await import("./plugins/notificationsPlugin.js")).default,
    (await import("./plugins/homeAssistantPlugin.js")).default,
    (await import("./plugins/systemPlugin.js")).default,
    (await import("./plugins/choicePlugin.js")).default,
    // To-do list tools (add, edit, complete, ...) for the chat
    (await import("./plugins/todoPlugin.js")).default
  ]

  for (const plugin of plugins) {
    await plugin.register(server, context)
  }

}

const path = require("node:path");

// Store the MCP client so we can reuse the connection
let mcpClient = null;

// Connect MMM-Chat to the MCP server
async function connectMcp() {
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");

    // MCP server path
    const serverPath = path.resolve(
        __dirname,
        "../../../../magicmirror-mcp/dist/server.js"
    );

    // Configure stdio connection
    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
        env: {
            ...process.env,
            MAGICMIRROR_URL: "http://localhost:8080"
        }
    });

    // Create MCP client
    const client = new Client({
        name: "mmm-chat",
        version: "1.0.0"
    });

    // Connect to MCP server
    await client.connect(transport);

    // Save the connected client
    mcpClient = client;

    console.log("MMM-Chat connected to MCP server");
}

// Retrieve MCP server tools
async function listMcpTools() {
    if (!mcpClient) {
        throw new Error("MCP client is not connected");
    }

    return await mcpClient.listTools();
}

// Calls an MCP tool
async function callMcpTool(toolName, toolParameters = {}) {
    if (!mcpClient) {
        throw new Error("MCP client is not connected");
    }

    // Send the tool name and parameter to the MCP server
    const result = await mcpClient.callTool({
        name: toolName,
        arguments: toolParameters
    });

    return result;
}

module.exports = {
    connectMcp,
    listMcpTools,
    callMcpTool,
};
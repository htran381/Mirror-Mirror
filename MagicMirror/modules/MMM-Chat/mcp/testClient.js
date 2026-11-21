const { connectMcp, listMcpTools, callMcpTool, } = require("./mcpClient");

// The purpose of this test is to verify connection and tool discovery
async function testConnection() {
    try {

        await connectMcp();

        // Retrieve tools 
        const result = await listMcpTools();

        // Display each available tool
        console.log("Available MCP tools:");

        result.tools.forEach((tool) => {
            console.log(`- ${tool.name}`);
        });

        // Execute the mirror.module.list tool
        const response = await callMcpTool("mirror.module.list", {});

        // Display the result returned by the MCP server
        console.log("Module list result:");
        console.log(JSON.stringify(response, null, 2));

    } catch (error) {
        console.error("MCP connection failed:", error);
        process.exitCode = 1;
    }
}

testConnection();
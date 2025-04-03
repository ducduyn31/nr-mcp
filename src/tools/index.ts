import { defaultLogger } from "../utils/logger/index.js";
import { HelloWorldSchema, helloWorldTool } from "./hello-world.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Export all tool functions for direct use
export * from "./hello-world.js";

/**
 * Register all tools with the MCP server
 * @param server The MCP server instance
 */
export function registerAllTools(server: McpServer): void {
	defaultLogger.info("Registering all tools");

	// Register the hello world tool
	server.tool(
		"hello-world",
		"A simple hello world tool that returns a greeting",
		HelloWorldSchema,
		helloWorldTool,
	);

	// Add more tool registrations here as they are created
}

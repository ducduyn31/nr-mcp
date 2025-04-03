import { defaultLogger } from "../utils/logger/index.js";
import { RunNrqlQuerySchema, runNrqlQueryTool } from "./run-nrql-query.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Export all tool functions for direct use
export * from "./run-nrql-query.js";

/**
 * Register all tools with the MCP server
 * @param server The MCP server instance
 */
export function registerAllTools(server: McpServer): void {
	defaultLogger.info("Registering all tools");

	// Register the run NRQL query tool
	server.tool(
		"run-nrql-query",
		"Execute a NRQL query and return the results as datapoints",
		RunNrqlQuerySchema,
		runNrqlQueryTool,
	);

	// Add more tool registrations here as they are created
}

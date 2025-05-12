import { defaultLogger } from "../utils/logger/index.js";
import { RunNrqlQuerySchema, runNrqlQueryTool } from "./run-nrql-query.js";
import { QueryLogsSchema, queryLogsTool } from "./query-logs.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export * from "./run-nrql-query.js";
export * from "./query-logs.js";

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

	// Register the query logs tool
	server.tool(
		"query-logs",
		"Query New Relic logs by field and value with customizable parameters",
		QueryLogsSchema,
		queryLogsTool,
	);
}

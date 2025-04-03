import { z } from "zod";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defaultLogger } from "../utils/logger/index.js";
import { defaultContainer, type Constructor } from "../utils/index.js";
import {
	NewRelicNrqlService,
	type NrqlQueryResult,
} from "../services/new-relic-nrql-service.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Schema for the run NRQL query tool parameters
 */
export const RunNrqlQuerySchema = {
	query: z.string().describe("NRQL query to execute"),
	timeout: z
		.number()
		.optional()
		.describe("Query timeout in milliseconds (default: 30000)"),
};

/**
 * Run NRQL query tool implementation
 * @param args Tool arguments
 * @returns Tool result with datapoints
 */
export const runNrqlQueryTool: ToolCallback<typeof RunNrqlQuerySchema> = async (
	args,
) => {
	try {
		const { query, timeout = 30000 } = args;
		defaultLogger.info(`Running NRQL query: ${query}`);

		// Get the NRQL service from the container
		const nrqlService = defaultContainer.get(
			NewRelicNrqlService as unknown as Constructor<NewRelicNrqlService>,
		) as NewRelicNrqlService;

		// Execute the query
		const result = await nrqlService.executeNrqlQuery(query, timeout);

		// Format the response
		return formatNrqlQueryResult(result);
	} catch (error) {
		defaultLogger.error("Error running NRQL query", error);

		const response: CallToolResult = {
			content: [
				{
					type: "text",
					text: `Error running NRQL query: ${error instanceof Error ? error.message : String(error)}`,
				},
			],
		};

		return response;
	}
};

/**
 * Format the NRQL query result for display
 * @param result The NRQL query result
 * @returns Formatted tool result
 */
function formatNrqlQueryResult(result: NrqlQueryResult): CallToolResult {
	const { results, metadata, query, elapsedTime } = result;

	// Create a summary of the results
	const summary = {
		query,
		datapoints: results.length,
		elapsedTime: `${elapsedTime}ms`,
		timeWindow: metadata.timeWindow
			? {
					begin: new Date(metadata.timeWindow.begin).toISOString(),
					end: new Date(metadata.timeWindow.end).toISOString(),
				}
			: null,
		facets: metadata.facets,
	};

	const response: CallToolResult = {
		content: [
			{
				type: "text",
				text: `Successfully executed NRQL query with ${results.length} datapoints in ${elapsedTime}ms.`,
			},
			{
				type: "text",
				text: JSON.stringify(
					{
						summary,
						results,
					},
					null,
					2,
				),
			},
		],
	};

	return response;
}

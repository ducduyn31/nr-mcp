import { z } from "zod";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defaultLogger } from "../utils/logger/index.js";
import {
	defaultContainer,
	type Constructor,
	formatNrqlResultAsMermaidChart,
	type MermaidChartOptions,
} from "../utils/index.js";
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
	visualize: z
		.boolean()
		.optional()
		.describe(
			"Whether to visualize the results as a Mermaid chart (default: false)",
		),
	valueKey: z
		.string()
		.optional()
		.describe(
			"The key to extract values from for visualization (required if visualize is true)",
		),
	chartTitle: z
		.string()
		.optional()
		.describe("The title for the chart (default: 'NRQL Query Results')"),
	yAxisLabel: z
		.string()
		.optional()
		.describe("The label for the y-axis (default: 'Value')"),
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
		const {
			query,
			timeout = 30000,
			visualize = false,
			valueKey,
			chartTitle = "NRQL Query Results",
			yAxisLabel = "Value",
		} = args;
		defaultLogger.info(`Running NRQL query: ${query}`);

		// Get the NRQL service from the container
		const nrqlService = defaultContainer.get(
			NewRelicNrqlService as unknown as Constructor<NewRelicNrqlService>,
		) as NewRelicNrqlService;

		// Execute the query
		const result = await nrqlService.executeNrqlQuery(query, timeout);

		// Format the response
		return formatNrqlQueryResult(result, {
			visualize,
			valueKey,
			chartTitle,
			yAxisLabel,
		});
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
 * Format options for NRQL query results
 */
interface FormatOptions {
	visualize?: boolean;
	valueKey?: string;
	chartTitle?: string;
	yAxisLabel?: string;
}

/**
 * Format the NRQL query result for display
 * @param result The NRQL query result
 * @param options Format options
 * @returns Formatted tool result
 */
function formatNrqlQueryResult(
	result: NrqlQueryResult,
	options: FormatOptions = {},
): CallToolResult {
	const { results, metadata, query, elapsedTime } = result;
	const {
		visualize = false,
		valueKey,
		chartTitle = "NRQL Query Results",
		yAxisLabel = "Value",
	} = options;

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
		],
	};

	// Add visualization if requested and valueKey is provided
	if (visualize && valueKey && results.length > 0) {
		try {
			const chartOptions: MermaidChartOptions = {
				title: chartTitle,
				yAxisLabel: yAxisLabel,
			};

			const mermaidChart = formatNrqlResultAsMermaidChart(
				result,
				valueKey,
				chartOptions,
			);

			// Add the Mermaid chart
			const mermaidText = ["```mermaid", mermaidChart, "```"].join("\n");
			response.content.push({
				type: "text",
				text: mermaidText,
			});

			// Also add the JSON data for reference
			response.content.push({
				type: "text",
				text: JSON.stringify({ summary, results }, null, 2),
			});
		} catch (error) {
			defaultLogger.error("Error generating Mermaid chart", error);

			// Fall back to JSON format if visualization fails
			response.content.push({
				type: "text",
				text: JSON.stringify({ summary, results }, null, 2),
			});
		}
	} else {
		// Standard JSON format
		response.content.push({
			type: "text",
			text: JSON.stringify({ summary, results }, null, 2),
		});
	}

	return response;
}

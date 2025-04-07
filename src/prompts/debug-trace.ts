/**
 * Debug Trace Prompt
 *
 * This prompt helps users debug a specific trace by providing the trace ID.
 * It retrieves the trace data and guides the analysis process.
 */

export const debugTracePrompt = {
	name: "debug-trace",
	description: "Debug a specific trace using its trace ID",
	arguments: [
		{
			name: "traceId",
			description: "The trace ID to debug",
			required: true,
		},
		{
			name: "timeRange",
			description: "Time range in minutes to search for logs (default: 60)",
			required: false,
		},
	],
};

export interface DebugTraceArgs {
	traceId: string;
	timeRange?: number;
}

/**
 * Handle the debug-trace prompt
 * @param args The prompt arguments
 * @returns The prompt response
 */
export async function handleDebugTracePrompt(args: Record<string, unknown>) {
	const traceId = args?.traceId;
	if (!traceId) {
		throw new Error("Missing required argument: traceId");
	}

	const timeRange = args?.timeRange as number | undefined;

	return {
		messages: [
			{
				role: "user",
				content: {
					type: "text",
					text: `Debug trace should be a multi step workflow. You should come up with a workflow depending the result of the trace.

When asked to debug a New Relic trace using a trace ID, follow these steps:

Step 1: Fetch the Trace Data
Retrieve the trace from New Relic using the MCP server resource:
📌 newrelic-logs://trace/${traceId}${timeRange ? `/timeRange/${timeRange}` : ""}

Step 2: Identify the Environment
Determine whether the trace is from production or staging and query the corresponding service:

Production: newrelic-services://prod

Staging: newrelic-services://staging

Step 3: Summarize and Visualize the Trace
Analyze the trace to identify all related services in the request flow.

Visualize the critical path of the trace using a Mermaid sequence diagram.

Step 4: Investigate Infrastructure Errors
If the error appears to be infrastructure-related (e.g., OOM, timeout, etc.), follow these sub-steps:

1. First, request all available NRQL queries for the affected service:
📌 newrelic-nrql://service/{serviceName}

2. Review the returned NRQL queries and decide which ones are most relevant to the issue.

3. Execute the selected NRQL queries using the MCP server tool to fetch the actual data:
📌 run-nrql-query

Query Limit: Do not exceed 5 consecutive executions of run-nrql-query.

Step 5: Identify the Root Cause and Visualize Data Flow
Identify the service causing the error based on the trace data.

Use a Mermaid flowchart to visualize the data flow and potential root causes.

Step 6: Root Cause Analysis (RCA) and Fix Proposal
Conduct a root cause analysis (RCA) to determine why the issue occurred.

Propose a fix based on the findings.`,
				},
			},
			{
				role: "user",
				content: {
					type: "text",
					text: `I need to debug a trace with ID ${traceId}. Please analyze this trace and help me understand what's happening.`,
				},
			},
			{
				role: "user",
				content: {
					type: "text",
					text: `newrelic-logs://trace/${traceId}${timeRange ? `/timeRange/${timeRange}` : ""}`,
				},
			},
			{
				role: "user",
				content: {
					type: "text",
					text: "newrelic-services://prod",
				},
			},
			{
				role: "user",
				content: {
					type: "text",
					text: "newrelic-services://staging",
				},
			},
			{
				role: "user",
				content: {
					type: "text",
					text: "After analyzing the trace data and identifying the environment, please create a Mermaid sequence diagram to visualize the critical path of the trace. Include all services involved and highlight any errors or bottlenecks.",
				},
			},
			{
				role: "assistant",
				content: {
					type: "text",
					text: "I've analyzed the trace and created a sequence diagram showing the critical path. Would you like me to continue with the detailed error investigation and root cause analysis?",
				},
			},
			{
				role: "user",
				content: {
					type: "text",
					text: "If you identify infrastructure-related errors, follow these steps: 1) Use the newrelic-nrql://service/{serviceName} resource to get all available NRQL queries for the affected services, 2) Review the returned queries and decide which ones are most relevant to the issue, 3) Execute the selected queries using the run-nrql-query tool to fetch the actual data and analyze the problem. Please limit to 5 executions of run-nrql-query.",
				},
			},
			{
				role: "user",
				content: {
					type: "text",
					text: "Once you've identified the root cause, create a Mermaid flowchart to visualize the data flow and potential root causes. Then conduct a thorough root cause analysis (RCA) and propose a specific fix based on your findings.",
				},
			},
		],
	};
}

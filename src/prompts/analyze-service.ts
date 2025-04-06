/**
 * Analyze Service Prompt
 *
 * This prompt helps users analyze the performance and health of a specific service.
 * It retrieves service metrics and provides insights on performance patterns.
 */

export const analyzeServicePrompt = {
  name: "analyze-service",
  description: "Analyze the performance and health of a specific service",
  arguments: [
    {
      name: "serviceName",
      description: "The name of the service to analyze",
      required: true
    },
    {
      name: "environment",
      description: "The environment to analyze (prod or staging)",
      required: false
    }
  ]
};

export interface AnalyzeServiceArgs {
  serviceName: string;
  environment?: string;
}

/**
 * Handle the analyze-service prompt
 * @param args The prompt arguments
 * @returns The prompt response
 */
export async function handleAnalyzeServicePrompt(args: Record<string, unknown>) {
  const serviceName = args?.serviceName;
  const environment = args?.environment || "prod";
  
  if (!serviceName) {
    throw new Error("Missing required argument: serviceName");
  }

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `I need to analyze the performance of the ${serviceName} service in the ${environment} environment. Please provide insights on its health and performance.`,
        },
      },
      {
        role: "user",
        content: {
          type: "text",
          text: `newrelic-nrql://service/${serviceName}`,
        },
      },
      {
        role: "user",
        content: {
          type: "text",
          text: `First, examine the available NRQL queries for ${serviceName} from the resource above. Look for queries related to:

1. CPU usage - Search for queries containing "cpuPercent", "cpu", "processor"
2. Memory usage - Search for queries with "memory", "memoryUsed", "heap"
3. Postgres database metrics - Look for "postgres", "database", "db", "sql"
4. ElasticCache metrics - Look for "cache", "redis", "elasticache"

For each relevant query you find, execute it using the run-nrql-query tool.

Then visualization will automatically generate Mermaid charts for time series data:

\`\`\`mermaid
xychart-beta
    title "Example Chart"
    x-axis [Time values]
    y-axis "Value" 0 --> 100
    line [Values]
\`\`\`

Based on this data, please provide insights on:
1. Response time trends
2. Error rates
3. Throughput
4. CPU and Memory usage patterns
5. Database performance metrics
6. Cache performance metrics
7. Any anomalies or concerning patterns
8. Recommendations for improvement`,
        },
      },
    ],
  };
}
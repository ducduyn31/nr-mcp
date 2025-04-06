/**
 * Explore Errors Prompt
 *
 * This prompt helps users explore and analyze errors in a specific service.
 * It runs NRQL queries to find errors and provides analysis of the results.
 */

import { errorQueries } from './error-queries.js';
import type { NrqlQuery } from './error-queries.js';

export const exploreErrorsPrompt = {
  name: "explore-errors",
  description: "Explore and analyze errors in a specific service",
  arguments: [
    {
      name: "serviceName",
      description: "The name of the service to analyze errors for (specified by the 'svc' attribute)",
      required: true
    },
    {
      name: "environment",
      description: "The environment to analyze (specified by the 'env' attribute, e.g., 'prod', 'staging')",
      required: false
    },
    {
      name: "timeframe",
      description: "The time period before now to analyze (e.g., '1 hour', '1 day')",
      required: false
    },
    {
      name: "queryType",
      description: "The type of error query to run (e.g., 'errorLogs')",
      required: false
    }
  ]
};

export interface ExploreErrorsArgs {
  serviceName: string;
  environment?: string;
  timeframe?: string;
  queryType?: string;
}

/**
 * Handle the explore-errors prompt
 * @param args The prompt arguments
 * @returns The prompt response
 */
export async function handleExploreErrorsPrompt(args: Record<string, unknown>) {
  const serviceName = args?.serviceName;
  const timeframe = args?.timeframe || "1 hour";
  const queryType = args?.queryType as string || "errorLogs";
  const environment = args?.environment as string || "prod";
  
  if (!serviceName) {
    throw new Error("Missing required argument: serviceName");
  }

  // Get the selected query or default to errorLogs
  const selectedQuery: NrqlQuery = errorQueries[queryType] || errorQueries.errorLogs;
  
  // Replace variables in the query
  let queryString = selectedQuery.query
    .replace('${serviceName}', serviceName as string)
    .replace('${timeframe}', timeframe as string);
  
  // Replace environment variable if it exists in the query
  if (queryString.includes('${environment}')) {
    queryString = queryString.replace('${environment}', environment);
  }
  
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `I need to explore errors in the ${serviceName} service in the ${environment} environment over the last ${timeframe} using the "${queryType}" query. Please help me understand what's going wrong.`,
        },
      },
      {
        role: "user",
        content: {
          type: "text",
          text: `Let's run a NRQL query to find errors in ${serviceName} (${environment}).\n\nQuery description: ${selectedQuery.description}`,
        },
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `I'll run the following NRQL query to analyze errors in the ${serviceName} service:\n\n\`\`\`sql\n${queryString}\n\`\`\``
        }
      },
      {
        role: "user",
        content: {
          type: "text",
          text: `How to interpret these results: ${selectedQuery.interpretation}\n\nBased on these errors, please:\n1. Categorize the types of errors\n2. Identify the most frequent errors\n3. Suggest potential root causes\n4. Recommend troubleshooting steps`,
        },
      },
    ],
  };
}
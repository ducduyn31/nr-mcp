import { z } from "zod";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defaultLogger, defaultContainer, type Constructor } from "../utils/index.js";
import { NewRelicLogsService, type LogsQueryResult } from "../services/index.js";

/**
 * Schema for the New Relic logs tool parameters
 */
export const NewRelicLogsSchema = {
  /**
   * NRQL query string
   */
  nrql: z.string().optional().describe("NRQL query string"),
  
  /**
   * Maximum number of logs to return
   */
  limit: z.number().int().positive().max(1000).optional().describe("Maximum number of logs to return"),
  
  /**
   * Time range in minutes (from now)
   */
  timeRange: z.number().int().positive().optional().describe("Time range in minutes (from now)"),
  
  /**
   * Additional NRQL where clause conditions
   */
  whereConditions: z.array(z.string()).optional().describe("Additional NRQL where clause conditions"),
};

/**
 * New Relic logs tool implementation
 * @param args Tool arguments
 * @returns Tool result
 */
export const newRelicLogsTool: ToolCallback<typeof NewRelicLogsSchema> = async (
  args,
) => {
  try {
    defaultLogger.info("New Relic logs tool called");
    
    // Get the logs service from the container
    const logsService = defaultContainer.get(NewRelicLogsService as unknown as Constructor<NewRelicLogsService>) as NewRelicLogsService;
    
    // Query logs
    let result: LogsQueryResult;
    if (args.nrql) {
      // If NRQL is provided, use it directly
      result = await logsService.queryLogs(args.nrql);
    } else {
      // Otherwise, use the provided options
      result = await logsService.queryLogs({
        limit: args.limit,
        timeRange: args.timeRange,
        whereConditions: args.whereConditions,
      });
    }
    
    defaultLogger.info(`Retrieved ${result.logs.length} log entries`);
    
    // Format the response - convert JSON to formatted text
    const formattedJson = JSON.stringify(result, null, 2);
    
    return {
      content: [
        {
          type: "text",
          text: `Retrieved ${result.logs.length} log entries in ${result.metadata.elapsedTime}ms\n\n\`\`\`json\n${formattedJson}\n\`\`\``,
        },
      ],
    };
  } catch (error) {
    defaultLogger.error("Failed to query New Relic logs", error);
    
    return {
      content: [
        {
          type: "text",
          text: `Error querying New Relic logs: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
};
import { z } from "zod";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defaultLogger } from "../utils/logger/index.js";
import { defaultContainer, type Constructor } from "../utils/index.js";
import {
  NewRelicLogsService,
  type LogsQueryResult,
  type LogsQueryOptions,
} from "../services/index.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Validates time parameters to ensure users are using either time range or timestamp parameters correctly
 * @param params Time parameters to validate
 * @throws Error if parameters are used incorrectly
 */
function validateTimeParameters({
  startTimeRange,
  endTimeRange,
  startTimestamp,
  endTimestamp,
}: {
  startTimeRange?: number;
  endTimeRange?: number;
  startTimestamp?: number;
  endTimestamp?: number | null;
}): void {
  const isUsingTimestamp = startTimestamp !== undefined;

  const isUsingTimeRange =
    startTimeRange !== undefined || endTimeRange !== undefined;

  if (isUsingTimestamp && isUsingTimeRange) {
    throw new Error(
      "Invalid parameter combination: Cannot use both timestamp and time range parameters together. " +
        "Use either startTimestamp/endTimestamp OR startTimeRange/endTimeRange.",
    );
  }

  if (endTimestamp !== undefined && !isUsingTimestamp) {
    throw new Error(
      "Invalid parameter: endTimestamp provided without startTimestamp. " +
        "When using timestamp-based queries, startTimestamp is required.",
    );
  }
}

/**
 * Schema for the query logs tool parameters
 */
export const QueryLogsSchema = {
  queryValue: z.string().describe("Value to search for in the specified field"),

  queryField: z
    .string()
    .optional()
    .describe("Field name to query on (default: 'trace.id')"),
  startTimeRange: z
    .number()
    .optional()
    .describe(
      "Start time range in minutes to look back from now (default: 60)",
    ),
  endTimeRange: z
    .number()
    .optional()
    .describe(
      "End time range in minutes to look back from now (default: 0, meaning now)",
    ),
  startTimestamp: z
    .number()
    .optional()
    .describe("Start timestamp in milliseconds since epoch"),
  endTimestamp: z
    .number()
    .nullable()
    .optional()
    .describe("End timestamp in milliseconds since epoch (null means now)"),
  limit: z
    .number()
    .optional()
    .describe("Maximum number of logs to return (default: 100)"),
  selectFields: z
    .array(z.string())
    .optional()
    .describe(
      "Fields to select in the query (default: timestamp, message, tag, userAgent)",
    ),
  additionalConditions: z
    .array(z.string())
    .optional()
    .describe("Additional NRQL where clause conditions"),
};

/**
 * Query logs tool implementation
 * @param args Tool arguments
 * @returns Tool result with logs data
 */
export const queryLogsTool: ToolCallback<typeof QueryLogsSchema> = async (
  args,
) => {
  try {
    const {
      queryValue,
      queryField = "trace.id",
      startTimeRange,
      endTimeRange,
      startTimestamp,
      endTimestamp,
      limit = 100,
      selectFields = ["timestamp", "message", "tag", "userAgent"],
      additionalConditions = [],
    } = args;

    validateTimeParameters({
      startTimeRange,
      endTimeRange,
      startTimestamp,
      endTimestamp,
    });

    defaultLogger.info(`Querying logs where ${queryField} = '${queryValue}'`);

    const logsService = defaultContainer.get(
      NewRelicLogsService as unknown as Constructor<NewRelicLogsService>,
    ) as NewRelicLogsService;

    const queryOptions: LogsQueryOptions = {
      limit,
      selectFields,
      whereConditions: [...additionalConditions],
    };

    if (startTimestamp !== undefined) {
      queryOptions.startTimestamp = startTimestamp;
      queryOptions.endTimestamp = endTimestamp;
    } else {
      queryOptions.startTimeRange = startTimeRange;
      queryOptions.endTimeRange = endTimeRange;
    }

    queryOptions.whereConditions?.push(`${queryField} = '${queryValue}'`);

    const result = await logsService.queryLogs(queryOptions);

    return formatLogsQueryResult(result, queryField, queryValue);
  } catch (error) {
    defaultLogger.error("Error querying logs", error);

    const response: CallToolResult = {
      content: [
        {
          type: "text",
          text: `Error querying logs: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };

    return response;
  }
};

/**
 * Format the logs query result for display
 * @param result The logs query result
 * @param queryField The field used for querying
 * @param queryValue The value used for querying
 * @returns Formatted tool result
 */
function formatLogsQueryResult(
  result: LogsQueryResult,
  queryField: string,
  queryValue: string,
): CallToolResult {
  const { logs, metadata } = result;

  const summary = {
    query: `${queryField} = '${queryValue}'`,
    logsCount: logs.length,
    elapsedTime: `${metadata.elapsedTime}ms`,
  };

  const response: CallToolResult = {
    content: [
      {
        type: "text",
        text: `Successfully retrieved ${logs.length} log entries where ${queryField} = '${queryValue}' in ${metadata.elapsedTime}ms.`,
      },
      {
        type: "text",
        text: JSON.stringify({ summary, logs }, null, 2),
      },
    ],
  };

  return response;
}

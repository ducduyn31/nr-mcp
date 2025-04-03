import { NewRelicBaseService } from "./new-relic-base-service.js";
import type { NewRelicApiConfig } from "./new-relic-base-service.js";
import { defaultLogger } from "../utils/logger/index.js";

/**
 * Interface for log entry data
 */
export interface LogEntry {
	timestamp: string;
	message: string;
	level?: string;
	attributes: Record<string, unknown>;
}

/**
 * Interface for NRQL logs query result
 */
export interface LogsQueryResult {
	logs: LogEntry[];
	metadata: {
		totalCount: number;
		elapsedTime: number;
	};
}

/**
 * Options for querying logs
 */
export interface LogsQueryOptions {
	/**
	 * Maximum number of logs to return
	 */
	limit?: number;

	/**
	 * Time range in minutes (from now)
	 */
	timeRange?: number;

	/**
	 * Additional NRQL where clause conditions
	 */
	whereConditions?: string[];

	/**
	 * Fields to select in the query (defaults to * if not specified)
	 */
	selectFields?: string[];
}

/**
 * Service for querying New Relic logs using NRQL
 */
export class NewRelicLogsService extends NewRelicBaseService {
	/**
	 * Creates a new NewRelicLogsService instance
	 * @param config New Relic API configuration
	 */
	constructor(config: NewRelicApiConfig) {
		super(config);
		defaultLogger.info("Initialized New Relic Logs Service");
	}

	/**
	 * Query logs using NRQL
	 * @param nrql NRQL query string or query options
	 * @returns Logs query result
	 */
	async queryLogs(nrql: string | LogsQueryOptions): Promise<LogsQueryResult> {
		try {
			let query: string;

			// If nrql is a string, use it directly
			if (typeof nrql === "string") {
				query = nrql;
			} else {
				// Otherwise, build the query from options
				const {
					limit = 100,
					timeRange = 60,
					whereConditions = [],
					selectFields = [],
				} = nrql;

				// Build the where clause
				// Calculate timestamp for timeRange minutes ago and current time
				const pastTimestamp = Math.floor(Date.now() - timeRange * 60 * 1000);
				const currentTimestamp = Math.floor(Date.now());
				let whereClause = `WHERE timestamp > ${pastTimestamp} AND timestamp <= ${currentTimestamp}`;
				if (whereConditions.length > 0) {
					whereClause += ` AND ${whereConditions.join(" AND ")}`;
				}

				// Build the select clause - use specified fields if provided, otherwise use *
				const selectClause =
					selectFields.length > 0 ? selectFields.join(", ") : "*";

				// Build the full query
				query = `SELECT ${selectClause} FROM Log ${whereClause} LIMIT ${limit}`;
			}

			defaultLogger.info(`Executing NRQL logs query: ${query}`);

			// Execute the query via NerdGraph
			const nerdGraphQuery = `
        query LogsQuery($accountId: Int!, $query: Nrql!) {
          actor {
            account(id: $accountId) {
              nrql(query: $query) {
                results
                metadata {
                  timeWindow {
                    begin
                    end
                  }
                }
              }
            }
          }
        }
      `;

			const variables = {
				accountId: Number.parseInt(this.accountId, 10),
				query,
			};

			const startTime = Date.now();
			const result = await this.executeNerdGraphQuery<{
				actor: {
					account: {
						nrql: {
							results: LogEntry[];
							metadata: {
								timeWindow: {
									start: number;
									end: number;
								};
							};
						};
					};
				};
			}>(nerdGraphQuery, variables);

			const elapsedTime = Date.now() - startTime;
			const logs = result.actor.account.nrql.results;

			defaultLogger.info(
				`Retrieved ${logs.length} log entries in ${elapsedTime}ms`,
			);

			return {
				logs,
				metadata: {
					totalCount: logs.length,
					elapsedTime,
				},
			};
		} catch (error) {
			defaultLogger.error("Failed to query logs", error);
			throw error;
		}
	}
}

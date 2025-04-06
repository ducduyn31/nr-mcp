import { NewRelicBaseService } from "./new-relic-base-service.js";
import type { NewRelicApiConfig } from "./new-relic-base-service.js";
import { defaultLogger } from "../utils/logger/index.js";
import { gql } from "graphql-request";
import {
	NewRelicDashboardsService,
	type DashboardDetails,
	type DashboardsQueryOptions,
} from "./new-relic-dashboards-service.js";
import { defaultContainer, type Constructor } from "../utils/index.js";
import { PromisePool } from "@supercharge/promise-pool";
import { NewRelicSchemaService } from "./new-relic-schema-service.js";
import { EventBus, EventType } from "../utils/event-bus.js";

/**
 * Interface for NRQL query information
 */
export interface NrqlQuery {
	query: string;
	widgetName: string;
	dashboardName: string;
	dashboardGuid: string;
}

/**
 * Interface for service NRQL query result
 */
export interface ServiceNrqlQueryResult {
	queries: NrqlQuery[];
	metadata: {
		totalCount: number;
		elapsedTime: number;
		serviceName: string;
	};
}

/**
 * Service for querying New Relic NRQLs
 */
export class NewRelicNrqlService extends NewRelicBaseService {
	/**
	 * Maximum number of concurrent dashboard detail requests
	 */
	private readonly MAX_CONCURRENCY = 5;

	/**
	 * Creates a new NewRelicNrqlService instance
	 * @param config New Relic API configuration
	 */
	constructor(config: NewRelicApiConfig) {
		super(config);
		defaultLogger.info("Initialized New Relic NRQL Service");
	}

	/**
	 * Query all NRQLs for a specific service
	 * @param options Query options with service name
	 * @returns NRQL query result
	 */
	async queryNrqlsByService(
		options: DashboardsQueryOptions,
	): Promise<ServiceNrqlQueryResult> {
		try {
			defaultLogger.info(
				`Querying New Relic NRQLs for service: ${options.serviceName}`,
			);
			const startTime = Date.now();

			// Get the dashboards service from the container
			const dashboardsService = defaultContainer.get(
				NewRelicDashboardsService as unknown as Constructor<NewRelicDashboardsService>,
			) as NewRelicDashboardsService;

			// First, get all dashboards related to the service
			const dashboardsResult = await dashboardsService.queryDashboards(options);

			defaultLogger.info(
				`Found ${dashboardsResult.dashboards.length} dashboards for service ${options.serviceName}. Processing with concurrency ${this.MAX_CONCURRENCY}`,
			);

			// Use PromisePool to process dashboards with controlled concurrency
			const { results: dashboardNrqlsArrays, errors } =
				await PromisePool.withConcurrency(this.MAX_CONCURRENCY)
					.for(dashboardsResult.dashboards)
					.process(async (dashboard) => {
						try {
							const dashboardDetails =
								await dashboardsService.getDashboardDetails(dashboard.guid);
							return this.extractNrqlsFromDashboard(dashboardDetails);
						} catch (error) {
							defaultLogger.error(
								`Error fetching details for dashboard ${dashboard.name} (${dashboard.guid})`,
								error,
							);
							return [] as NrqlQuery[];
						}
					});

			// Log any errors that occurred during processing
			if (errors.length > 0) {
				defaultLogger.error(
					`Encountered ${errors.length} errors while processing dashboards`,
				);
			}

			// Flatten the array of arrays into a single array of NrqlQuery objects
			const nrqlQueries = dashboardNrqlsArrays.flat();

			const elapsedTime = Date.now() - startTime;

			defaultLogger.info(
				`Retrieved ${nrqlQueries.length} NRQL queries for service ${options.serviceName} in ${elapsedTime}ms`,
			);

			return {
				queries: nrqlQueries,
				metadata: {
					totalCount: nrqlQueries.length,
					elapsedTime,
					serviceName: options.serviceName,
				},
			};
		} catch (error) {
			defaultLogger.error(
				`Failed to query NRQLs for service: ${options.serviceName}`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Extract NRQLs from a dashboard
	 * @param dashboardDetails Dashboard details
	 * @returns Array of NRQL queries from the dashboard
	 */
	private extractNrqlsFromDashboard(
		dashboardDetails: DashboardDetails,
	): NrqlQuery[] {
		const nrqlQueries: NrqlQuery[] = [];

		// Process each page and widget to extract NRQL queries
		for (const page of dashboardDetails.pages) {
			for (const widget of page.widgets) {
				if (
					widget.rawConfiguration.nrqlQueries &&
					Array.isArray(widget.rawConfiguration.nrqlQueries)
				) {
					for (const nrqlQuery of widget.rawConfiguration.nrqlQueries) {
						nrqlQueries.push({
							query: nrqlQuery.query,
							widgetName: widget.title,
							dashboardName: dashboardDetails.name,
							dashboardGuid: dashboardDetails.guid,
						});
					}
				}
			}
		}

		defaultLogger.info(
			`Extracted ${nrqlQueries.length} NRQL queries from dashboard ${dashboardDetails.name} (${dashboardDetails.guid})`,
		);

		return nrqlQueries;
	}
	/**
	 * Execute a NRQL query and return the results
	 * @param query The NRQL query to execute
	 * @param timeout Optional timeout in milliseconds (default: 30000)
	 * @returns The query results with datapoints
	 */
	async executeNrqlQuery(
		query: string,
		timeout = 30000,
		skipSchemaCache = false,
	): Promise<NrqlQueryResult> {
		try {
			defaultLogger.info(`Executing NRQL query: ${query}`);
			const startTime = Date.now();

			// Check if we need to fetch schema for any table in the query
			if (!skipSchemaCache) {
				await this.checkAndCacheTableSchema(query);
			}

			// GraphQL query to execute NRQL
			const nrqlGraphQLQuery = gql`
				query ($accountId: Int!, $nrqlQuery: Nrql!, $timeout: Seconds) {
					actor {
						account(id: $accountId) {
							nrql(query: $nrqlQuery, timeout: $timeout) {
								results
								metadata {
									facets
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

			// Execute the GraphQL query
			const variables = {
				accountId: Number.parseInt(this.accountId, 10),
				nrqlQuery: query,
				timeout,
			};

			const response = await this.executeNerdGraphQuery<NrqlGraphQLResponse>(
				nrqlGraphQLQuery,
				variables,
			);

			const elapsedTime = Date.now() - startTime;

			// Extract results and metadata
			const results = response.actor.account.nrql.results;
			const metadata = response.actor.account.nrql.metadata;

			defaultLogger.info(
				`NRQL query executed in ${elapsedTime}ms, returned ${results.length} datapoints`,
			);

			return {
				results,
				metadata,
				query,
				elapsedTime,
			};
		} catch (error) {
			defaultLogger.error(`Failed to execute NRQL query: ${query}`, error);
			throw error;
		}
	}

	/**
	 * Check if we need to fetch schema for any table in the query
	 * @param query NRQL query
	 */
	private async checkAndCacheTableSchema(query: string): Promise<void> {
		try {
			// Extract table names from the query
			const tableNames = this.extractTableNamesFromQuery(query);
			
			if (tableNames.length === 0) {
				return;
			}

			// Get the schema service from the container
			const schemaService = defaultContainer.get(
				NewRelicSchemaService as unknown as Constructor<NewRelicSchemaService>,
			) as NewRelicSchemaService;

			// Check and cache schema for each table
			for (const tableName of tableNames) {
				try {
					if (!schemaService.isTableSchemaCached(tableName)) {
						defaultLogger.info(`Schema for table ${tableName} not cached, fetching...`);
						// Use skipSchemaCache=true to avoid infinite recursion
						const schemaQuery = `SELECT keyset() FROM ${tableName} LIMIT 1`;
						const result = await this.executeNrqlQuery(schemaQuery, 30000, true);
						
						if (result.results.length > 0 && result.results[0].keyset) {
							const keyset = result.results[0].keyset as string[];
							// Cache the schema directly
							schemaService.cacheTableSchema(tableName, keyset);
							// Publish event through the EventBus
							const eventBus = defaultContainer.get(
								EventBus as unknown as Constructor<EventBus>
							) as EventBus;
							eventBus.publish(EventType.SCHEMA_UPDATED, tableName);
						}
					} else {
						defaultLogger.info(`Using cached schema for table ${tableName}`);
					}
				} catch (error) {
					defaultLogger.error(`Error fetching schema for table ${tableName}`, error);
					// Continue with other tables even if one fails
				}
			}
		} catch (error) {
			defaultLogger.error("Error checking and caching table schema", error);
			// Don't throw the error, just log it and continue with the query
		}
	}

	/**
	 * Extract table names from a NRQL query
	 * @param query NRQL query
	 * @returns Array of table names
	 */
	private extractTableNamesFromQuery(query: string): string[] {
		try {
			// Simple regex to extract table names from FROM clauses
			// This is a basic implementation and might need to be enhanced for complex queries
			const fromRegex = /\bFROM\s+([A-Za-z0-9_]+)/gi;
			const matches = [...query.matchAll(fromRegex)];
			
			// Extract and deduplicate table names
			const tableNames = matches
				.map(match => match[1])
				.filter((value, index, self) => self.indexOf(value) === index);
			
			if (tableNames.length > 0) {
				defaultLogger.info(`Extracted table names from query: ${tableNames.join(', ')}`);
			}
			
			return tableNames;
		} catch (error) {
			defaultLogger.error("Error extracting table names from query", error);
			return [];
		}
	}
}

/**
 * Interface for NRQL GraphQL response
 */
interface NrqlGraphQLResponse {
	actor: {
		account: {
			nrql: {
				results: Record<string, unknown>[];
				metadata: {
					facets: string[] | null;
					timeWindow: {
						begin: number;
						end: number;
					};
				};
			};
		};
	};
}

/**
 * Interface for NRQL query result
 */
export interface NrqlQueryResult {
	results: Record<string, unknown>[];
	metadata: {
		facets: string[] | null;
		timeWindow: {
			begin: number;
			end: number;
		};
	};
	query: string;
	elapsedTime: number;
}

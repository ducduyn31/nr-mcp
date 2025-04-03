import { NewRelicBaseService } from "./new-relic-base-service.js";
import type { NewRelicApiConfig } from "./new-relic-base-service.js";
import { defaultLogger } from "../utils/logger/index.js";
import {
	NewRelicDashboardsService,
	type Dashboard,
	type DashboardDetails,
	type DashboardsQueryOptions,
	type DashboardsQueryResult,
} from "./new-relic-dashboards-service.js";
import { defaultContainer, type Constructor } from "../utils/index.js";
import { PromisePool } from "@supercharge/promise-pool";

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
}

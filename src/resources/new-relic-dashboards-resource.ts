import {
	defaultLogger,
	defaultContainer,
	type Constructor,
} from "../utils/index.js";
import {
	NewRelicDashboardsService,
	type DashboardsQueryResult,
} from "../services/new-relic-dashboards-service.js";
import type { ResourceTemplate } from "./index.js";

/**
 * URI patterns for New Relic dashboards resource templates
 */
// Format: newrelic-dashboards://service/{serviceName}
// Example: newrelic-dashboards://service/order-service
const NEW_RELIC_DASHBOARDS_SERVICE_URI_PATTERN =
	/^newrelic-dashboards:\/\/service\/(.+)$/;

// Format: newrelic-dashboards://guid/{guid}
// Example: newrelic-dashboards://guid/MjUyMDUyOXxWSVp8REFTSEJPQVJEfGRhOjE5MzYzMDI
const NEW_RELIC_DASHBOARDS_GUID_URI_PATTERN =
	/^newrelic-dashboards:\/\/guid\/(.+)$/;

/**
 * Parse a New Relic dashboards resource URI
 * @param uri The URI to parse
 * @returns The parsed URI components or null if the URI is invalid
 */
export function parseNewRelicDashboardsUri(
	uri: string,
): { serviceName?: string; guid?: string } | null {
	// Try to match service URI pattern
	const serviceMatch = uri.match(NEW_RELIC_DASHBOARDS_SERVICE_URI_PATTERN);
	if (serviceMatch) {
		const [, serviceName] = serviceMatch;
		return {
			serviceName,
		};
	}

	// Try to match GUID URI pattern
	const guidMatch = uri.match(NEW_RELIC_DASHBOARDS_GUID_URI_PATTERN);
	if (guidMatch) {
		const [, guid] = guidMatch;
		return {
			guid,
		};
	}

	return null;
}

/**
 * Get the list of available New Relic dashboards resources
 * @returns The list of available resources
 */
export async function listNewRelicDashboardsResources() {
	return {
		resources: [],
		resourceTemplates: [
			{
				uriTemplate: "newrelic-dashboards://service/{serviceName}",
				name: "New Relic Dashboards by Service",
				description: "Dashboards related to a specific service",
				mimeType: "application/json",
			},
			{
				uriTemplate: "newrelic-dashboards://guid/{guid}",
				name: "New Relic Dashboard Queries by GUID",
				description: "NRQL queries from a dashboard identified by GUID",
				mimeType: "application/json",
			},
		],
	};
}

/**
 * Read New Relic dashboards resource content
 * @param uri The URI of the resource to read
 * @returns The resource content
 */
/**
 * Read New Relic dashboards by service name
 * @param uri The URI of the resource to read
 * @param serviceName The service name to query dashboards for
 * @param dashboardsService The dashboards service instance
 * @returns The resource content
 */
async function readNewRelicDashboardsByService(
	uri: string,
	serviceName: string,
	dashboardsService: NewRelicDashboardsService,
) {
	// Execute the query for service dashboards
	const result = await dashboardsService.queryDashboards({
		serviceName,
	});

	defaultLogger.info(
		`Retrieved ${result.dashboards.length} dashboards for service ${serviceName}`,
	);

	// Return the resource content
	return {
		contents: [
			{
				uri,
				mimeType: "application/json",
				text: JSON.stringify(
					{
						dashboards: result.dashboards,
						metadata: result.metadata,
					},
					null,
					2,
				),
			},
		],
	};
}

/**
 * Read New Relic dashboard queries by dashboard GUID
 * @param uri The URI of the resource to read
 * @param guid The dashboard GUID
 * @param dashboardsService The dashboards service instance
 * @returns The resource content
 */
async function readNewRelicDashboardsByGuid(
	uri: string,
	guid: string,
	dashboardsService: NewRelicDashboardsService,
) {
	// Execute the query for dashboard details by GUID
	const dashboardDetails = await dashboardsService.getDashboardDetails(guid);

	// Extract NRQL queries from the dashboard with simplified output
	const nrqlQueries: Array<{
		widgetName: string;
		query: string;
	}> = [];

	// Process each page and widget to extract NRQL queries
	for (const page of dashboardDetails.pages) {
		for (const widget of page.widgets) {
			if (
				widget.rawConfiguration.nrqlQueries &&
				Array.isArray(widget.rawConfiguration.nrqlQueries)
			) {
				for (const nrqlQuery of widget.rawConfiguration.nrqlQueries) {
					nrqlQueries.push({
						widgetName: widget.title,
						query: nrqlQuery.query,
					});
				}
			}
		}
	}

	defaultLogger.info(
		`Retrieved ${nrqlQueries.length} NRQL queries from dashboard ${dashboardDetails.name} (${guid})`,
	);

	// Return the resource content with simplified structure
	return {
		contents: [
			{
				uri,
				mimeType: "application/json",
				text: JSON.stringify(
					{
						queries: nrqlQueries,
						totalQueries: nrqlQueries.length,
					},
					null,
					2,
				),
			},
		],
	};
}

/**
 * Read New Relic dashboards resource content
 * @param uri The URI of the resource to read
 * @returns The resource content
 */
export async function readNewRelicDashboardsResource(uri: string) {
	try {
		defaultLogger.info(`Reading New Relic dashboards resource: ${uri}`);

		// Parse the URI
		const parsedUri = parseNewRelicDashboardsUri(uri);
		if (!parsedUri) {
			throw new Error(`Invalid New Relic dashboards resource URI: ${uri}`);
		}

		// Get the dashboards service from the container
		const dashboardsService = defaultContainer.get(
			NewRelicDashboardsService as unknown as Constructor<NewRelicDashboardsService>,
		) as NewRelicDashboardsService;

		// Handle different URI patterns
		if (parsedUri.serviceName) {
			return await readNewRelicDashboardsByService(
				uri,
				parsedUri.serviceName,
				dashboardsService,
			);
		}

		if (parsedUri.guid) {
			return await readNewRelicDashboardsByGuid(
				uri,
				parsedUri.guid,
				dashboardsService,
			);
		}

		throw new Error(`Invalid New Relic dashboards resource URI format: ${uri}`);
	} catch (error) {
		defaultLogger.error(
			`Failed to read New Relic dashboards resource: ${uri}`,
			error,
		);
		throw error;
	}
}

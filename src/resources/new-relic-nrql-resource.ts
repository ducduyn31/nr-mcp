import {
	defaultLogger,
	defaultContainer,
	type Constructor,
} from "../utils/index.js";
import {
	NewRelicNrqlService,
	type ServiceNrqlQueryResult,
} from "../services/new-relic-nrql-service.js";
import type { ResourceTemplate } from "./index.js";

/**
 * URI patterns for New Relic NRQL resource templates
 */
// Format: newrelic-nrql://service/{serviceName}
// Example: newrelic-nrql://service/order-service
const NEW_RELIC_NRQL_SERVICE_URI_PATTERN = /^newrelic-nrql:\/\/service\/(.+)$/;

/**
 * Parse a New Relic NRQL resource URI
 * @param uri The URI to parse
 * @returns The parsed URI components or null if the URI is invalid
 */
export function parseNewRelicNrqlUri(
	uri: string,
): { serviceName?: string } | null {
	// Try to match service URI pattern
	const serviceMatch = uri.match(NEW_RELIC_NRQL_SERVICE_URI_PATTERN);
	if (serviceMatch) {
		const [, serviceName] = serviceMatch;
		return {
			serviceName,
		};
	}

	return null;
}

/**
 * Get the list of available New Relic NRQL resources
 * @returns The list of available resources
 */
export async function listNewRelicNrqlResources() {
	return {
		resources: [],
		resourceTemplates: [
			{
				uriTemplate: "newrelic-nrql://service/{serviceName}",
				name: "New Relic NRQLs by Service",
				description: "All NRQL queries related to a specific service",
				mimeType: "application/json",
			},
		],
	};
}

/**
 * Read New Relic NRQLs by service name
 * @param uri The URI of the resource to read
 * @param serviceName The service name to query NRQLs for
 * @param nrqlService The NRQL service instance
 * @returns The resource content
 */
async function readNewRelicNrqlsByService(
	uri: string,
	serviceName: string,
	nrqlService: NewRelicNrqlService,
) {
	// Execute the query for service NRQLs
	const result = await nrqlService.queryNrqlsByService({
		serviceName,
	});

	defaultLogger.info(
		`Retrieved ${result.queries.length} NRQL queries for service ${serviceName}`,
	);

	// Return the resource content
	return {
		contents: [
			{
				uri,
				mimeType: "application/json",
				text: JSON.stringify(
					{
						queries: result.queries,
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
 * Read New Relic NRQL resource content
 * @param uri The URI of the resource to read
 * @returns The resource content
 */
export async function readNewRelicNrqlResource(uri: string) {
	try {
		defaultLogger.info(`Reading New Relic NRQL resource: ${uri}`);

		// Parse the URI
		const parsedUri = parseNewRelicNrqlUri(uri);
		if (!parsedUri) {
			throw new Error(`Invalid New Relic NRQL resource URI: ${uri}`);
		}

		// Get the NRQL service from the container
		const nrqlService = defaultContainer.get(
			NewRelicNrqlService as unknown as Constructor<NewRelicNrqlService>,
		) as NewRelicNrqlService;

		// Handle different URI patterns
		if (parsedUri.serviceName) {
			return await readNewRelicNrqlsByService(
				uri,
				parsedUri.serviceName,
				nrqlService,
			);
		}

		throw new Error(`Invalid New Relic NRQL resource URI format: ${uri}`);
	} catch (error) {
		defaultLogger.error(
			`Failed to read New Relic NRQL resource: ${uri}`,
			error,
		);
		throw error;
	}
}

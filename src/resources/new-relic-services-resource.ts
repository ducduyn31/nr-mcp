import {
	defaultLogger,
	defaultContainer,
	type Constructor,
} from "../utils/index.js";
import {
	NewRelicTagsService,
	type TagsQueryResult,
	type TagsQueryOptions,
	type Environment,
} from "../services/new-relic-tags-service.js";

/**
 * URI pattern for New Relic services resources
 * Format: newrelic-services://[environment]
 * Examples:
 * - newrelic-services://all
 * - newrelic-services://prod
 * - newrelic-services://staging
 */
const NEW_RELIC_SERVICES_URI_PATTERN =
	/^newrelic-services:\/\/(all|prod|staging)$/;

/**
 * Parse a New Relic tags resource URI
 * @param uri The URI to parse
 * @returns The parsed URI components or null if the URI is invalid
 */
export function parseNewRelicServicesUri(
	uri: string,
): { environment: "all" | Environment } | null {
	const match = uri.match(NEW_RELIC_SERVICES_URI_PATTERN);
	if (!match) {
		return null;
	}

	const [, environment] = match;
	return {
		environment: environment as "all" | Environment,
	};
}

/**
 * Get the list of available New Relic tags resources
 * @returns The list of available resources
 */
export async function listNewRelicServicesResources() {
	return {
		resources: [
			{
				uri: "newrelic-services://all",
				name: "All New Relic Services",
				description:
					"All services from both production and staging environments",
				mimeType: "application/json",
			},
			{
				uri: "newrelic-services://prod",
				name: "Production New Relic Services",
				description: "Services from the production environment",
				mimeType: "application/json",
			},
			{
				uri: "newrelic-services://staging",
				name: "Staging New Relic Services",
				description: "Services from the staging environment",
				mimeType: "application/json",
			},
		],
		resourceTemplates: [],
	};
}

/**
 * Read New Relic tags resource content
 * @param uri The URI of the resource to read
 * @returns The resource content
 */
export async function readNewRelicServicesResource(uri: string) {
	try {
		defaultLogger.info(`Reading New Relic services resource: ${uri}`);

		// Parse the URI
		const parsedUri = parseNewRelicServicesUri(uri);
		if (!parsedUri) {
			throw new Error(`Invalid New Relic services resource URI: ${uri}`);
		}

		// Get the tags service from the container
		const tagsService = defaultContainer.get(
			NewRelicTagsService as unknown as Constructor<NewRelicTagsService>,
		) as NewRelicTagsService;

		// Build query options
		const queryOptions: TagsQueryOptions = {};

		// Only set environment filter if not "all"
		if (parsedUri.environment !== "all") {
			queryOptions.environment = parsedUri.environment;
		}

		// Execute the query
		const result = await tagsService.queryTags(queryOptions);

		defaultLogger.info(
			`Retrieved ${result.tags.length} services for resource ${uri}`,
		);

		// Return the resource content with tags renamed to services
		return {
			contents: [
				{
					uri,
					mimeType: "application/json",
					text: JSON.stringify(
						{
							services: result.tags,
							metadata: result.metadata,
						},
						null,
						2,
					),
				},
			],
		};
	} catch (error) {
		defaultLogger.error(
			`Failed to read New Relic services resource: ${uri}`,
			error,
		);
		throw error;
	}
}

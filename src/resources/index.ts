import { defaultLogger } from "../utils/logger/index.js";
import {
	listNewRelicLogsResources,
	readNewRelicLogsResource,
} from "./new-relic-logs-resource.js";
import {
	listNewRelicServicesResources,
	readNewRelicServicesResource,
} from "./new-relic-services-resource.js";
import {
	listNewRelicDashboardsResources,
	readNewRelicDashboardsResource,
} from "./new-relic-dashboards-resource.js";
import {
	listNewRelicNrqlResources,
	readNewRelicNrqlResource,
} from "./new-relic-nrql-resource.js";
import {
	listNewRelicSchemaResources,
	readNewRelicSchemaResource,
} from "./new-relic-schema-resource.js";

// Export all resource functions for direct use
export * from "./new-relic-logs-resource.js";
export * from "./new-relic-services-resource.js";
export * from "./new-relic-dashboards-resource.js";
export * from "./new-relic-nrql-resource.js";
export * from "./new-relic-schema-resource.js";

/**
 * Interface for resource template
 */
export interface ResourceTemplate {
	uriTemplate: string;
	name: string;
	description: string;
	mimeType: string;
}

/**
 * Interface for direct resource
 */
export interface DirectResource {
	uri: string;
	name: string;
	description: string;
	mimeType: string;
}

/**
 * Interface for resource content
 */
export interface ResourceContent {
	uri: string;
	mimeType: string;
	text?: string;
	blob?: string;
}

/**
 * Interface for resource registry entry
 */
export interface ResourceRegistryEntry {
	uriPattern: RegExp;
	listResources: () => Promise<{
		resources: ResourceContent[];
		resourceTemplates: ResourceTemplate[];
	}>;
	readResource: (
		uri: string,
		options?: Record<string, unknown>,
	) => Promise<{
		contents: ResourceContent[];
	}>;
}

/**
 * Central registry of all available resources
 */
const resourceRegistry: ResourceRegistryEntry[] = [
	// New Relic Logs Resource
	{
		uriPattern: /^newrelic-logs:\/\/.+/,
		listResources: listNewRelicLogsResources,
		readResource: readNewRelicLogsResource,
	},
	// New Relic Services Resource
	{
		uriPattern: /^newrelic-services:\/\/.+/,
		listResources: listNewRelicServicesResources,
		readResource: readNewRelicServicesResource,
	},
	// New Relic Dashboards Resource
	{
		uriPattern: /^newrelic-dashboards:\/\/.+/,
		listResources: listNewRelicDashboardsResources,
		readResource: readNewRelicDashboardsResource,
	},
	// New Relic NRQL Resource
	{
		uriPattern: /^newrelic-nrql:\/\/.+/,
		listResources: listNewRelicNrqlResources,
		readResource: readNewRelicNrqlResource,
	},
	// New Relic Schema Resource
	{
		uriPattern: /^newrelic-schema:\/\/.+/,
		listResources: listNewRelicSchemaResources,
		readResource: readNewRelicSchemaResource,
	},
];

/**
 * List all available resources across all registered resource types
 * @returns Combined list of all resources
 */
export async function listAllResources() {
	defaultLogger.info("Listing all available resources");
	let allResources: ResourceContent[] = [];

	// Collect resources from all registered resource types
	for (const entry of resourceRegistry) {
		try {
			const result = await entry.listResources();
			allResources = [...allResources, ...(result.resources || [])];
		} catch (error) {
			defaultLogger.error("Error listing resources", error);
		}
	}

	return {
		resources: allResources,
	};
}

/**
 * List all available resource templates across all registered resource types
 * @returns Combined list of all resource templates
 */
export async function listAllResourceTemplates() {
	defaultLogger.info("Listing all available resource templates");
	let allResourceTemplates: ResourceTemplate[] = [];

	// Collect resources from all registered resource types
	for (const entry of resourceRegistry) {
		try {
			const result = await entry.listResources();
			allResourceTemplates = [
				...allResourceTemplates,
				...(result.resourceTemplates || []),
			];
		} catch (error) {
			defaultLogger.error("Error listing resources", error);
		}
	}

	return {
		resourceTemplates: allResourceTemplates,
	};
}

/**
 * Read a resource by URI
 * @param uri The URI of the resource to read
 * @param options Additional options for reading the resource
 * @returns The resource content
 * @throws Error if the resource URI is not supported
 */
export async function readResource(
	uri: string,
	options?: Record<string, unknown>,
) {
	defaultLogger.info(`Reading resource: ${uri}`);

	// Find the appropriate resource handler
	for (const entry of resourceRegistry) {
		if (entry.uriPattern.test(uri)) {
			return await entry.readResource(uri, options);
		}
	}

	throw new Error(`Unsupported resource URI: ${uri}`);
}

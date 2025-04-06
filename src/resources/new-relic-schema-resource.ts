import {
	defaultLogger,
	defaultContainer,
	type Constructor,
} from "../utils/index.js";
import { NewRelicSchemaService } from "../services/new-relic-schema-service.js";

/**
 * URI patterns for New Relic Schema resource templates
 */
// Format: newrelic-schema://table/{tableName}
// Example: newrelic-schema://table/Transaction
const NEW_RELIC_SCHEMA_TABLE_URI_PATTERN = /^newrelic-schema:\/\/table\/(.+)$/;

// Format: newrelic-schema://list
// Example: newrelic-schema://list
const NEW_RELIC_SCHEMA_LIST_URI_PATTERN = /^newrelic-schema:\/\/list$/;

/**
 * Parse a New Relic Schema resource URI
 * @param uri The URI to parse
 * @returns The parsed URI components or null if the URI is invalid
 */
export function parseNewRelicSchemaUri(
	uri: string,
): { tableName?: string; isList?: boolean } | null {
	// Try to match table URI pattern
	const tableMatch = uri.match(NEW_RELIC_SCHEMA_TABLE_URI_PATTERN);
	if (tableMatch) {
		const [, tableName] = tableMatch;
		return {
			tableName,
			isList: false,
		};
	}

	// Try to match list URI pattern
	const listMatch = uri.match(NEW_RELIC_SCHEMA_LIST_URI_PATTERN);
	if (listMatch) {
		return {
			isList: true,
		};
	}

	return null;
}

/**
 * Get the list of available New Relic Schema resources
 * @returns The list of available resources
 */
export async function listNewRelicSchemaResources() {
	return {
		resources: [
			{
				uri: "newrelic-schema://list",
				name: "New Relic Schema List",
				description: "All known New Relic table schemas",
				mimeType: "application/json",
			},
        ],
		resourceTemplates: [
			{
				uriTemplate: "newrelic-schema://table/{tableName}",
				name: "New Relic Table Schema",
				description: "Schema for a specific New Relic table",
				mimeType: "application/json",
			},
		],
	};
}

/**
 * Read New Relic table schema
 * @param uri The URI of the resource to read
 * @param tableName The table name to get schema for
 * @param schemaService The schema service instance
 * @returns The resource content
 */
async function readNewRelicTableSchema(
	uri: string,
	tableName: string,
	schemaService: NewRelicSchemaService,
) {
	// Get the schema for the table
	const schema = await schemaService.getTableSchema(tableName);

	defaultLogger.info(
		`Retrieved schema for table ${tableName}: ${schema.length} columns`,
	);

	// Return the resource content
	return {
		contents: [
			{
				uri,
				mimeType: "application/json",
				text: JSON.stringify(
					{
						tableName,
						schema,
						columnCount: schema.length,
					},
					null,
					2,
				),
			},
		],
	};
}

/**
 * Read New Relic schema list
 * @param uri The URI of the resource to read
 * @param schemaService The schema service instance
 * @returns The resource content
 */
async function readNewRelicSchemaList(
	uri: string,
	schemaService: NewRelicSchemaService,
) {
	// Get cache statistics
	const cacheStats = schemaService.getCacheStats();

    defaultLogger.info(
        `Retrieved all cached schemas: ${cacheStats.totalCachedSchemas} tables`,
    );

	// Return the resource content
	return {
		contents: [
			{
				uri,
				mimeType: "application/json",
				text: JSON.stringify(
					{
						totalSchemas:  cacheStats.totalCachedSchemas,
						tables: cacheStats.cachedTables.map((table) => table.tableName),
					},
					null,
					2,
				),
			},
		],
	};
}

/**
 * Read New Relic Schema resource content
 * @param uri The URI of the resource to read
 * @returns The resource content
 */
export async function readNewRelicSchemaResource(uri: string) {
	try {
		defaultLogger.info(`Reading New Relic Schema resource: ${uri}`);

		// Parse the URI
		const parsedUri = parseNewRelicSchemaUri(uri);
		if (!parsedUri) {
			throw new Error(`Invalid New Relic Schema resource URI: ${uri}`);
		}

		// Get the schema service from the container
		const schemaService = defaultContainer.get(
			NewRelicSchemaService as unknown as Constructor<NewRelicSchemaService>,
		) as NewRelicSchemaService;

		// Handle different URI patterns
		if (parsedUri.isList) {
			return await readNewRelicSchemaList(
				uri,
				schemaService,
			);
		}

        // If tableName is present, read the schema for that table
        if (parsedUri.tableName) {
			return await readNewRelicTableSchema(
				uri,
				parsedUri.tableName,
				schemaService,
			);
		}

		throw new Error(`Invalid New Relic Schema resource URI format: ${uri}`);
	} catch (error) {
		defaultLogger.error(
			`Failed to read New Relic Schema resource: ${uri}`,
			error,
		);
		throw error;
	}
}

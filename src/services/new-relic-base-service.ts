import { GraphQLClient } from "graphql-request";
import { defaultLogger } from "../utils/logger/index.js";

/**
 * Configuration for New Relic API services
 */
export interface NewRelicApiConfig {
	/**
	 * New Relic API key
	 */
	apiKey: string;

	/**
	 * New Relic account ID
	 */
	accountId: string;

	/**
	 * New Relic region (defaults to US)
	 */
	region?: "US" | "EU";
}

/**
 * Base class for New Relic API services
 */
export abstract class NewRelicBaseService {
	protected readonly apiKey: string;
	protected readonly accountId: string;
	protected readonly graphQLClient: GraphQLClient;

	/**
	 * Creates a new New Relic API service
	 * @param config New Relic API configuration
	 */
	constructor(config: NewRelicApiConfig) {
		this.apiKey = config.apiKey;
		this.accountId = config.accountId;

		// Determine the NerdGraph URL based on the region
		const nerdGraphUrl =
			config.region === "EU"
				? "https://api.eu.newrelic.com/graphql"
				: "https://api.newrelic.com/graphql";

		// Create GraphQL client
		this.graphQLClient = new GraphQLClient(nerdGraphUrl, {
			headers: {
				"Content-Type": "application/json",
				"API-Key": this.apiKey,
			},
		});

		defaultLogger.info(
			`Initialized New Relic API service for account ${this.accountId}`,
		);
	}

	/**
	 * Executes a GraphQL query against the New Relic NerdGraph API
	 * @param query GraphQL query
	 * @param variables Query variables
	 * @returns Query result
	 */
	protected async executeNerdGraphQuery<T = unknown>(
		query: string,
		variables?: Record<string, unknown>,
	): Promise<T> {
		try {
			// Check if this is a NRQL query by examining variables
			if (
				variables &&
				"query" in variables &&
				typeof variables.query === "string"
			) {
				const nrqlQuery = variables.query as string;
				defaultLogger.info(`Executing NerdGraph query with NRQL: ${nrqlQuery}`);
			} else {
				defaultLogger.info("Executing NerdGraph query");
			}

			const result = await this.graphQLClient.request<T>(query, variables);
			return result;
		} catch (error) {
			defaultLogger.error("Failed to execute NerdGraph query", error);
			throw error;
		}
	}
}

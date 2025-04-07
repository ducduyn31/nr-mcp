import { NewRelicBaseService } from "./new-relic-base-service.js";
import type { NewRelicApiConfig } from "./new-relic-base-service.js";
import { defaultLogger } from "../utils/logger/index.js";

/**
 * Valid environment values
 */
export type Environment = "prod" | "staging";

/**
 * Interface for parsed tag information
 */
export interface ParsedTag {
	originalTag: string;
	environment: Environment;
	serviceName: string;
}

/**
 * Interface for tags query result
 */
export interface TagsQueryResult {
	tags: ParsedTag[];
	metadata: {
		totalCount: number;
		elapsedTime: number;
	};
}

/**
 * Options for querying tags
 */
export interface TagsQueryOptions {
	/**
	 * Environment to filter tags by (either 'prod' or 'staging')
	 */
	environment?: Environment;
}

/**
 * Service for querying New Relic tags
 */
export class NewRelicTagsService extends NewRelicBaseService {
	/**
	 * Creates a new NewRelicTagsService instance
	 * @param config New Relic API configuration
	 */
	constructor(config: NewRelicApiConfig) {
		super(config);
		defaultLogger.info("Initialized New Relic Tags Service");
	}

	/**
	 * Parse a tag string into its components
	 * @param tag The tag string to parse
	 * @returns The parsed tag or null if the tag doesn't match the expected format
	 */
	private parseTag(tag: string): ParsedTag | null {
		// Check if the tag starts with "newrelic."
		if (!tag.startsWith("newrelic.")) {
			return null;
		}

		// Remove the "newrelic." prefix
		const value = tag.substring("newrelic.".length);

		// Check if the value starts with "prod-" or "staging-"
		if (value.startsWith("prod-")) {
			return {
				originalTag: tag,
				environment: "prod",
				serviceName: value.substring("prod-".length),
			};
		}

		if (value.startsWith("staging-")) {
			return {
				originalTag: tag,
				environment: "staging",
				serviceName: value.substring("staging-".length),
			};
		}

		// If the tag doesn't match the expected format, return null
		return null;
	}

	/**
	 * Query all unique tags
	 * @param options Query options
	 * @returns Tags query result
	 */
	async queryTags(options: TagsQueryOptions = {}): Promise<TagsQueryResult> {
		try {
			defaultLogger.info("Querying New Relic tags");
			const startTime = Date.now();

			// Build the NRQL query to fetch all unique tags
			const nrqlQuery = "FROM Log SELECT uniques(tag) LIMIT MAX";
			defaultLogger.info(`Executing NRQL query: ${nrqlQuery}`);

			// Execute the query via NerdGraph
			const nerdGraphQuery = `
        query TagsQuery($accountId: Int!, $query: Nrql!) {
          actor {
            account(id: $accountId) {
              nrql(query: $query) {
                results
              }
            }
          }
        }
      `;

			const variables = {
				accountId: Number.parseInt(this.accountId, 10),
				query: nrqlQuery,
			};

			const result = await this.executeNerdGraphQuery<{
				actor: {
					account: {
						nrql: {
							results: Array<{
								"uniques.tag": string[];
							}>;
						};
					};
				};
			}>(nerdGraphQuery, variables);

			// Extract tags from the result
			let rawTags: string[] = [];
			if (result.actor.account.nrql.results.length > 0) {
				rawTags = result.actor.account.nrql.results[0]["uniques.tag"] || [];
			}

			// Parse the tags and filter out any that don't match the expected format
			let parsedTags: ParsedTag[] = [];
			for (const rawTag of rawTags) {
				const parsedTag = this.parseTag(rawTag);
				if (parsedTag) {
					parsedTags.push(parsedTag);
				}
			}

			// Apply environment filter if provided
			if (options.environment) {
				parsedTags = parsedTags.filter(
					(tag) => tag.environment === options.environment,
				);
			}

			const elapsedTime = Date.now() - startTime;

			defaultLogger.info(
				`Retrieved ${parsedTags.length} valid tags in ${elapsedTime}ms`,
			);

			return {
				tags: parsedTags,
				metadata: {
					totalCount: parsedTags.length,
					elapsedTime,
				},
			};
		} catch (error) {
			defaultLogger.error("Failed to query tags", error);
			throw error;
		}
	}
}

import { NewRelicBaseService } from "./new-relic-base-service.js";
import type { NewRelicApiConfig } from "./new-relic-base-service.js";
import { defaultLogger } from "../utils/logger/index.js";

/**
 * Interface for dashboard information
 */
export interface Dashboard {
  guid: string;
  name: string;
}

/**
 * Interface for dashboard query result
 */
export interface DashboardsQueryResult {
  dashboards: Dashboard[];
  metadata: {
    totalCount: number;
    elapsedTime: number;
  };
}

/**
 * Options for querying dashboards
 */
export interface DashboardsQueryOptions {
  /**
   * Service name to filter dashboards by
   */
  serviceName: string;
}

/**
 * Service for querying New Relic dashboards
 */
export class NewRelicDashboardsService extends NewRelicBaseService {
  /**
   * Creates a new NewRelicDashboardsService instance
   * @param config New Relic API configuration
   */
  constructor(config: NewRelicApiConfig) {
    super(config);
    defaultLogger.info("Initialized New Relic Dashboards Service");
  }

  /**
   * Query dashboards for a specific service
   * @param options Query options with service name
   * @returns Dashboards query result
   */
  async queryDashboards(options: DashboardsQueryOptions): Promise<DashboardsQueryResult> {
    try {
      defaultLogger.info(`Querying New Relic dashboards for service: ${options.serviceName}`);
      const startTime = Date.now();

      // Build the query string to search for dashboards related to the service
      const searchQuery = `name LIKE '${options.serviceName}' AND type='DASHBOARD'`;

      // Build the NerdGraph query to fetch dashboards using entitySearch
      const nerdGraphQuery = `
        query GetDashboards($searchQuery: String!) {
          actor {
            entitySearch(query: $searchQuery) {
              results {
                entities {
                  guid
                  name
                }
              }
            }
          }
        }
      `;

      const variables = {
        searchQuery
      };

      const result = await this.executeNerdGraphQuery<{
        actor: {
          entitySearch: {
            results: {
              entities: Array<{
                guid: string;
                name: string;
              }>;
            };
          };
        };
      }>(nerdGraphQuery, variables);

      // Extract dashboards from the result
      const dashboards = result.actor.entitySearch.results.entities.map(entity => ({
        guid: entity.guid,
        name: entity.name
      }));

      const elapsedTime = Date.now() - startTime;
      
      defaultLogger.info(
        `Retrieved ${dashboards.length} dashboards for service ${options.serviceName} in ${elapsedTime}ms`
      );

      return {
        dashboards,
        metadata: {
          totalCount: dashboards.length,
          elapsedTime,
        },
      };
    } catch (error) {
      defaultLogger.error(`Failed to query dashboards for service: ${options.serviceName}`, error);
      throw error;
    }
  }
}
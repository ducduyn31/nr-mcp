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
 * URI pattern for New Relic dashboards resource template
 * Format: newrelic-dashboards://service/{serviceName}
 * Example: newrelic-dashboards://service/order-service
 */
const NEW_RELIC_DASHBOARDS_URI_PATTERN = /^newrelic-dashboards:\/\/service\/(.+)$/;

/**
 * Parse a New Relic dashboards resource URI
 * @param uri The URI to parse
 * @returns The parsed URI components or null if the URI is invalid
 */
export function parseNewRelicDashboardsUri(
  uri: string,
): { serviceName: string } | null {
  const match = uri.match(NEW_RELIC_DASHBOARDS_URI_PATTERN);
  if (!match) {
    return null;
  }

  const [, serviceName] = match;
  return {
    serviceName,
  };
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

    // Execute the query
    const result = await dashboardsService.queryDashboards({
      serviceName: parsedUri.serviceName,
    });

    defaultLogger.info(
      `Retrieved ${result.dashboards.length} dashboards for service ${parsedUri.serviceName}`,
    );

    // Return the resource content
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            dashboards: result.dashboards,
            metadata: result.metadata
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    defaultLogger.error(
      `Failed to read New Relic dashboards resource: ${uri}`,
      error,
    );
    throw error;
  }
}
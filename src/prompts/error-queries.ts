/**
 * Error Queries
 *
 * This file contains a collection of useful NRQL queries for exploring and analyzing errors
 * in New Relic, along with detailed descriptions of each query and its variables.
 */

export interface NrqlQuery {
  /**
   * The NRQL query string with placeholders for variables
   */
  query: string;
  
  /**
   * A description of what the query does and when to use it
   */
  description: string;
  
  /**
   * Descriptions of the variables used in the query
   */
  variables: {
    [key: string]: string;
  };
  
  /**
   * How to interpret the results of this query
   */
  interpretation: string;
}

/**
 * A collection of NRQL queries for exploring errors
 */
export const errorQueries: Record<string, NrqlQuery> = {
  // Error logs query
  "errorLogs": {
    query: "SELECT `tag`,`message`,`userAgent`,`component` FROM Log WHERE `svc` = '${serviceName}' AND `env` = '${environment}' AND `responseCode` >= 500 SINCE ${timeframe} AGO",
    description: "Shows the error logs with details like tag, message, userAgent, and component. This is useful to identify errors and can be used to get the trace and visualize the errors.",
    variables: {
      "serviceName": "The name of the service to analyze errors for (specified by the 'svc' attribute)",
      "environment": "The environment to analyze (specified by the 'env' attribute, e.g., 'prod', 'dev', 'staging')",
      "timeframe": "The time period to analyze (e.g., '1 hour', '1 day', '7 days')"
    },
    interpretation: "Results show detailed error logs with HTTP 500+ status codes. Examine the message field for error details, tag for categorization, userAgent to identify client types, and component to pinpoint which part of the service is failing."
  },
};

/**
 * Returns a specific error query by its key
 * @param queryKey The key of the query to retrieve
 * @returns The NRQL query object or undefined if not found
 */
export function getErrorQuery(queryKey: string): NrqlQuery | undefined {
  return errorQueries[queryKey];
}

/**
 * Returns all error queries
 * @returns Record of all error queries
 */
export function getAllErrorQueries(): Record<string, NrqlQuery> {
  return errorQueries;
}
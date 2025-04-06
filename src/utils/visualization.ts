/**
 * Visualization utilities for New Relic data
 * 
 * This module provides functions to convert New Relic NRQL query results
 * into various visualization formats like Mermaid charts.
 */

import type { NrqlQueryResult } from "../services/new-relic-nrql-service.js";

/**
 * Interface for time series data point
 */
interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
  facet?: string;
}

/**
 * Options for generating Mermaid charts
 */
export interface MermaidChartOptions {
  title: string;
  yAxisLabel: string;
  yMin?: number;
  yMax?: number;
  decimalPlaces?: number;
  timeFormat?: 'hour' | 'day' | 'auto';
}

/**
 * Extract time series data from NRQL query results
 * @param result NRQL query result
 * @param valueKey The key to extract values from
 * @returns Array of time series data points
 */
export function extractTimeSeriesData(
  result: NrqlQueryResult,
  valueKey: string
): TimeSeriesDataPoint[] {
  const dataPoints: TimeSeriesDataPoint[] = [];

  for (const point of result.results) {
    // Check if this is a time series result with beginTimeSeconds
    if ('beginTimeSeconds' in point && valueKey in point) {
      dataPoints.push({
        timestamp: Number(point.beginTimeSeconds) * 1000, // Convert to milliseconds
        value: Number(point[valueKey]),
        facet: point.facet as string | undefined
      });
    }
  }

  return dataPoints.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Format timestamp for display in charts
 * @param timestamp Timestamp in milliseconds
 * @param format Time format (hour, day, or auto)
 * @returns Formatted time string
 */
function formatTimestamp(timestamp: number, format: 'hour' | 'day' | 'auto' = 'auto'): string {
  const date = new Date(timestamp);
  
  if (format === 'hour' || (format === 'auto' && date.getHours() !== 0)) {
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Generate a Mermaid line chart from time series data
 * @param data Time series data points
 * @param options Chart options
 * @returns Mermaid chart definition
 */
export function generateMermaidLineChart(
  data: TimeSeriesDataPoint[],
  options: MermaidChartOptions
): string {
  if (data.length === 0) {
    return `xychart-beta
    title "${options.title} (No Data)"
    x-axis "Time"
    y-axis "${options.yAxisLabel}" 0 --> 100
    line [0]`;
  }

  // Group data by facet if present
  const facetGroups: Record<string, TimeSeriesDataPoint[]> = {};
  
  for (const point of data) {
    const facet = point.facet || 'default';
    if (!facetGroups[facet]) {
      facetGroups[facet] = [];
    }
    facetGroups[facet].push(point);
  }

  // Format x-axis labels (timestamps)
  const xLabels = [...new Set(data.map(d => d.timestamp))]
    .sort((a, b) => a - b)
    .map(t => formatTimestamp(t, options.timeFormat));

  // Calculate y-axis range
  const values = data.map(d => d.value);
  const yMin = options.yMin !== undefined ? options.yMin : Math.floor(Math.min(...values) * 0.9);
  const yMax = options.yMax !== undefined ? options.yMax : Math.ceil(Math.max(...values) * 1.1);
  
  // Format decimal places
  const decimalPlaces = options.decimalPlaces !== undefined ? options.decimalPlaces : 2;

  // Build the chart
  let chart = `xychart-beta
    title "${options.title}"
    x-axis [${xLabels.map(l => `"${l}"`).join(', ')}]
    y-axis "${options.yAxisLabel}" ${yMin} --> ${yMax}
`;

  // Add lines for each facet
  const facets = Object.keys(facetGroups);
  
  if (facets.length === 1 && facets[0] === 'default') {
    // Single line chart
    const values = data.map(d => d.value.toFixed(decimalPlaces));
    chart += `    line [${values.join(', ')}]`;
  } else {
    // Multi-line chart with facets
    for (const facet of facets) {
      const facetData = facetGroups[facet].sort((a, b) => a.timestamp - b.timestamp);
      const values = facetData.map(d => d.value.toFixed(decimalPlaces));
      chart += `    line [${values.join(', ')}] "${facet}"\n`;
    }
  }

  return chart;
}

/**
 * Generate a Mermaid bar chart from data
 * @param labels Bar labels
 * @param values Bar values
 * @param options Chart options
 * @returns Mermaid chart definition
 */
export function generateMermaidBarChart(
  labels: string[],
  values: number[],
  options: MermaidChartOptions
): string {
  if (values.length === 0) {
    return `xychart-beta
    title "${options.title} (No Data)"
    x-axis "Categories"
    y-axis "${options.yAxisLabel}" 0 --> 100
    bar [0]`;
  }

  // Calculate y-axis range
  const yMin = options.yMin !== undefined ? options.yMin : 0;
  const yMax = options.yMax !== undefined ? options.yMax : Math.ceil(Math.max(...values) * 1.1);
  
  // Format decimal places
  const decimalPlaces = options.decimalPlaces !== undefined ? options.decimalPlaces : 2;

  // Format values
  const formattedValues = values.map(v => v.toFixed(decimalPlaces));

  return `xychart-beta
    title "${options.title}"
    x-axis [${labels.map(l => `"${l}"`).join(', ')}]
    y-axis "${options.yAxisLabel}" ${yMin} --> ${yMax}
    bar [${formattedValues.join(', ')}]`;
}

/**
 * Format NRQL query results as a Mermaid chart
 * @param result NRQL query result
 * @param valueKey The key to extract values from
 * @param options Chart options
 * @returns Mermaid chart definition
 */
export function formatNrqlResultAsMermaidChart(
  result: NrqlQueryResult,
  valueKey: string,
  options: MermaidChartOptions
): string {
  // Check if this is time series data
  const isTimeSeries = result.results.some(r => 'beginTimeSeconds' in r);
  
  if (isTimeSeries) {
    const timeSeriesData = extractTimeSeriesData(result, valueKey);
    return generateMermaidLineChart(timeSeriesData, options);
  }
  
  // For non-time series data, create a bar chart
  const labels: string[] = [];
  const values: number[] = [];
  
  for (const point of result.results) {
    if (valueKey in point) {
      // Use the first string property as label, or index if none found
      const labelKey = Object.keys(point).find(k => typeof point[k] === 'string') || 'index';
      const label = typeof point[labelKey] === 'string' ? point[labelKey] as string : String(labels.length);
      
      labels.push(label);
      values.push(Number(point[valueKey]));
    }
  }
  
  return generateMermaidBarChart(labels, values, options);
}
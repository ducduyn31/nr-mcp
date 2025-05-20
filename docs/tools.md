# New Relic MCP Tools

This document describes the tools available in the New Relic MCP server.

## run-nrql-query

Execute a NRQL query and return the results as datapoints.

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| query | string | Yes | - | NRQL query to execute |
| timeout | number | No | 30000 | Query timeout in milliseconds |
| visualize | boolean | No | false | Whether to visualize the results as a Mermaid chart |
| valueKey | string | No | - | The key to extract values from for visualization (required if visualize is true) |
| chartTitle | string | No | "NRQL Query Results" | The title for the chart |
| yAxisLabel | string | No | "Value" | The label for the y-axis |

### Example

```json
{
  "query": "SELECT count(*) FROM Transaction FACET name LIMIT 10",
  "timeout": 30000,
  "visualize": true,
  "valueKey": "count",
  "chartTitle": "Transaction Counts",
  "yAxisLabel": "Count"
}
```

## query-logs

Query New Relic logs by field and value with customizable parameters.

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| queryValue | string | Yes | - | Value to search for in the specified field |
| queryField | string | No | "trace.id" | Field name to query on |
| startTimeRange | number | No | 60 | Start time range in minutes to look back from now |
| endTimeRange | number | No | 0 | End time range in minutes to look back from now (0 means now) |
| startTimestamp | number | No | - | Start timestamp in milliseconds since epoch |
| endTimestamp | number | No | null | End timestamp in milliseconds since epoch (null means now) |
| limit | number | No | 100 | Maximum number of logs to return |
| selectFields | string[] | No | ["timestamp", "message", "tag", "userAgent"] | Fields to select in the query |
| additionalConditions | string[] | No | [] | Additional NRQL where clause conditions |

> **Note:** Time range parameters (`startTimeRange`/`endTimeRange`) and timestamp parameters (`startTimestamp`/`endTimestamp`) cannot be used together. Use either one approach or the other.

### Examples

#### Using Time Range Parameters

```json
{
  "queryValue": "abc123",
  "queryField": "trace.id",
  "startTimeRange": 60,
  "endTimeRange": 0,
  "limit": 100,
  "selectFields": ["timestamp", "message", "tag", "userAgent"],
  "additionalConditions": ["level = 'ERROR'"]
}
```

#### Using Timestamp Parameters

```json
{
  "queryValue": "abc123",
  "queryField": "trace.id",
  "startTimestamp": 1715644800000,
  "endTimestamp": null,
  "limit": 100,
  "selectFields": ["timestamp", "message", "tag", "userAgent"]
}
```

### Common Use Cases

1. **Query logs by trace ID** (default time range of 60 minutes):
   ```json
   {
     "queryValue": "abc123"
   }
   ```

2. **Query logs by request ID**:
   ```json
   {
     "queryValue": "xyz789",
     "queryField": "request_id"
   }
   ```

3. **Query error logs for a specific service**:
   ```json
   {
     "queryValue": "abc123",
     "additionalConditions": ["service_name = 'api-gateway'", "level = 'ERROR'"]
   }
   ```

4. **Query logs with a custom time range** (last 2 hours):
   ```json
   {
     "queryValue": "abc123",
     "startTimeRange": 120,
     "endTimeRange": 0
   }
   ```

5. **Query logs for a specific time window** (30-15 minutes ago):
   ```json
   {
     "queryValue": "abc123",
     "startTimeRange": 30,
     "endTimeRange": 15
   }
   ```

6. **Query logs using specific timestamps**:
   ```json
   {
     "queryValue": "abc123",
     "startTimestamp": 1715644800000,
     "endTimestamp": 1715648400000
   }
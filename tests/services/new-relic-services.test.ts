import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NewRelicBaseService } from '../../src/services/new-relic-base-service.js';
import type { NewRelicApiConfig } from '../../src/services/new-relic-base-service.js';
import { NewRelicLogsService } from '../../src/services/new-relic-logs-service.js';
import type { LogsQueryOptions } from '../../src/services/new-relic-logs-service.js';
import { GraphQLClient } from 'graphql-request';

vi.mock('graphql-request', () => {
  return {
    GraphQLClient: vi.fn().mockImplementation(() => ({
      request: vi.fn()
    }))
  };
});

vi.mock('../../src/utils/logger/index.js', () => {
  return {
    defaultLogger: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warning: vi.fn()
    }
  };
});

class TestNewRelicBaseService extends NewRelicBaseService {
  public async testExecuteNerdGraphQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.executeNerdGraphQuery<T>(query, variables);
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public getAccountId(): string {
    return this.accountId;
  }

  public getGraphQLClient(): GraphQLClient {
    return this.graphQLClient;
  }
}

describe('NewRelicBaseService', () => {
  const mockConfig: NewRelicApiConfig = {
    apiKey: 'test-api-key',
    accountId: '12345'
  };

  let service: TestNewRelicBaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TestNewRelicBaseService(mockConfig);
  });

  it('should initialize with the correct configuration', () => {
    expect(service.getApiKey()).toBe(mockConfig.apiKey);
    expect(service.getAccountId()).toBe(mockConfig.accountId);
    expect(GraphQLClient).toHaveBeenCalledWith(
      'https://api.newrelic.com/graphql',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'API-Key': mockConfig.apiKey
        }
      })
    );
  });

  it('should use EU endpoint when region is EU', () => {
    const euConfig: NewRelicApiConfig = {
      ...mockConfig,
      region: 'EU'
    };
    
    const euService = new TestNewRelicBaseService(euConfig);
    
    expect(GraphQLClient).toHaveBeenCalledWith(
      'https://api.eu.newrelic.com/graphql',
      expect.any(Object)
    );
  });

  it('should execute NerdGraph queries successfully', async () => {
    const mockQuery = 'query { test }';
    const mockVariables = { foo: 'bar' };
    const mockResponse = { data: { test: 'success' } };
    
    const client = service.getGraphQLClient();
    (client.request as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
    
    const result = await service.testExecuteNerdGraphQuery(mockQuery, mockVariables);
    
    expect(client.request).toHaveBeenCalledWith(mockQuery, mockVariables);
    expect(result).toEqual(mockResponse);
  });

  it('should handle errors when executing NerdGraph queries', async () => {
    const mockQuery = 'query { test }';
    const mockError = new Error('GraphQL error');
    
    const client = service.getGraphQLClient();
    (client.request as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);
    
    await expect(service.testExecuteNerdGraphQuery(mockQuery)).rejects.toThrow(mockError);
  });
});

class TestNewRelicLogsService extends NewRelicLogsService {
  public mockExecuteNerdGraphQuery<T>(mockFn: (...args: unknown[]) => Promise<T>): void {
    // @ts-expect-error - Accessing protected method for testing
    this.executeNerdGraphQuery = mockFn;
  }
}

describe('NewRelicLogsService', () => {
  const mockConfig: NewRelicApiConfig = {
    apiKey: 'test-api-key',
    accountId: '12345'
  };

  let service: TestNewRelicLogsService;
  
  // Define a more specific type for the GraphQL response
  interface MockGraphQLResponse {
    actor: {
      account: {
        nrql: {
          results: Array<{
            timestamp: string;
            message: string;
            attributes: Record<string, unknown>;
            level?: string;
          }>;
          metadata: {
            timeWindow: {
              start: number;
              end: number;
            };
          };
        };
      };
    };
  }
  
  let mockGraphQLResponse: MockGraphQLResponse;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockGraphQLResponse = {
      actor: {
        account: {
          nrql: {
            results: [
              { timestamp: '2023-01-01T00:00:00Z', message: 'Test log 1', attributes: {} },
              { timestamp: '2023-01-01T00:01:00Z', message: 'Test log 2', attributes: { level: 'info' } }
            ],
            metadata: {
              timeWindow: {
                start: 1672531200000,
                end: 1672534800000
              }
            }
          }
        }
      }
    };

    service = new TestNewRelicLogsService(mockConfig);
    
    // Mock the executeNerdGraphQuery method
    const mockQueryFn = vi.fn().mockResolvedValue(mockGraphQLResponse);
    service.mockExecuteNerdGraphQuery(mockQueryFn);
    
    // Mock Date.now() to return a consistent value
    vi.spyOn(Date, 'now').mockReturnValue(1672534800000); // 2023-01-01T01:00:00Z
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize correctly', () => {
    expect(service).toBeInstanceOf(NewRelicBaseService);
  });

  it('should query logs with a raw NRQL string', async () => {
    const nrqlQuery = 'SELECT * FROM Log WHERE level = "error" LIMIT 10';
    
    const result = await service.queryLogs(nrqlQuery);
    
    // @ts-expect-error - Accessing protected method for testing
    expect(service.executeNerdGraphQuery).toHaveBeenCalledWith(
      expect.stringContaining('query LogsQuery'),
      {
        accountId: 12345,
        query: nrqlQuery
      }
    );
    
    expect(result).toEqual({
      logs: mockGraphQLResponse.actor.account.nrql.results,
      metadata: {
        totalCount: 2,
        elapsedTime: expect.any(Number)
      }
    });
  });

  it('should query logs with options object', async () => {
    const options: LogsQueryOptions = {
      limit: 50,
      startTimeRange: 30,
      endTimeRange: 0,
      whereConditions: ['level = "error"', 'service = "api"'],
      selectFields: ['timestamp', 'message', 'level', 'service']
    };
    
    const result = await service.queryLogs(options);
    
    const currentTimestamp = 1672534800000;
    const pastTimestamp = currentTimestamp - ((options.startTimeRange || 60) * 60 * 1000);
    
    const expectedQuery = `SELECT timestamp, message, level, service FROM Log WHERE timestamp > ${pastTimestamp} AND timestamp <= ${currentTimestamp} AND level = "error" AND service = "api" LIMIT 50`;
    
    // @ts-expect-error - Accessing protected method for testing
    expect(service.executeNerdGraphQuery).toHaveBeenCalledWith(
      expect.stringContaining('query LogsQuery'),
      {
        accountId: 12345,
        query: expect.stringContaining(expectedQuery)
      }
    );
    
    expect(result).toEqual({
      logs: mockGraphQLResponse.actor.account.nrql.results,
      metadata: {
        totalCount: 2,
        elapsedTime: expect.any(Number)
      }
    });
  });

  it('should use default options when not provided', async () => {
    const options: LogsQueryOptions = {};
    
    await service.queryLogs(options);
    
    const currentTimestamp = 1672534800000;
    const pastTimestamp = currentTimestamp - (60 * 60 * 1000); // Default startTimeRange is 60 minutes
    
    const expectedQuery = `SELECT * FROM Log WHERE timestamp > ${pastTimestamp} AND timestamp <= ${currentTimestamp} LIMIT 100`;
    
    // @ts-expect-error - Accessing protected method for testing
    expect(service.executeNerdGraphQuery).toHaveBeenCalledWith(
      expect.stringContaining('query LogsQuery'),
      {
        accountId: 12345,
        query: expect.stringContaining(expectedQuery)
      }
    );
  });

  it('should handle errors when querying logs', async () => {
    const mockError = new Error('GraphQL error');
    
    const mockQueryFn = vi.fn().mockRejectedValue(mockError);
    service.mockExecuteNerdGraphQuery(mockQueryFn);
    
    await expect(service.queryLogs('SELECT * FROM Log')).rejects.toThrow(mockError);
  });
});
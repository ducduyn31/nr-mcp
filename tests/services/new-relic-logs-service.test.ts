import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { NewRelicLogsService } from "../../src/services/new-relic-logs-service.js";
import type { NewRelicApiConfig } from "../../src/services/new-relic-base-service.js";

class TestableNewRelicLogsService extends NewRelicLogsService {
	private mockImplementation: (query: string, variables?: Record<string, unknown>) => Promise<unknown> =
		() => Promise.resolve({});
	
	public setMockExecuteNerdGraphQuery(mock: Mock): void {
		this.mockImplementation = (query, variables) => {
			return Promise.resolve(mock(query, variables));
		};
	}
	
	protected override executeNerdGraphQuery<T>(
		query: string,
		variables?: Record<string, unknown>,
	): Promise<T> {
		return this.mockImplementation(query, variables) as Promise<T>;
	}
}

describe("NewRelicLogsService", () => {
	let logsService: TestableNewRelicLogsService;
	
	const mockExecuteNerdGraphQuery = vi.fn();
	
	const mockLogs = [
		{
			timestamp: 1680307200000,
			message: "Test log message 1",
			level: "INFO",
            traceId: "abc123",
		},
		{
			timestamp: 1680307260000,
			message: "Test log message 2",
			level: "ERROR",
            traceId: "abc123",
		}
	];
	
	const mockNerdGraphResponse = {
		actor: {
			account: {
				nrql: {
					results: mockLogs,
					metadata: {
						timeWindow: {
							start: 1680307200000,
							end: 1680307260000
						}
					}
				}
			}
		}
	};
	
	beforeEach(() => {
		vi.clearAllMocks();
		
		logsService = new TestableNewRelicLogsService({
			apiKey: "test-api-key",
			accountId: "12345",
			region: "US"
		});
		
		logsService.setMockExecuteNerdGraphQuery(mockExecuteNerdGraphQuery);
		mockExecuteNerdGraphQuery.mockResolvedValue(mockNerdGraphResponse);
	});
	
	afterEach(() => {
		vi.resetAllMocks();
	});
	
	it("should query logs with a direct NRQL query string", async () => {
		const nrqlQuery = "SELECT * FROM Log WHERE timestamp > 1680307200000 LIMIT 100";
		
		const result = await logsService.queryLogs(nrqlQuery);
		
		expect(mockExecuteNerdGraphQuery).toHaveBeenCalledWith(
			expect.stringContaining("query LogsQuery"),
			{
				accountId: 12345,
				query: nrqlQuery
			}
		);
		
		expect(result).toEqual({
			logs: mockLogs,
			metadata: {
				totalCount: mockLogs.length,
				elapsedTime: expect.any(Number)
			}
		});
	});
	
	it("should query logs with time range parameters", async () => {
		const result = await logsService.queryLogs({
			startTimeRange: 60,
			endTimeRange: 0,
			limit: 100,
			whereConditions: ["trace.id = 'abc123'"],
			selectFields: ["timestamp", "message", "level"]
		});
		
		expect(mockExecuteNerdGraphQuery).toHaveBeenCalledWith(
			expect.stringContaining("query LogsQuery"),
			{
				accountId: 12345,
				query: expect.stringContaining("SELECT timestamp, message, level FROM Log WHERE")
			}
		);
		
		const queryArg = mockExecuteNerdGraphQuery.mock.calls[0][1].query;
		expect(queryArg).toMatch(/timestamp > \d+ AND timestamp <= \d+/);
		expect(queryArg).toContain("trace.id = 'abc123'");
		expect(queryArg).toContain("LIMIT 100");
		
		expect(result).toEqual({
			logs: mockLogs,
			metadata: {
				totalCount: mockLogs.length,
				elapsedTime: expect.any(Number)
			}
		});
	});
	
	it("should query logs with timestamp parameters", async () => {
		const startTimestamp = 1680307200000; // 2023-04-01T00:00:00Z
		const endTimestamp = 1680307260000;   // 2023-04-01T00:01:00Z
		
		const result = await logsService.queryLogs({
			startTimestamp,
			endTimestamp,
			limit: 50,
			whereConditions: ["level = 'ERROR'"],
			selectFields: ["*"]
		});
		
		expect(mockExecuteNerdGraphQuery).toHaveBeenCalledWith(
			expect.stringContaining("query LogsQuery"),
			{
				accountId: 12345,
				query: expect.stringContaining(`SELECT * FROM Log WHERE timestamp > ${startTimestamp} AND timestamp <= ${endTimestamp}`)
			}
		);
		
		const queryArg = mockExecuteNerdGraphQuery.mock.calls[0][1].query;
		expect(queryArg).toContain("level = 'ERROR'");
		expect(queryArg).toContain("LIMIT 50");
		
		expect(result).toEqual({
			logs: mockLogs,
			metadata: {
				totalCount: mockLogs.length,
				elapsedTime: expect.any(Number)
			}
		});
	});
	
	it("should query logs with startTimestamp and null endTimestamp", async () => {
		const startTimestamp = 1680307200000; // 2023-04-01T00:00:00Z
		
		const result = await logsService.queryLogs({
			startTimestamp,
			endTimestamp: null,
			limit: 200
		});
		
		expect(mockExecuteNerdGraphQuery).toHaveBeenCalledWith(
			expect.stringContaining("query LogsQuery"),
			{
				accountId: 12345,
				query: expect.any(String)
			}
		);
		
		const queryArg = mockExecuteNerdGraphQuery.mock.calls[0][1].query;
		expect(queryArg).toMatch(new RegExp(`timestamp > ${startTimestamp} AND timestamp <= \\d+`));
		expect(queryArg).toContain("LIMIT 200");
		
		expect(result).toEqual({
			logs: mockLogs,
			metadata: {
				totalCount: mockLogs.length,
				elapsedTime: expect.any(Number)
			}
		});
	});
	
	it("should handle errors when querying logs", async () => {
		mockExecuteNerdGraphQuery.mockRejectedValueOnce(new Error("API Error"));
		
		await expect(logsService.queryLogs({
			startTimeRange: 60,
			endTimeRange: 0
		})).rejects.toThrow("API Error");
	});
});
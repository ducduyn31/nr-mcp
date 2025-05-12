import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { queryLogsTool } from "../../src/tools/query-logs.js";
import { defaultContainer } from "../../src/utils/index.js";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { QueryLogsSchema } from "../../src/tools/query-logs.js";

type ToolCallbackContext = Parameters<ToolCallback<typeof QueryLogsSchema>>[1];

vi.mock("../../src/utils/logger/index.js", () => ({
	defaultLogger: {
		info: vi.fn(),
		error: vi.fn(),
	},
}));

describe("Query Logs Tool", () => {
	const mockToolCallbackContext: ToolCallbackContext = {
		signal: new AbortController().signal,
		requestId: "test-request-id",
		sendNotification: vi.fn(),
		sendRequest: vi.fn(),
	};
	const mockLogs = [
		{
			timestamp: 1679999999,
			message: "Test log message 1",
            userAgent: "Mozilla/5.0",
            tag: "test",
		},
		{
			timestamp: 1680000000,
			message: "Test log message 2",
            userAgent: "Chrome/90.0",
            tag: "test",
		},
	];

	const mockQueryLogsResult = {
		logs: mockLogs,
		metadata: {
			totalCount: 2,
			elapsedTime: 100,
		},
	};

	const mockLogsService = {
		queryLogs: vi.fn().mockResolvedValue(mockQueryLogsResult),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		
		defaultContainer.get = vi.fn().mockReturnValue(mockLogsService);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("should query logs with default parameters", async () => {
		const result = await queryLogsTool({
			queryValue: "abc123",
		}, mockToolCallbackContext);

		expect(mockLogsService.queryLogs).toHaveBeenCalledWith({
			limit: 100,
			startTimeRange: undefined,
			endTimeRange: undefined,
			selectFields: ["timestamp", "message", "tag", "userAgent"],
			whereConditions: ["trace.id = 'abc123'"],
		});

		expect(result).toEqual({
			content: [
				{
					type: "text",
					text: "Successfully retrieved 2 log entries where trace.id = 'abc123' in 100ms.",
				},
				{
					type: "text",
					text: expect.stringContaining('"logsCount": 2'),
				},
			],
		});
	});

	it("should query logs with time range parameters", async () => {
		mockLogsService.queryLogs.mockResolvedValueOnce(mockQueryLogsResult);
		
		const result = await queryLogsTool({
			queryValue: "xyz789",
			queryField: "request_id",
			startTimeRange: 30,
			endTimeRange: 5,
			limit: 50,
			selectFields: ["timestamp", "message"],
			additionalConditions: ["level = 'ERROR'"],
		}, mockToolCallbackContext);

		expect(mockLogsService.queryLogs).toHaveBeenCalledWith({
			limit: 50,
			startTimeRange: 30,
			endTimeRange: 5,
			selectFields: ["timestamp", "message"],
			whereConditions: ["level = 'ERROR'", "request_id = 'xyz789'"],
		});

		expect(result).toEqual({
			content: [
				{
					type: "text",
					text: "Successfully retrieved 2 log entries where request_id = 'xyz789' in 100ms.",
				},
				{
					type: "text",
					text: expect.stringContaining('"logsCount": 2'),
				},
			],
		});
	});

	it("should query logs with timestamp parameters", async () => {
		mockLogsService.queryLogs.mockResolvedValueOnce(mockQueryLogsResult);
		
		const startTimestamp = Date.now() - 3600000; // 1 hour ago
		const endTimestamp = Date.now();
		
		const result = await queryLogsTool({
			queryValue: "abc123",
			queryField: "trace.id",
			startTimestamp,
			endTimestamp,
			limit: 200,
			selectFields: ["timestamp", "message", "level"],
			additionalConditions: ["service = 'api'"],
		}, mockToolCallbackContext);

		expect(mockLogsService.queryLogs).toHaveBeenCalledWith({
			limit: 200,
			startTimestamp,
			endTimestamp,
			selectFields: ["timestamp", "message", "level"],
			whereConditions: ["service = 'api'", "trace.id = 'abc123'"],
		});

		expect(result).toEqual({
			content: [
				{
					type: "text",
					text: "Successfully retrieved 2 log entries where trace.id = 'abc123' in 100ms.",
				},
				{
					type: "text",
					text: expect.stringContaining('"logsCount": 2'),
				},
			],
		});
	});

	it("should query logs with startTimestamp and null endTimestamp", async () => {
		mockLogsService.queryLogs.mockResolvedValueOnce(mockQueryLogsResult);
		
		const startTimestamp = Date.now() - 3600000; // 1 hour ago
		
		const result = await queryLogsTool({
			queryValue: "abc123",
			startTimestamp,
			endTimestamp: null,
		}, mockToolCallbackContext);

		expect(mockLogsService.queryLogs).toHaveBeenCalledWith({
			limit: 100,
			startTimestamp,
			endTimestamp: null,
			selectFields: ["timestamp", "message", "tag", "userAgent"],
			whereConditions: ["trace.id = 'abc123'"],
		});

		expect(result).toEqual({
			content: [
				{
					type: "text",
					text: "Successfully retrieved 2 log entries where trace.id = 'abc123' in 100ms.",
				},
				{
					type: "text",
					text: expect.stringContaining('"logsCount": 2'),
				},
			],
		});
	});

	it("should throw error when mixing time range and timestamp parameters", async () => {
		const result = await queryLogsTool({
			queryValue: "abc123",
			startTimeRange: 30,
			startTimestamp: Date.now() - 3600000,
		}, mockToolCallbackContext);

		expect(result).toEqual({
			content: [
				{
					type: "text",
					text: expect.stringContaining("Invalid parameter combination: Cannot use both timestamp and time range parameters together"),
				},
			],
		});

		expect(mockLogsService.queryLogs).not.toHaveBeenCalled();
	});

	it("should throw error when using endTimestamp without startTimestamp", async () => {
		const result = await queryLogsTool({
			queryValue: "abc123",
			endTimestamp: Date.now(),
		}, mockToolCallbackContext);

		expect(result).toEqual({
			content: [
				{
					type: "text",
					text: expect.stringContaining("Invalid parameter: endTimestamp provided without startTimestamp"),
				},
			],
		});

		expect(mockLogsService.queryLogs).not.toHaveBeenCalled();
	});

	it("should handle errors gracefully", async () => {
		mockLogsService.queryLogs.mockRejectedValueOnce(new Error("Test error"));

		const result = await queryLogsTool({
			queryValue: "abc123",
		}, mockToolCallbackContext);

		expect(result).toEqual({
			content: [
				{
					type: "text",
					text: "Error querying logs: Test error",
				},
			],
		});
	});
});
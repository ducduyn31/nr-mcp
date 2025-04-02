/**
 * Logger module entry point
 * Re-exports all logger components for backward compatibility
 */

// Export types
export { LogLevel, type LoggerStrategy, type LoggingMessageSender } from "./types.js";

// Export strategies
export { TextLoggerStrategy } from "./strategies/text-logger-strategy.js";
export { JsonLoggerStrategy } from "./strategies/json-logger-strategy.js";
export { McpLoggerStrategy } from "./strategies/mcp-logger-strategy.js";

// Export Logger class
export { Logger } from "./logger.js";

// Create and export the default logger instance with JSON strategy (default)
import { Logger } from "./logger.js";
import { JsonLoggerStrategy } from "./strategies/json-logger-strategy.js";
import { TextLoggerStrategy } from "./strategies/text-logger-strategy.js";
import { McpLoggerStrategy } from "./strategies/mcp-logger-strategy.js";
import type { LoggingMessageSender } from "./types.js";

// Default logger instance
export const defaultLogger = createMcpLogger();

/**
 * Create a logger with text strategy
 * @returns A logger instance with text strategy
 */
export function createTextLogger(): Logger {
	return Logger.getInstance(new TextLoggerStrategy());
}

/**
 * Create a logger with JSON strategy
 * @returns A logger instance with JSON strategy
 */
export function createJsonLogger(): Logger {
	return Logger.getInstance(new JsonLoggerStrategy());
}

/**
 * Create a logger with MCP strategy
 * @param server The MCP server instance to attach (optional)
 * @returns A logger instance with MCP strategy
 */
export function createMcpLogger(server?: LoggingMessageSender): Logger {
	const mcpStrategy = new McpLoggerStrategy();
	
	if (server) {
		mcpStrategy.attachServer(server);
	}
	
	return Logger.getInstance(mcpStrategy);
}
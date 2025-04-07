/**
 * MCP logger strategy that sends logs to an MCP server
 */
import type {
	LogLevel,
	LoggerStrategy,
	LoggingMessageSender,
} from "../types.js";

/**
 * MCP logger strategy that sends logs to an MCP server
 * When no server is attached, logs are stored in a buffer queue up to 4MB
 */
export class McpLoggerStrategy implements LoggerStrategy {
	private server: LoggingMessageSender | null = null;
	private bufferQueue: Array<{
		level: LogLevel;
		message: string;
		args: unknown[];
		timestamp: string;
	}> = [];
	private bufferSize = 0;
	private readonly MAX_BUFFER_SIZE = 4 * 1024 * 1024; // 4MB in bytes

	/**
	 * Attach an MCP server to the logger strategy
	 * @param server The MCP server instance
	 */
	public attachServer(server: LoggingMessageSender): void {
		this.server = server;
		this.flushBuffer();
	}

	/**
	 * Check if a server is attached
	 * @returns True if a server is attached, false otherwise
	 */
	public hasServer(): boolean {
		return this.server !== null;
	}

	/**
	 * Get the current buffer size in bytes
	 * @returns The buffer size in bytes
	 */
	public getBufferSize(): number {
		return this.bufferSize;
	}

	/**
	 * Get the number of messages in the buffer
	 * @returns The number of messages
	 */
	public getBufferLength(): number {
		return this.bufferQueue.length;
	}

	/**
	 * Clear the buffer without sending logs
	 */
	public clearBuffer(): void {
		this.bufferQueue = [];
		this.bufferSize = 0;
	}

	/**
	 * Flush the buffer and send all logs to the server
	 */
	private flushBuffer(): void {
		if (!this.server || this.bufferQueue.length === 0) {
			return;
		}

		try {
			// Process all logs in the buffer
			while (this.bufferQueue.length > 0) {
				const logEntry = this.bufferQueue[0]; // Peek at the first log
				const { level, message, args } = logEntry;

				// Convert any args to a data object
				const data =
					args.length > 0
						? args.length === 1 && typeof args[0] === "object"
							? args[0]
							: { args }
						: { message };

				// If message is not included in data, add it
				if (typeof data === "object" && data !== null && !("message" in data)) {
					(data as Record<string, unknown>).message = message;
				}

				try {
					// Send the log message to the MCP server
					this.server.sendLoggingMessage({
						level,
						logger: "mcp-server",
						data,
					});

					// If successful, remove from buffer
					this.bufferQueue.shift();
					this.bufferSize -= this.calculateLogSize(logEntry);
				} catch (error) {
					// If we get a "Not connected" error, stop trying to send logs
					if (error instanceof Error && error.message === "Not connected") {
						return; // Keep remaining logs in buffer
					}
					// For other errors, rethrow
					throw error;
				}
			}
		} catch (error) {
			// If there's any other error during flush, log it but don't crash
			console.error("Error flushing log buffer:", error);
		}
	}

	/**
	 * Calculate the approximate size of a log entry in bytes
	 * @param log The log entry
	 * @returns The approximate size in bytes
	 */
	private calculateLogSize(log: {
		level: LogLevel;
		message: string;
		args: unknown[];
		timestamp: string;
	}): number {
		// Estimate the size of the log entry
		// Level (enum string) + message + timestamp
		let size = log.level.length + log.message.length + log.timestamp.length;

		// Add size for args (rough estimation)
		if (log.args.length > 0) {
			try {
				size += JSON.stringify(log.args).length;
			} catch (e) {
				// If JSON.stringify fails, make a conservative estimate
				size += 1000; // Assume 1KB per arg object as fallback
			}
		}

		return size;
	}

	log(level: LogLevel, message: string, ...args: unknown[]): void {
		// Create a log entry
		const timestamp = new Date().toISOString();
		const logEntry = { level, message, args, timestamp };

		if (!this.server) {
			// No server attached, add to buffer queue
			this.addToBuffer(logEntry);
			return;
		}

		// Server is attached, try to send the log directly
		try {
			// Convert any args to a data object
			const data =
				args.length > 0
					? args.length === 1 && typeof args[0] === "object"
						? args[0]
						: { args }
					: { message };

			// If message is not included in data, add it
			if (typeof data === "object" && data !== null && !("message" in data)) {
				(data as Record<string, unknown>).message = message;
			}

			// Send the log message to the MCP server
			this.server.sendLoggingMessage({
				level,
				logger: "mcp-server",
				data,
			});
		} catch (error) {
			// If we get a "Not connected" error, add the log to the buffer
			if (error instanceof Error && error.message === "Not connected") {
				this.addToBuffer(logEntry);
			} else {
				// For other errors, rethrow
				throw error;
			}
		}
	}

	/**
	 * Add a log entry to the buffer, managing buffer size
	 * @param logEntry The log entry to add
	 */
	private addToBuffer(logEntry: {
		level: LogLevel;
		message: string;
		args: unknown[];
		timestamp: string;
	}): void {
		const logSize = this.calculateLogSize(logEntry);

		// If adding this log would exceed the buffer size, remove oldest logs
		while (
			this.bufferSize + logSize > this.MAX_BUFFER_SIZE &&
			this.bufferQueue.length > 0
		) {
			const removedLog = this.bufferQueue.shift();
			if (removedLog) {
				this.bufferSize -= this.calculateLogSize(removedLog);
			}
		}

		// Add the new log to the buffer
		this.bufferQueue.push(logEntry);
		this.bufferSize += logSize;
	}
}

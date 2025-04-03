/**
 * Logger types and interfaces
 */
import type { LoggingMessageNotification } from "@modelcontextprotocol/sdk/types";

/**
 * Log level enum
 */
export enum LogLevel {
	DEBUG = "debug",
	INFO = "info",
	NOTICE = "notice",
	WARNING = "warning",
	ERROR = "error",
	CRITICAL = "critical",
	ALERT = "alert",
	EMERGENCY = "emergency",
}

/**
 * Logger strategy interface
 */
export interface LoggerStrategy {
	log(level: LogLevel, message: string, ...args: unknown[]): void;
}

/**
 * Re-export LoggingMessageSender interface from the main types file
 */
export interface LoggingMessageSender {
	/**
	 * Send a logging message
	 * @param params The logging message parameters
	 */
	sendLoggingMessage: (params: LoggingMessageNotification["params"]) => void;
}

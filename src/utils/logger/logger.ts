/**
 * Logger class implementation
 */
import { LogLevel } from "./types.js";
import type { LoggerStrategy } from "./types.js";
import { JsonLoggerStrategy } from "./strategies/json-logger-strategy.js";

/**
 * Logger class that implements the singleton pattern
 * and uses the strategy pattern for different logging implementations
 */
export class Logger {
	private static instance: Logger;
	private strategy: LoggerStrategy;

	private constructor(strategy: LoggerStrategy = new JsonLoggerStrategy()) {
		this.strategy = strategy;
	}

	/**
	 * Get the singleton instance of the logger
	 * @param strategy Optional strategy to set
	 * @returns The logger instance
	 */
	public static getInstance(strategy?: LoggerStrategy): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger(strategy);
		} else if (strategy) {
			Logger.instance.setStrategy(strategy);
		}
		return Logger.instance;
	}

	/**
	 * Set the logger strategy
	 * @param strategy The logger strategy to use
	 */
	public setStrategy(strategy: LoggerStrategy): void {
		this.strategy = strategy;
	}

	/**
	 * Get the current logger strategy
	 * @returns The current logger strategy
	 */
	public getStrategy(): LoggerStrategy {
		return this.strategy;
	}

	/**
	 * Log a debug message
	 * @param message The message to log
	 * @param args Additional arguments
	 */
	public debug(message: string, ...args: unknown[]): void {
		this.strategy.log(LogLevel.DEBUG, message, ...args);
	}

	/**
	 * Log an info message
	 * @param message The message to log
	 * @param args Additional arguments
	 */
	public info(message: string, ...args: unknown[]): void {
		this.strategy.log(LogLevel.INFO, message, ...args);
	}

	/**
	 * Log a notice message
	 * @param message The message to log
	 * @param args Additional arguments
	 */
	public notice(message: string, ...args: unknown[]): void {
		this.strategy.log(LogLevel.NOTICE, message, ...args);
	}

	/**
	 * Log a warning message
	 * @param message The message to log
	 * @param args Additional arguments
	 */
	public warning(message: string, ...args: unknown[]): void {
		this.strategy.log(LogLevel.WARNING, message, ...args);
	}

	/**
	 * Log an error message
	 * @param message The message to log
	 * @param args Additional arguments
	 */
	public error(message: string, ...args: unknown[]): void {
		this.strategy.log(LogLevel.ERROR, message, ...args);
	}

	/**
	 * Log a critical message
	 * @param message The message to log
	 * @param args Additional arguments
	 */
	public critical(message: string, ...args: unknown[]): void {
		this.strategy.log(LogLevel.CRITICAL, message, ...args);
	}

	/**
	 * Log an alert message
	 * @param message The message to log
	 * @param args Additional arguments
	 */
	public alert(message: string, ...args: unknown[]): void {
		this.strategy.log(LogLevel.ALERT, message, ...args);
	}

	/**
	 * Log an emergency message
	 * @param message The message to log
	 * @param args Additional arguments
	 */
	public emergency(message: string, ...args: unknown[]): void {
		this.strategy.log(LogLevel.EMERGENCY, message, ...args);
	}
}
/**
 * JSON logger strategy that outputs logs in JSON format
 */
import { LogLevel, type LoggerStrategy } from "../types.js";

/**
 * JSON logger strategy that outputs logs in JSON format
 */
export class JsonLoggerStrategy implements LoggerStrategy {
	log(level: LogLevel, message: string, ...args: unknown[]): void {
		const timestamp = new Date().toISOString();
		const logObject = {
			timestamp,
			level,
			message,
			args: args.length > 0 ? args : undefined,
		};

		switch (level) {
			case LogLevel.DEBUG:
				if (process.env.DEBUG) {
					console.debug(JSON.stringify(logObject));
				}
				break;
			case LogLevel.INFO:
				console.log(JSON.stringify(logObject));
				break;
			case LogLevel.NOTICE:
				console.log(JSON.stringify(logObject));
				break;
			case LogLevel.WARNING:
				console.warn(JSON.stringify(logObject));
				break;
			case LogLevel.ERROR:
				console.error(JSON.stringify(logObject));
				break;
			case LogLevel.CRITICAL:
				console.error(JSON.stringify(logObject));
				break;
			case LogLevel.ALERT:
				console.error(JSON.stringify(logObject));
				break;
			case LogLevel.EMERGENCY:
				console.error(JSON.stringify(logObject));
				break;
		}
	}
}
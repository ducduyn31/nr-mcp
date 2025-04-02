/**
 * Text logger strategy that uses chalk for colorful output
 */
import chalk from "chalk";
import { LogLevel, type LoggerStrategy } from "../types.js";

/**
 * Text logger strategy that uses chalk for colorful output
 */
export class TextLoggerStrategy implements LoggerStrategy {
	log(level: LogLevel, message: string, ...args: unknown[]): void {
		const timestamp = new Date().toISOString();

		switch (level) {
			case LogLevel.DEBUG:
				if (process.env.DEBUG) {
					console.debug(
						`${chalk.gray(timestamp)} ${chalk.yellow("[DEBUG]")} ${chalk.cyan(message)}`,
						...args,
					);
				}
				break;
			case LogLevel.INFO:
				console.log(
					`${chalk.gray(timestamp)} ${chalk.blue("[INFO]")} ${message}`,
					...args,
				);
				break;
			case LogLevel.NOTICE:
				console.log(
					`${chalk.gray(timestamp)} ${chalk.green("[NOTICE]")} ${message}`,
					...args,
				);
				break;
			case LogLevel.WARNING:
				console.warn(
					`${chalk.gray(timestamp)} ${chalk.yellow("[WARNING]")} ${message}`,
					...args,
				);
				break;
			case LogLevel.ERROR:
				console.error(
					`${chalk.gray(timestamp)} ${chalk.red("[ERROR]")} ${chalk.red(message)}`,
					...args,
				);
				break;
			case LogLevel.CRITICAL:
				console.error(
					`${chalk.gray(timestamp)} ${chalk.bgRed.white("[CRITICAL]")} ${chalk.red(message)}`,
					...args,
				);
				break;
			case LogLevel.ALERT:
				console.error(
					`${chalk.gray(timestamp)} ${chalk.bgRed.white("[ALERT]")} ${chalk.red.bold(message)}`,
					...args,
				);
				break;
			case LogLevel.EMERGENCY:
				console.error(
					`${chalk.gray(timestamp)} ${chalk.bgRed.white.bold("[EMERGENCY]")} ${chalk.red.bold(message)}`,
					...args,
				);
				break;
		}
	}
}
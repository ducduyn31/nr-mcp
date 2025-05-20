/**
 * Only Error logger strategy that only logs error level and above
 */
import chalk from "chalk";
import { LogLevel, type LoggerStrategy } from "../types.js";

/**
 * Only Error logger strategy that only logs error level and above
 * Ignores all log levels below ERROR (DEBUG, INFO, NOTICE, WARNING)
 */
export class OnlyErrorLoggerStrategy implements LoggerStrategy {
  log(level: LogLevel, message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
      case LogLevel.NOTICE:
      case LogLevel.WARNING:
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

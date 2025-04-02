import type { LoggingMessageNotification } from "@modelcontextprotocol/sdk/types";

/**
 * Interface for objects that can send logging messages
 */
export interface LoggingMessageSender {
  /**
   * Send a logging message
   * @param params The logging message parameters
   */
  sendLoggingMessage: (params: LoggingMessageNotification["params"]) => void;
}
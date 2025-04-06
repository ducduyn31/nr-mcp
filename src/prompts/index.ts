import { defaultLogger } from "../utils/logger/index.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { debugTracePrompt, handleDebugTracePrompt } from "./debug-trace.js";
import { analyzeServicePrompt, handleAnalyzeServicePrompt } from "./analyze-service.js";
import { exploreErrorsPrompt, handleExploreErrorsPrompt } from "./explore-errors.js";

// Export all prompt definitions for direct use
export * from "./debug-trace.js";
export * from "./analyze-service.js";
export * from "./explore-errors.js";

// Define the prompt registry with index signature
const PROMPTS: Record<string, {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}> = {
  "debug-trace": debugTracePrompt,
  "analyze-service": analyzeServicePrompt,
  "explore-errors": exploreErrorsPrompt,
};

/**
 * Register all prompts with the MCP server
 * @param server The MCP server instance
 */
export function registerAllPrompts(server: McpServer): void {
  defaultLogger.info("Registering all prompts");

  // Register the prompts capability
  server.server.setRequestHandler(ListPromptsRequestSchema, async () => {
    defaultLogger.info("Handling prompts/list request");
    return {
      prompts: Object.values(PROMPTS),
    };
  });

  server.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const promptName = request.params.name;
    defaultLogger.info(`Handling prompts/get request for: ${promptName}`);

    const prompt = PROMPTS[promptName];
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptName}`);
    }

    // Handle specific prompt implementations based on the prompt name
    switch (promptName) {
      case "debug-trace":
        return handleDebugTracePrompt(request.params.arguments || {});
      case "analyze-service":
        return handleAnalyzeServicePrompt(request.params.arguments || {});
      case "explore-errors":
        return handleExploreErrorsPrompt(request.params.arguments || {});
      default:
        throw new Error(`Prompt implementation not found for: ${promptName}`);
    }
  });
}
#!/usr/bin/env node
import { defaultLogger } from "./utils/index.js";
import { McpServer } from "./utils/server.js";


async function main() {
	try {
		// Create and start the MCP server
		const server = new McpServer({
			name: "newrelic-mcp-server",
			version: "1.0.0",
			transportType: "stdio",
			logger: defaultLogger,
		});

		// Start the server
		await server.start();

		// Handle process termination signals
		process.on("SIGINT", async () => {
			defaultLogger.info("Received SIGINT signal, shutting down...");
			await server.stop();
			process.exit(0);
		});

		process.on("SIGTERM", async () => {
			defaultLogger.info("Received SIGTERM signal, shutting down...");
			await server.stop();
			process.exit(0);
		});

		defaultLogger.info("MCP server is running. Press Ctrl+C to stop.");
	} catch (error) {
		defaultLogger.error("Failed to start MCP server", error);
		process.exit(1);
	}
}

// Start the application
main().catch((error) => {
	defaultLogger.error("Unhandled error", error);
	process.exit(1);
});

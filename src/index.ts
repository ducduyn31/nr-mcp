#!/usr/bin/env node
import { defaultLogger } from "./utils/index.js";
import { McpServer } from "./utils/server.js";
import { initializeServices } from "./services/index.js";

const requiredEnvVars = [
	"NEW_RELIC_API_KEY",
	"NEW_RELIC_ACCOUNT_ID",
	"NEW_RELIC_REGION",
];

async function main() {
	try {
		for (const envVar of requiredEnvVars) {
			if (!process.env[envVar]) {
				throw new Error(`Missing required environment variable: ${envVar}`);
			}
		}

		initializeServices({
			newRelicConfig: {
				apiKey: process.env.NEW_RELIC_API_KEY as string,
				accountId: process.env.NEW_RELIC_ACCOUNT_ID as string,
				region: process.env.NEW_RELIC_REGION as "US" | "EU",
			},
		});

		const server = new McpServer({
			name: "newrelic-mcp-server",
			version: "1.8.4", // x-release-please-version
			transportType: "stdio",
			logger: defaultLogger,
		});

		await server.start();

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

main().catch((error) => {
	defaultLogger.error("Unhandled error", error);
	process.exit(1);
});

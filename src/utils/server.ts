import { McpServer as MCP } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import type { TransportAdapter } from "../transports/transport-adapter.js";
import type { LoggingMessageSender } from "./types.js";
import { createTransportAdapter } from "../transports/transport-adapter.js";
import { HelloWorldSchema, helloWorldTool } from "../tools/hello-world.js";
import type { LoggingMessageNotification } from "@modelcontextprotocol/sdk/types.js";
import { type Logger, McpLoggerStrategy, createMcpLogger } from "./logger/index.js";

/**
 * Configuration options for the MCP server
 */
export interface McpServerConfig {
	/**
	 * Name of the server
	 */
	name: string;

	/**
	 * Version of the server
	 */
	version: string;

	/**
	 * Transport type to use
	 */
	transportType: "stdio" | "sse";

	/**
	 * Additional server options
	 */
	options?: ServerOptions;

	/**
	 * Logger instance to use
	 */
	logger?: Logger;
}

/**
 * McpServer class that wraps the Server from the MCP SDK with a transport adapter
 */
export class McpServer implements LoggingMessageSender {
	private mcpServer: MCP;
	private transportAdapter: TransportAdapter;
	private transport: Transport | null = null;
	private currentLogger: Logger;

	/**
	 * Creates a new McpServer instance
	 * @param config Server configuration
	 */
	constructor(private config: McpServerConfig) {
		// Initialize logger
		this.currentLogger = config.logger || createMcpLogger();
		this.currentLogger.info(`Initializing MCP server: ${config.name} v${config.version}`);

		// Create the MCP server
		this.mcpServer = new MCP(
			{
				name: config.name,
				version: config.version,
			},
			config.options,
		);

		this.initLogger();

		// Create the transport adapter
		this.transportAdapter = createTransportAdapter(config.transportType);

		// Register tools
		this.registerTools();
	}

	/**
	 * Registers all tools with the MCP server
	 */
	private registerTools(): void {
		this.currentLogger.info("Registering tools");

		// Register the hello world tool
		this.mcpServer.tool(
			"hello-world",
			"A simple hello world tool that returns a greeting",
			HelloWorldSchema,
			helloWorldTool,
		);
	}

	/**
	 * Starts the MCP server
	 */
	async start(): Promise<void> {
		this.currentLogger.info("Starting MCP server");

		try {
			// Create the transport
			this.transport = await this.transportAdapter.createTransport();

			// Connect the MCP server to the transport
			await this.mcpServer.connect(this.transport);

			this.currentLogger.info("MCP server started successfully");
		} catch (error) {
			this.currentLogger.error("Failed to start MCP server", error);
			throw error;
		}
	}

	/**
	 * Stops the MCP server
	 */
	async stop(): Promise<void> {
		this.currentLogger.info("Stopping MCP server");

		try {
			if (this.transport) {
				await this.mcpServer.close();
				this.transport = null;
			}

			this.currentLogger.info("MCP server stopped successfully");
		} catch (error) {
			this.currentLogger.error("Failed to stop MCP server", error);
			throw error;
		}
	}

	/**
	 * Gets the underlying MCP server instance
	 * @returns The MCP server instance
	 */
	getMcpServer(): MCP {
		return this.mcpServer;
	}

	/**
	 * Sends a logging message to the MCP server
	 * @param params The logging message parameters
	 */
	sendLoggingMessage(params: LoggingMessageNotification["params"]): void {
		this.mcpServer.server.sendLoggingMessage(params);
	}

	/**
	 * Attaches MCP server with logger and vice versa
	 */
	private initLogger(): void {
		const strategy = this.currentLogger.getStrategy();
		if (strategy instanceof McpLoggerStrategy) {
			strategy.attachServer(this.mcpServer.server);
			this.currentLogger.info("MCP server logger set successfully");
		}
	}
}

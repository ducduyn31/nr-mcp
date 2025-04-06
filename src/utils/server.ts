import { McpServer as MCP } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import type { TransportAdapter } from "../transports/transport-adapter.js";
import type { LoggingMessageSender } from "./types.js";
import { createTransportAdapter } from "../transports/transport-adapter.js";
import { defaultContainer, type Constructor } from "./service-container.js";
import { EventBus, EventType } from "./event-bus.js";
import { registerAllTools } from "../tools/index.js";
import { registerAllPrompts } from "../prompts/index.js";
import {
	ListResourcesRequestSchema,
	ListResourceTemplatesRequestSchema,
	ReadResourceRequestSchema,
	type LoggingMessageNotification,
} from "@modelcontextprotocol/sdk/types.js";
import {
	type Logger,
	McpLoggerStrategy,
	createMcpLogger,
} from "./logger/index.js";
import {
	listAllResources,
	listAllResourceTemplates,
	readResource,
} from "../resources/index.js";

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
	private schemaUpdateHandlers: Map<string, () => void> = new Map();

	/**
	 * Creates a new McpServer instance
	 * @param config Server configuration
	 */
	constructor(private config: McpServerConfig) {
		// Initialize logger
		this.currentLogger = config.logger || createMcpLogger();
		this.currentLogger.info(
			`Initializing MCP server: ${config.name} v${config.version}`,
		);

		// Create the MCP server with resource capabilities
		this.mcpServer = new MCP(
			{
				name: config.name,
				version: config.version,
			},
			{
				...config.options,
				capabilities: {
					...config.options?.capabilities,
					resources: {},
					prompts: {},
				},
			},
		);

		this.initLogger();

		// Create the transport adapter
		this.transportAdapter = createTransportAdapter(config.transportType);

		// Register tools, resources, and prompts
		this.registerTools();
		this.registerResources();
		this.registerPrompts();
		this.registerEventHandlers();
	}

	/**
	 * Registers all tools with the MCP server
	 */
	private registerTools(): void {
		this.currentLogger.info("Registering tools");

		// Use the centralized tool registry to register all tools
		registerAllTools(this.mcpServer);
	}

	/**
	 * Registers all resources with the MCP server
	 */
	private registerResources(): void {
		this.currentLogger.info("Registering resources");

		this.mcpServer.server.setRequestHandler(
			ListResourcesRequestSchema,
			async () => {
				this.currentLogger.info("Handling resources/list request");
				return await listAllResources();
			},
		);

		this.mcpServer.server.setRequestHandler(
			ListResourceTemplatesRequestSchema,
			async () => {
				this.currentLogger.info("Handling resource templates/list request");
				return await listAllResourceTemplates();
			},
		);

		this.mcpServer.server.setRequestHandler(
			ReadResourceRequestSchema,
			async (request) => {
				const uri = request.params.uri;
				this.currentLogger.info(
					`Handling resources/read request for URI: ${uri}`,
				);

				// Use the centralized resource registry to handle the request
				return await readResource(uri, {
					limit: 100,
					timeRange: 60, // Default options for logs resources
				});
			},
		);
	}

	/**
	 * Registers all prompts with the MCP server
	 */
	private registerPrompts(): void {
		this.currentLogger.info("Registering prompts");

		// Use the centralized prompt registry to register all prompts
		registerAllPrompts(this.mcpServer);
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

	/**
	 * Registers event handlers for various services
	 */
	private registerEventHandlers(): void {
		this.currentLogger.info("Registering event handlers");
		
		// Register schema update handler
		this.registerSchemaUpdateHandler();
	}

	/**
	 * Registers a handler for schema updates
	 */
	private registerSchemaUpdateHandler(): void {
		this.currentLogger.info("Registering schema update handler");

		// Get the EventBus from the service container
		const eventBus = defaultContainer.get(
			EventBus as unknown as Constructor<EventBus>
		) as EventBus;
		
		// Subscribe to schema updated events
		eventBus.subscribe(EventType.SCHEMA_UPDATED, (payload) => {
			const tableName = payload.data as string;
			this.currentLogger.info(`Schema updated for table: ${tableName}`);
			
			// Send notification that the schema resource has been updated
			const resourceUris = [
				`newrelic-schema://table/${tableName}`,
				"newrelic-schema://list"
			];

			// Send the notification to the MCP server
			for (const uri of resourceUris) {
				this.mcpServer.server.sendResourceUpdated({
					uri,
				});
			}
			
			this.currentLogger.info(`Sent resources/updated notification for: ${resourceUris.join(", ")}`);
		});
		
	}
}

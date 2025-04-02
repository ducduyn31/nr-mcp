import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

/**
 * Interface for transport adapters that can be used with the McpServer
 */
export interface TransportAdapter {
	/**
	 * Creates a new transport instance
	 * @returns A Promise that resolves to a transport instance that implements the MCP Transport interface
	 */
	createTransport(): Promise<Transport>;
}

/**
 * Creates a transport adapter for the specified type
 * @param type The type of transport adapter to create
 * @returns A transport adapter instance
 */
export function createTransportAdapter(
	type: "stdio" | "sse",
): TransportAdapter {
	switch (type) {
		case "stdio":
			return new StdioTransportAdapter();
		case "sse":
			throw new Error("SSE transport adapter not implemented yet");
		default:
			throw new Error(`Unsupported transport type: ${type}`);
	}
}

/**
 * Transport adapter for stdio communication
 */
export class StdioTransportAdapter implements TransportAdapter {
	/**
	 * Creates a new stdio transport instance
	 * @returns A stdio transport instance
	 */
	async createTransport(): Promise<Transport> {
		// Import dynamically to avoid circular dependencies
		const { StdioTransport } = await import("./stdio-transport.js");
		return new StdioTransport();
	}
}

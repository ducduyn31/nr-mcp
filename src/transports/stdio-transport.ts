import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import {
	ReadBuffer,
	serializeMessage,
} from "@modelcontextprotocol/sdk/shared/stdio.js";
import { defaultLogger } from "../utils/logger/index.js";
import process from "node:process";

/**
 * A transport adapter that uses standard input/output for communication
 */
export class StdioTransport implements Transport {
	private _readBuffer: ReadBuffer;
	private _started: boolean;
	private _ondata: (chunk: Buffer) => void;
	private _onerror: (error: Error) => void;

	// Transport interface callbacks
	public onclose?: () => void;
	public onerror?: (error: Error) => void;
	public onmessage?: (message: JSONRPCMessage) => void;
	public sessionId?: string;

	/**
	 * Creates a new StdioTransport instance
	 */
	constructor(
		private _stdin = process.stdin,
		private _stdout = process.stdout,
	) {
		defaultLogger.info("Initializing StdioTransport");
		this._readBuffer = new ReadBuffer();
		this._started = false;

		// Arrow functions to bind `this` properly, while maintaining function identity
		this._ondata = (chunk: Buffer) => {
			this._readBuffer.append(chunk);
			this.processReadBuffer();
		};

		this._onerror = (error: Error) => {
			this.onerror?.(error);
		};
	}

	/**
	 * Starts listening for messages on stdin
	 */
	async start(): Promise<void> {
		if (this._started) {
			throw new Error("StdioTransport already started!");
		}

		defaultLogger.info("StdioTransport starting to listen for messages");
		this._started = true;
		this._stdin.on("data", this._ondata);
		this._stdin.on("error", this._onerror);
	}

	/**
	 * Process the read buffer and emit messages
	 */
	private processReadBuffer(): void {
		while (true) {
			try {
				const message = this._readBuffer.readMessage();
				if (message === null) {
					break;
				}
				this.onmessage?.(message);
			} catch (error) {
				this.onerror?.(error as Error);
			}
		}
	}

	/**
	 * Sends a message through the transport
	 * @param message The message to send
	 */
	async send(message: JSONRPCMessage): Promise<void> {
		return new Promise((resolve) => {
			const json = serializeMessage(message);
			if (this._stdout.write(json)) {
				resolve();
			} else {
				this._stdout.once("drain", resolve);
			}
		});
	}

	/**
	 * Closes the transport
	 */
	async close(): Promise<void> {
		// Remove our event listeners
		this._stdin.off("data", this._ondata);
		this._stdin.off("error", this._onerror);

		// Check if we were the only data listener
		const remainingDataListeners = this._stdin.listenerCount("data");
		if (remainingDataListeners === 0) {
			// Only pause stdin if we were the only listener
			this._stdin.pause();
		}

		// Clear the buffer and notify closure
		this._readBuffer.clear();
		this.onclose?.();

		defaultLogger.info("StdioTransport closed");
	}
}

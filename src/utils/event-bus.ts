import { defaultLogger } from "./logger/index.js";

/**
 * Event types supported by the event bus
 */
export enum EventType {
	SCHEMA_UPDATED = "schema/updated",
	RESOURCE_UPDATED = "resource/updated",
}

/**
 * Event payload interface
 */
export interface EventPayload {
	type: string;
	data: unknown;
}

/**
 * Event handler function type
 */
export type EventHandler = (payload: EventPayload) => void;

/**
 * Central event bus for managing pubsub behavior
 */
export class EventBus {
	private subscribers: Map<string, Set<EventHandler>> = new Map();

	/**
	 * Constructor
	 */
	constructor() {
		defaultLogger.info("Event bus initialized");
	}

	/**
	 * Subscribe to events with a specific prefix
	 * @param eventPrefix The event prefix to subscribe to (e.g., "schema/")
	 * @param handler The event handler function
	 * @returns A function to unsubscribe
	 */
	public subscribe(eventPrefix: string, handler: EventHandler): () => void {
		if (!this.subscribers.has(eventPrefix)) {
			this.subscribers.set(eventPrefix, new Set());
		}

		this.subscribers.get(eventPrefix)?.add(handler);
		defaultLogger.info(`Subscribed to events with prefix: ${eventPrefix}`);

		// Return unsubscribe function
		return () => this.unsubscribe(eventPrefix, handler);
	}

	/**
	 * Unsubscribe from events with a specific prefix
	 * @param eventPrefix The event prefix to unsubscribe from
	 * @param handler The event handler function to remove
	 */
	public unsubscribe(eventPrefix: string, handler: EventHandler): void {
		const handlers = this.subscribers.get(eventPrefix);
		if (handlers) {
			handlers.delete(handler);
			if (handlers.size === 0) {
				this.subscribers.delete(eventPrefix);
			}
			defaultLogger.info(
				`Unsubscribed from events with prefix: ${eventPrefix}`,
			);
		}
	}

	/**
	 * Publish an event to all subscribers
	 * @param type The event type
	 * @param data The event data
	 */
	public publish(type: string, data: unknown): void {
		const payload: EventPayload = { type, data };

		try {
			defaultLogger.info(`Publishing event: ${type}`);

			// Notify all subscribers that match the event prefix
			for (const [prefix, handlers] of this.subscribers.entries()) {
				if (type.startsWith(prefix)) {
					for (const handler of handlers) {
						try {
							handler(payload);
						} catch (error) {
							defaultLogger.error(
								`Error in event handler for ${prefix}`,
								error,
							);
						}
					}
				}
			}
		} catch (error) {
			defaultLogger.error(`Failed to publish event: ${type}`, error);
		}
	}
}

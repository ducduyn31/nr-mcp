import { defaultLogger } from "./logger/index.js";
import type { Logger } from "./logger/index.js";
import type { NewRelicApiConfig } from "../services/new-relic-base-service.js";
import { NewRelicLogsService } from "../services/new-relic-logs-service.js";

/**
 * Type for a constructor function
 */
export type Constructor<T> = { new (...args: unknown[]): T };

/**
 * Interface for service container configuration
 */
export interface ServiceContainerConfig {
	/**
	 * New Relic API configuration
	 */
	newRelicConfig?: NewRelicApiConfig;

	/**
	 * Logger instance to use
	 */
	logger?: Logger;
}

/**
 * Service container for managing service instances
 */
export class ServiceContainer {
	private readonly logger: Logger;
	private readonly services: Map<string, unknown> = new Map();
	private readonly newRelicConfig?: NewRelicApiConfig;

	/**
	 * Creates a new service container
	 * @param config Service container configuration
	 */
	constructor(config: ServiceContainerConfig = {}) {
		this.logger = config.logger || defaultLogger;
		this.newRelicConfig = config.newRelicConfig;

		this.logger.info("Service container initialized");
	}

	/**
	 * Gets a service instance by type, creating it if it doesn't exist
	 * @param serviceType Service type constructor
	 * @returns Service instance
	 */
	get<T>(serviceType: Constructor<T>): T {
		const serviceName = serviceType.name;

		// Check if service already exists
		if (this.services.has(serviceName)) {
			return this.services.get(serviceName) as T;
		}

		// Create the service based on type
		let service: T;

		if (serviceType === NewRelicLogsService) {
			if (!this.newRelicConfig) {
				throw new Error(
					"New Relic configuration is required for NewRelicLogsService",
				);
			}

			service = new NewRelicLogsService(this.newRelicConfig) as T;
		} else {
			throw new Error(`Unknown service type: ${serviceName}`);
		}

		// Store the service instance
		this.services.set(serviceName, service);
		this.logger.info(`Created service instance: ${serviceName}`);

		return service;
	}

	/**
	 * Registers a service instance with the container
	 * @param serviceType Service type constructor
	 * @param instance Service instance
	 */
	register<T>(serviceType: Constructor<T>, instance: T): void {
		const serviceName = serviceType.name;
		this.services.set(serviceName, instance);
		this.logger.info(`Registered service instance: ${serviceName}`);
	}

	/**
	 * Checks if a service is registered
	 * @param serviceType Service type constructor
	 * @returns True if the service is registered
	 */
	has<T>(serviceType: Constructor<T>): boolean {
		return this.services.has(serviceType.name);
	}

	/**
	 * Gets all service instances of a specific type
	 * @param serviceType Service type constructor
	 * @returns Array of service instances of the specified type
	 */
	getAll<T>(serviceType: Constructor<T>): T[] {
		const result: T[] = [];

		// Iterate through all services and check if they are instances of the specified type
		for (const [name, instance] of this.services.entries()) {
			if (instance instanceof serviceType) {
				result.push(instance as T);
			}
		}

		this.logger.info(`Found ${result.length} instances of ${serviceType.name}`);
		return result;
	}

	/**
	 * Clears all registered services
	 */
	clear(): void {
		this.services.clear();
		this.logger.info("Service container cleared");
	}
}

// Create a default service container instance
export const defaultContainer = new ServiceContainer();

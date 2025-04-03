import {
	defaultContainer,
	type Constructor,
} from "../utils/service-container.js";
import type { NewRelicApiConfig } from "./new-relic-base-service.js";
import { NewRelicLogsService } from "./new-relic-logs-service.js";

/**
 * Configuration for service registry
 */
export interface ServiceRegistryConfig {
	/**
	 * New Relic API configuration
	 */
	newRelicConfig?: NewRelicApiConfig;
}

/**
 * Initializes all services and registers them with the service container
 * @param config Service registry configuration
 */
export function initializeServices(config: ServiceRegistryConfig = {}): void {
	if (config.newRelicConfig) {
		const logsService = new NewRelicLogsService(config.newRelicConfig);
		// Use a type assertion to help TypeScript understand the constructor type
		registerService(NewRelicLogsService, logsService);
	}
}

/**
 * Helper function to register a service with the container
 * @param serviceConstructor Service constructor
 * @param instance Service instance
 */
function registerService<T>(serviceConstructor: unknown, instance: T): void {
	// Use a type assertion to convert the constructor to the expected type
	const ctor = serviceConstructor as Constructor<T>;
	defaultContainer.register(ctor, instance);
}

import {
	defaultContainer,
	type Constructor,
} from "../utils/service-container.js";
import type { NewRelicApiConfig } from "./new-relic-base-service.js";
import { NewRelicLogsService } from "./new-relic-logs-service.js";
import { NewRelicTagsService } from "./new-relic-tags-service.js";
import { NewRelicDashboardsService } from "./new-relic-dashboards-service.js";
import { NewRelicNrqlService } from "./new-relic-nrql-service.js";
import { NewRelicSchemaService } from "./new-relic-schema-service.js";
import { EventBus } from "../utils/event-bus.js";

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
	// Initialize and register the EventBus service
	const eventBus = new EventBus();
	registerService(EventBus, eventBus);
	
	if (config.newRelicConfig) {
		const logsService = new NewRelicLogsService(config.newRelicConfig);
		// Use a type assertion to help TypeScript understand the constructor type
		registerService(NewRelicLogsService, logsService);

		// Initialize and register the tags service
		const tagsService = new NewRelicTagsService(config.newRelicConfig);
		registerService(NewRelicTagsService, tagsService);

		// Initialize and register the dashboards service
		const dashboardsService = new NewRelicDashboardsService(
			config.newRelicConfig,
		);
		registerService(NewRelicDashboardsService, dashboardsService);

		// Initialize and register the NRQL service
		const nrqlService = new NewRelicNrqlService(config.newRelicConfig);
		registerService(NewRelicNrqlService, nrqlService);

		// Initialize and register the Schema service
		const schemaService = new NewRelicSchemaService(config.newRelicConfig);
		registerService(NewRelicSchemaService, schemaService);
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

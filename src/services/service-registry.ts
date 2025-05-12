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
	const eventBus = new EventBus();
	registerService(EventBus, eventBus);

	if (config.newRelicConfig) {
		const logsService = new NewRelicLogsService(config.newRelicConfig);
		registerService(NewRelicLogsService, logsService);

		const tagsService = new NewRelicTagsService(config.newRelicConfig);
		registerService(NewRelicTagsService, tagsService);

		const dashboardsService = new NewRelicDashboardsService(
			config.newRelicConfig,
		);
		registerService(NewRelicDashboardsService, dashboardsService);

		const nrqlService = new NewRelicNrqlService(config.newRelicConfig);
		registerService(NewRelicNrqlService, nrqlService);

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
	const ctor = serviceConstructor as Constructor<T>;
	defaultContainer.register(ctor, instance);
}

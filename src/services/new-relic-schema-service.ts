import { NewRelicBaseService } from "./new-relic-base-service.js";
import type { NewRelicApiConfig } from "./new-relic-base-service.js";
import { defaultLogger } from "../utils/logger/index.js";
import { NewRelicNrqlService } from "./new-relic-nrql-service.js";
import { defaultContainer, type Constructor } from "../utils/index.js";
import { EventBus, EventType } from "../utils/event-bus.js";

/**
 * Interface for table schema cache entry
 */
export interface TableSchemaCache {
  tableName: string;
  schema: string[];
  timestamp: number;
  expiresAt: number;
}

/**
 * Service for caching New Relic table schemas
 */
export class NewRelicSchemaService extends NewRelicBaseService {
  /**
   * In-memory cache for table schemas
   * Key: table name, Value: schema cache entry
   */
  private schemaCache: Map<string, TableSchemaCache> = new Map();

  /**
   * Cache expiration time in milliseconds (24 hours)
   */
  private readonly CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

  /**
   * Event bus for publishing events
   */
  private eventBus: EventBus;

  /**
   * Creates a new NewRelicSchemaService instance
   * @param config New Relic API configuration
   */
  constructor(config: NewRelicApiConfig) {
    super(config);
    
    // Get the EventBus from the service container
    this.eventBus = defaultContainer.get(
      EventBus as unknown as Constructor<EventBus>
    ) as EventBus;
    
    defaultLogger.info("Initialized New Relic Schema Service");
  }

  /**
   * Get the schema for a table, using cache if available
   * @param tableName The name of the table to get the schema for
   * @returns Array of column names in the table
   */
  async getTableSchema(tableName: string): Promise<string[]> {
    try {
      // Check if schema is in cache and not expired
      const cachedSchema = this.schemaCache.get(tableName);
      if (cachedSchema && Date.now() < cachedSchema.expiresAt) {
        defaultLogger.info(`Using cached schema for table: ${tableName}`);
        return cachedSchema.schema;
      }

      // If not in cache or expired, fetch the schema
      defaultLogger.info(`Fetching schema for table: ${tableName}`);
      const schema = await this.fetchTableSchema(tableName);
      
      // Cache the schema
      this.cacheTableSchema(tableName, schema);
      
      // Publish event that schema has been updated
      this.eventBus.publish(EventType.SCHEMA_UPDATED, tableName);
      return schema;
    } catch (error) {
      defaultLogger.error(`Failed to get schema for table: ${tableName}`, error);
      throw error;
    }
  }

  /**
   * Fetch the schema for a table from New Relic
   * @param tableName The name of the table to fetch the schema for
   * @returns Array of column names in the table
   */
  private async fetchTableSchema(tableName: string): Promise<string[]> {
    try {
      // Get the NRQL service from the container
      const nrqlService = defaultContainer.get(
        NewRelicNrqlService as unknown as Constructor<NewRelicNrqlService>,
      ) as NewRelicNrqlService;

      // Execute the keyset query
      const query = `SELECT keyset() FROM ${tableName} LIMIT 1`;
      const result = await nrqlService.executeNrqlQuery(query);

      // Extract the schema from the results
      if (result.results.length > 0 && result.results[0].keyset) {
        const keyset = result.results[0].keyset as string[];
        defaultLogger.info(`Retrieved schema for table ${tableName}: ${keyset.length} columns`);
        return keyset;
      }

      // If no keyset found, return empty array
      defaultLogger.warning(`No schema found for table: ${tableName}`);
      return [];
    } catch (error) {
      defaultLogger.error(`Failed to fetch schema for table: ${tableName}`, error);
      throw error;
    }
  }

  /**
   * Cache the schema for a table
   * @param tableName The name of the table
   * @param schema Array of column names in the table
   */
  public cacheTableSchema(tableName: string, schema: string[]): void {
    const now = Date.now();
    const cacheEntry: TableSchemaCache = {
      tableName,
      schema,
      timestamp: now,
      expiresAt: now + this.CACHE_EXPIRATION_MS,
    };

    this.schemaCache.set(tableName, cacheEntry);
    defaultLogger.info(`Cached schema for table ${tableName} (${schema.length} columns)`);
  }

  /**
   * Check if a table schema is cached and not expired
   * @param tableName The name of the table to check
   * @returns True if the schema is cached and not expired, false otherwise
   */
  isTableSchemaCached(tableName: string): boolean {
    const cachedSchema = this.schemaCache.get(tableName);
    return !!cachedSchema && Date.now() < cachedSchema.expiresAt;
  }

  /**
   * Clear the schema cache for a specific table
   * @param tableName The name of the table to clear the cache for
   */
  clearTableSchemaCache(tableName: string): void {
    if (this.schemaCache.has(tableName)) {
      this.schemaCache.delete(tableName);
      defaultLogger.info(`Cleared schema cache for table: ${tableName}`);
      
      // Publish event that schema cache has been cleared
      this.eventBus.publish(EventType.SCHEMA_UPDATED, tableName);
    }
  }

  /**
   * Clear the entire schema cache
   */
  clearAllSchemaCaches(): void {
    // Get all table names before clearing
    const tableNames = Array.from(this.schemaCache.keys());
    
    // Clear the cache
    this.schemaCache.clear();
    defaultLogger.info("Cleared all schema caches");
    
    // Publish events for each table
    for (const tableName of tableNames) {
      this.eventBus.publish(EventType.SCHEMA_UPDATED, tableName);
    }
  }

  /**
   * Get cache statistics
   * @returns Object with cache statistics
   */
  getCacheStats(): {
    totalCachedSchemas: number;
    cachedTables: Array<{ tableName: string; columnCount: number; expiresIn: number }>;
  } {
    const cachedTables = Array.from(this.schemaCache.values()).map((entry) => ({
      tableName: entry.tableName,
      columnCount: entry.schema.length,
      expiresIn: Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000)),
    }));

    return {
      totalCachedSchemas: this.schemaCache.size,
      cachedTables,
    };
  }
}
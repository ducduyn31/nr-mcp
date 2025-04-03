import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeServices, type ServiceRegistryConfig } from '../../src/services/service-registry.js';
import { defaultContainer } from '../../src/utils/service-container.js';
import { NewRelicLogsService } from '../../src/services/new-relic-logs-service.js';
import type { Constructor } from '../../src/utils/service-container.js';
import type { NewRelicApiConfig } from '../../src/services/new-relic-base-service.js';

// Mock the NewRelicLogsService
vi.mock('../../src/services/new-relic-logs-service.js', () => {
  return {
    NewRelicLogsService: vi.fn().mockImplementation(() => ({
      queryLogs: vi.fn()
    }))
  };
});

// Mock the service container
vi.mock('../../src/utils/service-container.js', () => {
  const mockContainer = {
    register: vi.fn(),
    get: vi.fn(),
    has: vi.fn(),
    getAll: vi.fn(),
    clear: vi.fn()
  };
  
  return {
    defaultContainer: mockContainer,
    ServiceContainer: vi.fn().mockImplementation(() => mockContainer)
  };
});

// Mock the logger
vi.mock('../../src/utils/logger/index.js', () => {
  return {
    defaultLogger: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warning: vi.fn()
    }
  };
});

describe('Service Registry', () => {
  const mockNewRelicConfig: NewRelicApiConfig = {
    apiKey: 'test-api-key',
    accountId: '12345'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize services with New Relic config', () => {
    const config: ServiceRegistryConfig = {
      newRelicConfig: mockNewRelicConfig
    };
    
    initializeServices(config);
    
    // Verify NewRelicLogsService was created with the correct config
    expect(NewRelicLogsService).toHaveBeenCalledWith(mockNewRelicConfig);
    
    // Verify the service was registered with the container
    expect(defaultContainer.register).toHaveBeenCalledWith(
      NewRelicLogsService,
      expect.any(Object)
    );
  });

  it('should not initialize New Relic services when config is missing', () => {
    initializeServices({});
    
    // Verify NewRelicLogsService was not created
    expect(NewRelicLogsService).not.toHaveBeenCalled();
    
    // Verify no services were registered
    expect(defaultContainer.register).not.toHaveBeenCalled();
  });

  it('should initialize with empty config', () => {
    // Should not throw an error
    expect(() => initializeServices()).not.toThrow();
    
    // Verify no services were registered
    expect(defaultContainer.register).not.toHaveBeenCalled();
  });
});
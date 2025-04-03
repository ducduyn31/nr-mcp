import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceContainer } from '../../src/utils/service-container.js';
import type { Constructor } from '../../src/utils/service-container.js';
import { NewRelicLogsService } from '../../src/services/new-relic-logs-service.js';
import type { NewRelicApiConfig } from '../../src/services/new-relic-base-service.js';

// Mock the NewRelicLogsService
vi.mock('../../src/services/new-relic-logs-service.js', () => {
  return {
    NewRelicLogsService: vi.fn().mockImplementation(() => ({
      queryLogs: vi.fn()
    }))
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

describe('ServiceContainer', () => {
  let container: ServiceContainer;
  const mockNewRelicConfig: NewRelicApiConfig = {
    apiKey: 'test-api-key',
    accountId: '12345'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    container = new ServiceContainer({
      newRelicConfig: mockNewRelicConfig
    });
  });

  it('should initialize correctly', () => {
    expect(container).toBeInstanceOf(ServiceContainer);
  });

  it('should create and return a service instance', () => {
    // Use type assertion to satisfy TypeScript
    const logsService = container.get(NewRelicLogsService as unknown as Constructor<NewRelicLogsService>);
    
    expect(logsService).toBeDefined();
    expect(NewRelicLogsService).toHaveBeenCalledWith(mockNewRelicConfig);
    
    // Getting the same service again should return the cached instance
    const logsService2 = container.get(NewRelicLogsService as unknown as Constructor<NewRelicLogsService>);
    expect(logsService2).toBe(logsService);
    expect(NewRelicLogsService).toHaveBeenCalledTimes(1);
  });

  it('should throw an error when requesting an unknown service type', () => {
    class UnknownService {}
    
    expect(() => container.get(UnknownService as Constructor<unknown>)).toThrow(
      'Unknown service type: UnknownService'
    );
  });

  it('should throw an error when requesting NewRelicLogsService without config', () => {
    const containerWithoutConfig = new ServiceContainer();
    
    expect(() => {
      containerWithoutConfig.get(NewRelicLogsService as unknown as Constructor<NewRelicLogsService>);
    }).toThrow('New Relic configuration is required for NewRelicLogsService');
  });

  it('should register and retrieve a service instance', () => {
    const mockService = { test: 'service' };
    class TestService {}
    
    container.register(TestService as Constructor<typeof mockService>, mockService);
    
    const retrievedService = container.get(TestService as Constructor<typeof mockService>);
    expect(retrievedService).toBe(mockService);
  });

  it('should check if a service is registered', () => {
    const mockService = { test: 'service' };
    class TestService {}
    
    expect(container.has(TestService as Constructor<typeof mockService>)).toBe(false);
    
    container.register(TestService as Constructor<typeof mockService>, mockService);
    
    expect(container.has(TestService as Constructor<typeof mockService>)).toBe(true);
  });

  it('should get all services of a specific type', () => {
    class BaseService {}
    class ServiceA extends BaseService {}
    class ServiceB extends BaseService {}
    
    const serviceA = new ServiceA();
    const serviceB = new ServiceB();
    
    container.register(ServiceA, serviceA);
    container.register(ServiceB, serviceB);
    container.register(
      NewRelicLogsService as unknown as Constructor<NewRelicLogsService>, 
      container.get(NewRelicLogsService as unknown as Constructor<NewRelicLogsService>)
    );
    
    const baseServices = container.getAll(BaseService);
    expect(baseServices).toHaveLength(2);
    expect(baseServices).toContain(serviceA);
    expect(baseServices).toContain(serviceB);
    
    const servicesA = container.getAll(ServiceA);
    expect(servicesA).toHaveLength(1);
    expect(servicesA[0]).toBe(serviceA);
  });

  it('should clear all registered services', () => {
    // Register a service
    const logsService = container.get(NewRelicLogsService as unknown as Constructor<NewRelicLogsService>);
    expect(container.has(NewRelicLogsService as unknown as Constructor<NewRelicLogsService>)).toBe(true);
    
    // Clear the container
    container.clear();
    
    // Container should be empty
    expect(container.has(NewRelicLogsService as unknown as Constructor<NewRelicLogsService>)).toBe(false);
    
    // Getting the service again should create a new instance
    const newLogsService = container.get(NewRelicLogsService as unknown as Constructor<NewRelicLogsService>);
    expect(newLogsService).not.toBe(logsService);
    expect(NewRelicLogsService).toHaveBeenCalledTimes(2);
  });
});
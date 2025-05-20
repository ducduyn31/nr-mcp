import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  initializeServices,
  type ServiceRegistryConfig,
} from "../../src/services/service-registry.js";
import { defaultContainer } from "../../src/utils/service-container.js";
import { NewRelicLogsService } from "../../src/services/new-relic-logs-service.js";
import type { NewRelicApiConfig } from "../../src/services/new-relic-base-service.js";

vi.mock("../../src/services/new-relic-logs-service.js", () => {
  return {
    NewRelicLogsService: vi.fn().mockImplementation(() => ({
      queryLogs: vi.fn(),
    })),
  };
});

vi.mock("../../src/utils/service-container.js", () => {
  const mockContainer = {
    register: vi.fn(),
    get: vi.fn(),
    has: vi.fn(),
    getAll: vi.fn(),
    clear: vi.fn(),
  };

  return {
    defaultContainer: mockContainer,
    ServiceContainer: vi.fn().mockImplementation(() => mockContainer),
  };
});

vi.mock("../../src/utils/logger/index.js", () => {
  return {
    defaultLogger: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warning: vi.fn(),
    },
  };
});

describe("Service Registry", () => {
  const mockNewRelicConfig: NewRelicApiConfig = {
    apiKey: "test-api-key",
    accountId: "12345",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize services with New Relic config", () => {
    const config: ServiceRegistryConfig = {
      newRelicConfig: mockNewRelicConfig,
    };

    initializeServices(config);

    expect(NewRelicLogsService).toHaveBeenCalledWith(mockNewRelicConfig);

    expect(defaultContainer.register).toHaveBeenCalledWith(
      NewRelicLogsService,
      expect.any(Object),
    );
  });

  it("should not initialize New Relic services when config is missing", () => {
    initializeServices({});

    expect(NewRelicLogsService).not.toHaveBeenCalled();

    expect(defaultContainer.register).toHaveBeenCalledTimes(1);
    expect(defaultContainer.register).toHaveBeenCalledWith(
      expect.any(Function), // EventBus constructor
      expect.any(Object), // EventBus instance
    );
  });

  it("should initialize with empty config", () => {
    expect(() => initializeServices()).not.toThrow();

    expect(defaultContainer.register).toHaveBeenCalledTimes(1);
    expect(defaultContainer.register).toHaveBeenCalledWith(
      expect.any(Function), // EventBus constructor
      expect.any(Object), // EventBus instance
    );
  });
});

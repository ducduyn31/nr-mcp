import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LoggingMessageSender } from '../src/utils/logger/types.js';
import {
  Logger,
  LogLevel,
  TextLoggerStrategy,
  JsonLoggerStrategy,
  type McpLoggerStrategy,
  createTextLogger,
  createJsonLogger,
  createMcpLogger
} from '../src/utils/logger/index.js';

describe('Logger', () => {
  // Spy on console methods
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TextLoggerStrategy', () => {
    it('should log messages with the correct format', () => {
      const textLogger = createTextLogger();
      textLogger.info('Info message');
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]') && expect.stringContaining('Info message')
      );

      textLogger.error('Error message');
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]') && expect.stringContaining('Error message')
      );
    });

    it('should handle all log levels', () => {
      // Set DEBUG env var for this test
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = 'true';
      
      try {
        const strategy = new TextLoggerStrategy();
        
        // Test each log level
        strategy.log(LogLevel.DEBUG, 'Debug message');
        strategy.log(LogLevel.INFO, 'Info message');
        strategy.log(LogLevel.NOTICE, 'Notice message');
        strategy.log(LogLevel.WARNING, 'Warning message');
        strategy.log(LogLevel.ERROR, 'Error message');
        strategy.log(LogLevel.CRITICAL, 'Critical message');
        strategy.log(LogLevel.ALERT, 'Alert message');
        strategy.log(LogLevel.EMERGENCY, 'Emergency message');
        
        // Verify console methods were called
        expect(console.debug).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledTimes(2); // INFO and NOTICE
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledTimes(4); // ERROR, CRITICAL, ALERT, EMERGENCY
      } finally {
        // Restore original DEBUG env var
        process.env.DEBUG = originalDebug;
      }
    });
  });

  describe('JsonLoggerStrategy', () => {
    it('should log messages in JSON format', () => {
      const jsonLogger = createJsonLogger();
      
      jsonLogger.info('Info message');
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"level":"info"')
      );

      jsonLogger.error('Error message');
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('"level":"error"')
      );
    });

    it('should handle all log levels', () => {
      // Set DEBUG env var for this test
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = 'true';
      
      try {
        const strategy = new JsonLoggerStrategy();
        
        // Test each log level
        strategy.log(LogLevel.DEBUG, 'Debug message');
        strategy.log(LogLevel.INFO, 'Info message');
        strategy.log(LogLevel.NOTICE, 'Notice message');
        strategy.log(LogLevel.WARNING, 'Warning message');
        strategy.log(LogLevel.ERROR, 'Error message');
        strategy.log(LogLevel.CRITICAL, 'Critical message');
        strategy.log(LogLevel.ALERT, 'Alert message');
        strategy.log(LogLevel.EMERGENCY, 'Emergency message');
        
        // Verify console methods were called
        expect(console.debug).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledTimes(2); // INFO and NOTICE
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledTimes(4); // ERROR, CRITICAL, ALERT, EMERGENCY
      } finally {
        // Restore original DEBUG env var
        process.env.DEBUG = originalDebug;
      }
    });
  });

  describe('McpLoggerStrategy', () => {
    it('should send logs to the MCP server', () => {
      // Create a mock server
      const mockServer = {
        sendLoggingMessage: vi.fn()
      };
      
      const mcpLogger = createMcpLogger(mockServer);
      
      mcpLogger.info('Info message');
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledTimes(1);
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: LogLevel.INFO,
        logger: 'mcp-server',
        data: expect.objectContaining({ message: 'Info message' })
      });
    });

    it('should handle all log levels', () => {
      // Create a mock server
      const mockServer = {
        sendLoggingMessage: vi.fn()
      };
      
      const mcpLogger = createMcpLogger(mockServer);
      
      // Test each log level
      mcpLogger.debug('Debug message');
      mcpLogger.info('Info message');
      mcpLogger.notice('Notice message');
      mcpLogger.warning('Warning message');
      mcpLogger.error('Error message');
      mcpLogger.critical('Critical message');
      mcpLogger.alert('Alert message');
      mcpLogger.emergency('Emergency message');
      
      // Verify sendLoggingMessage was called for each level
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledTimes(8);
      
      // Verify specific calls
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: LogLevel.DEBUG,
        logger: 'mcp-server',
        data: expect.objectContaining({ message: 'Debug message' })
      });
      
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: LogLevel.EMERGENCY,
        logger: 'mcp-server',
        data: expect.objectContaining({ message: 'Emergency message' })
      });
    });

    it('should buffer logs when no server is attached', () => {
      // Create an MCP logger without a server
      const mcpLogger = createMcpLogger();
      const mcpStrategy = mcpLogger.getStrategy() as McpLoggerStrategy;
      
      // Verify no server is attached
      expect(mcpStrategy.hasServer()).toBe(false);
      
      // Log some messages (should not throw)
      mcpLogger.info('Info message');
      mcpLogger.warning('Warning message');
      mcpLogger.error('Error message');
      
      // Verify buffer has logs
      expect(mcpStrategy.getBufferLength()).toBe(3);
      expect(mcpStrategy.getBufferSize()).toBeGreaterThan(0);
    });

    it('should flush buffer when server is attached', () => {
      // Create an MCP logger without a server
      const mcpLogger = createMcpLogger();
      const mcpStrategy = mcpLogger.getStrategy() as McpLoggerStrategy;
      
      // Log some messages to buffer
      mcpLogger.info('Info message');
      mcpLogger.warning('Warning message');
      
      // Create a mock server
      const mockServer = {
        sendLoggingMessage: vi.fn()
      };
      
      // Attach the server
      mcpStrategy.attachServer(mockServer);
      
      // Verify server is attached
      expect(mcpStrategy.hasServer()).toBe(true);
      
      // Verify buffer was flushed
      expect(mcpStrategy.getBufferLength()).toBe(0);
      
      // Verify logs were sent to server
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledTimes(2);
    });

    it('should respect buffer size limit', () => {
      // Create an MCP logger without a server
      const mcpLogger = createMcpLogger();
      const mcpStrategy = mcpLogger.getStrategy() as McpLoggerStrategy;
      
      // Generate a large payload
      const largeData = { largeField: 'x'.repeat(1024 * 1024) }; // 1MB of data
      
      // Add multiple large logs to exceed 4MB buffer
      for (let i = 0; i < 5; i++) {
        mcpLogger.info(`Large message ${i}`, largeData);
      }
      
      // Verify buffer size is capped at 4MB
      expect(mcpStrategy.getBufferSize()).toBeLessThanOrEqual(4 * 1024 * 1024);
      
      // Verify oldest logs were removed
      expect(mcpStrategy.getBufferLength()).toBeLessThan(5);
    });

    it('should include additional data in the log message', () => {
      // Create a mock server
      const mockServer = {
        sendLoggingMessage: vi.fn()
      };
      
      const mcpLogger = createMcpLogger(mockServer);
      
      const additionalData = { userId: 123, action: 'login' };
      mcpLogger.info('User action', additionalData);
      
      expect(mockServer.sendLoggingMessage).toHaveBeenCalledWith({
        level: LogLevel.INFO,
        logger: 'mcp-server',
        data: expect.objectContaining({
          userId: 123,
          action: 'login',
          message: 'User action'
        })
      });
    });
  });

  describe('Logger class', () => {
    it('should be a singleton', () => {
      const logger1 = Logger.getInstance();
      const logger2 = Logger.getInstance();
      
      expect(logger1).toBe(logger2);
    });

    it('should allow changing strategies', () => {
      const logger = Logger.getInstance();
      const textStrategy = new TextLoggerStrategy();
      const jsonStrategy = new JsonLoggerStrategy();
      
      logger.setStrategy(textStrategy);
      expect(logger.getStrategy()).toBe(textStrategy);
      
      logger.setStrategy(jsonStrategy);
      expect(logger.getStrategy()).toBe(jsonStrategy);
    });
  });
});
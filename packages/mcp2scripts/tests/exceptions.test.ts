/**
 * Tests for exception classes
 */

import { describe, it, expect } from 'vitest';
import {
  MCPError,
  MCPConnectionError,
  MCPToolError,
  MCPResourceError,
  MCPPromptError,
  MCPValidationError,
  MCPSamplingError,
  MCPElicitationError,
  MCPConfigError,
} from '../src/exceptions.js';

describe('MCPError', () => {
  it('should create error with message', () => {
    const error = new MCPError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('MCPError');
  });

  it('should be instance of Error', () => {
    const error = new MCPError('Test');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MCPError);
  });

  it('should have stack trace', () => {
    const error = new MCPError('Test');
    expect(error.stack).toBeDefined();
  });
});

describe('MCPConnectionError', () => {
  it('should inherit from MCPError', () => {
    const error = new MCPConnectionError('Connection failed');
    expect(error).toBeInstanceOf(MCPError);
    expect(error).toBeInstanceOf(MCPConnectionError);
    expect(error.name).toBe('MCPConnectionError');
    expect(error.message).toBe('Connection failed');
  });
});

describe('MCPToolError', () => {
  it('should inherit from MCPError', () => {
    const error = new MCPToolError('Tool failed');
    expect(error).toBeInstanceOf(MCPError);
    expect(error).toBeInstanceOf(MCPToolError);
    expect(error.name).toBe('MCPToolError');
  });
});

describe('MCPResourceError', () => {
  it('should inherit from MCPError', () => {
    const error = new MCPResourceError('Resource not found');
    expect(error).toBeInstanceOf(MCPError);
    expect(error).toBeInstanceOf(MCPResourceError);
    expect(error.name).toBe('MCPResourceError');
  });
});

describe('MCPPromptError', () => {
  it('should inherit from MCPError', () => {
    const error = new MCPPromptError('Prompt failed');
    expect(error).toBeInstanceOf(MCPError);
    expect(error).toBeInstanceOf(MCPPromptError);
    expect(error.name).toBe('MCPPromptError');
  });
});

describe('MCPValidationError', () => {
  it('should inherit from MCPError', () => {
    const error = new MCPValidationError('Validation failed');
    expect(error).toBeInstanceOf(MCPError);
    expect(error).toBeInstanceOf(MCPValidationError);
    expect(error.name).toBe('MCPValidationError');
  });
});

describe('MCPSamplingError', () => {
  it('should inherit from MCPError', () => {
    const error = new MCPSamplingError('Sampling failed');
    expect(error).toBeInstanceOf(MCPError);
    expect(error).toBeInstanceOf(MCPSamplingError);
    expect(error.name).toBe('MCPSamplingError');
  });
});

describe('MCPElicitationError', () => {
  it('should inherit from MCPError', () => {
    const error = new MCPElicitationError('Elicitation failed');
    expect(error).toBeInstanceOf(MCPError);
    expect(error).toBeInstanceOf(MCPElicitationError);
    expect(error.name).toBe('MCPElicitationError');
  });
});

describe('MCPConfigError', () => {
  it('should inherit from MCPError', () => {
    const error = new MCPConfigError('Config invalid');
    expect(error).toBeInstanceOf(MCPError);
    expect(error).toBeInstanceOf(MCPConfigError);
    expect(error.name).toBe('MCPConfigError');
  });
});

describe('Error catching', () => {
  it('should catch specific error types', () => {
    try {
      throw new MCPConnectionError('Network error');
    } catch (error) {
      expect(error).toBeInstanceOf(MCPConnectionError);
      expect(error).toBeInstanceOf(MCPError);
      if (error instanceof MCPConnectionError) {
        expect(error.message).toBe('Network error');
      }
    }
  });

  it('should differentiate between error types', () => {
    const connectionError = new MCPConnectionError('Connection');
    const toolError = new MCPToolError('Tool');

    expect(connectionError).toBeInstanceOf(MCPConnectionError);
    expect(connectionError).not.toBeInstanceOf(MCPToolError);

    expect(toolError).toBeInstanceOf(MCPToolError);
    expect(toolError).not.toBeInstanceOf(MCPConnectionError);
  });
});

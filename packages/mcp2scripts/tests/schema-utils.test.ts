/**
 * Tests for schema-utils module
 */

import { describe, it, expect } from 'vitest';
import {
  snakeToKebab,
  kebabToCamel,
  generateCommanderFromSchema,
  generateArgsBuilder,
} from '../src/schema-utils.js';

describe('snakeToKebab', () => {
  it('should convert snake_case to kebab-case', () => {
    expect(snakeToKebab('max_retries')).toBe('max-retries');
    expect(snakeToKebab('api_key')).toBe('api-key');
    expect(snakeToKebab('user_name')).toBe('user-name');
  });

  it('should handle single word', () => {
    expect(snakeToKebab('simple')).toBe('simple');
  });

  it('should handle multiple underscores', () => {
    expect(snakeToKebab('very_long_parameter_name')).toBe('very-long-parameter-name');
  });
});

describe('kebabToCamel', () => {
  it('should convert kebab-case to camelCase', () => {
    expect(kebabToCamel('max-retries')).toBe('maxRetries');
    expect(kebabToCamel('api-key')).toBe('apiKey');
    expect(kebabToCamel('user-name')).toBe('userName');
  });

  it('should handle single word', () => {
    expect(kebabToCamel('simple')).toBe('simple');
  });

  it('should handle multiple hyphens', () => {
    expect(kebabToCamel('very-long-parameter-name')).toBe('veryLongParameterName');
  });
});

describe('generateCommanderFromSchema', () => {
  it('should handle empty schema', () => {
    const schema = { type: 'object', properties: {} };
    const code = generateCommanderFromSchema(schema);
    expect(code).toContain('// No options required');
  });

  it('should generate option for string parameter', () => {
    const schema = {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to navigate',
        },
      },
    };
    const code = generateCommanderFromSchema(schema);
    expect(code).toContain("--url <value>");
    expect(code).toContain('URL to navigate');
  });

  it('should generate option for required string parameter', () => {
    const schema = {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to navigate',
        },
      },
      required: ['url'],
    };
    const code = generateCommanderFromSchema(schema);
    expect(code).toContain("--url <value>");
    expect(code).toContain('(required)');
  });

  it('should generate option for integer parameter', () => {
    const schema = {
      type: 'object',
      properties: {
        timeout: {
          type: 'integer',
          description: 'Timeout in milliseconds',
        },
      },
    };
    const code = generateCommanderFromSchema(schema);
    expect(code).toContain("--timeout <value>");
    expect(code).toContain('parseInt');
  });

  it('should generate option for number parameter', () => {
    const schema = {
      type: 'object',
      properties: {
        ratio: {
          type: 'number',
          description: 'Aspect ratio',
        },
      },
    };
    const code = generateCommanderFromSchema(schema);
    expect(code).toContain("--ratio <value>");
    expect(code).toContain('parseFloat');
  });

  it('should generate option for boolean parameter', () => {
    const schema = {
      type: 'object',
      properties: {
        verbose: {
          type: 'boolean',
          description: 'Enable verbose output',
        },
      },
    };
    const code = generateCommanderFromSchema(schema);
    expect(code).toContain("--verbose");
    expect(code).toContain('Enable verbose output');
  });

  it('should generate option for array parameter', () => {
    const schema = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          description: 'Tags to apply',
        },
      },
    };
    const code = generateCommanderFromSchema(schema);
    expect(code).toContain("--tags <items...>");
  });

  it('should generate option for object parameter', () => {
    const schema = {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          description: 'Configuration object',
        },
      },
    };
    const code = generateCommanderFromSchema(schema);
    expect(code).toContain("--config <json>");
    expect(code).toContain('JSON string');
  });

  it('should handle enum values', () => {
    const schema = {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: 'Output format',
          enum: ['json', 'xml', 'yaml'],
        },
      },
    };
    const code = generateCommanderFromSchema(schema);
    expect(code).toContain("--format <value>");
    expect(code).toContain('Choices: "json", "xml", "yaml"');
  });

  it('should convert snake_case to kebab-case in option names', () => {
    const schema = {
      type: 'object',
      properties: {
        max_retries: {
          type: 'integer',
          description: 'Maximum retry attempts',
        },
      },
    };
    const code = generateCommanderFromSchema(schema);
    expect(code).toContain("--max-retries");
  });

  it('should escape quotes in descriptions', () => {
    const schema = {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Say "hello"',
        },
      },
    };
    const code = generateCommanderFromSchema(schema);
    expect(code).toContain('Say \\"hello\\"');
  });

  it('should handle multiple parameters', () => {
    const schema = {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to navigate',
        },
        timeout: {
          type: 'integer',
          description: 'Timeout in ms',
        },
        verbose: {
          type: 'boolean',
          description: 'Verbose output',
        },
      },
      required: ['url'],
    };
    const code = generateCommanderFromSchema(schema);
    expect(code).toContain("--url");
    expect(code).toContain("--timeout");
    expect(code).toContain("--verbose");
  });
});

describe('generateArgsBuilder', () => {
  it('should handle empty schema', () => {
    const schema = { type: 'object', properties: {} };
    const code = generateArgsBuilder(schema);
    expect(code).toContain('const args = {}');
  });

  it('should generate validation for required parameters', () => {
    const schema = {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to navigate',
        },
      },
      required: ['url'],
    };
    const code = generateArgsBuilder(schema);
    expect(code).toContain('if (!options.url)');
    expect(code).toContain('--url is required');
    expect(code).toContain('process.exit(1)');
  });

  it('should generate args building code for string parameter', () => {
    const schema = {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL',
        },
      },
    };
    const code = generateArgsBuilder(schema);
    expect(code).toContain("if (options.url !== undefined)");
    expect(code).toContain("args['url'] = options.url");
  });

  it('should generate args building code for integer parameter', () => {
    const schema = {
      type: 'object',
      properties: {
        timeout: {
          type: 'integer',
          description: 'Timeout',
        },
      },
    };
    const code = generateArgsBuilder(schema);
    expect(code).toContain("if (options.timeout !== undefined)");
    expect(code).toContain("args['timeout'] = options.timeout");
  });

  it('should generate args building code for boolean parameter', () => {
    const schema = {
      type: 'object',
      properties: {
        verbose: {
          type: 'boolean',
          description: 'Verbose',
        },
      },
    };
    const code = generateArgsBuilder(schema);
    expect(code).toContain("if (options.verbose)");
    expect(code).toContain("args['verbose'] = true");
  });

  it('should generate JSON parsing for object parameter', () => {
    const schema = {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          description: 'Config',
        },
      },
    };
    const code = generateArgsBuilder(schema);
    expect(code).toContain("JSON.parse(options.config)");
    expect(code).toContain('catch (e)');
    expect(code).toContain('must be valid JSON');
  });

  it('should handle snake_case to camelCase conversion', () => {
    const schema = {
      type: 'object',
      properties: {
        max_retries: {
          type: 'integer',
          description: 'Max retries',
        },
      },
      required: ['max_retries'],
    };
    const code = generateArgsBuilder(schema);
    expect(code).toContain('options.maxRetries');
    expect(code).toContain("args['max_retries']");
  });

  it('should handle multiple parameters', () => {
    const schema = {
      type: 'object',
      properties: {
        url: {
          type: 'string',
        },
        timeout: {
          type: 'integer',
        },
        verbose: {
          type: 'boolean',
        },
      },
      required: ['url'],
    };
    const code = generateArgsBuilder(schema);
    expect(code).toContain('options.url');
    expect(code).toContain('options.timeout');
    expect(code).toContain('options.verbose');
  });
});

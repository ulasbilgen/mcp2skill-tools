/**
 * Utility functions for mcp2scripts.
 *
 * This module provides utilities for:
 * - Parsing command strings
 * - Converting between naming conventions (camelCase <-> snake_case)
 * - JSON Schema to JavaScript type mapping
 */

/**
 * Parse command string into list of arguments.
 *
 * @param command - Command string or pre-split array
 * @returns Array of command arguments
 *
 * @example
 * ```typescript
 * parseCommand('npx -y weather-server');
 * // => ['npx', '-y', 'weather-server']
 *
 * parseCommand(['python', 'server.py']);
 * // => ['python', 'server.py']
 * ```
 */
export function parseCommand(command: string | string[]): string[] {
  if (Array.isArray(command)) {
    return command;
  }
  return command.split(/\s+/).filter((s) => s.length > 0);
}

/**
 * Convert camelCase or PascalCase to snake_case.
 *
 * @param name - Name in camelCase or PascalCase
 * @returns Name in snake_case
 *
 * @example
 * ```typescript
 * camelToSnake('getWeather');    // => 'get_weather'
 * camelToSnake('fetchData');     // => 'fetch_data'
 * camelToSnake('HTTPRequest');   // => 'http_request'
 * camelToSnake('simple');        // => 'simple'
 * ```
 */
export function camelToSnake(name: string): string {
  // Insert underscore before uppercase letters that follow lowercase (and next is lowercase)
  let result = name.replace(/(.)([A-Z][a-z]+)/g, '$1_$2');
  // Insert underscore before uppercase letters that follow lowercase or digit
  result = result.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  return result.toLowerCase();
}

/**
 * Convert snake_case to camelCase.
 *
 * @param name - Name in snake_case
 * @returns Name in camelCase
 *
 * @example
 * ```typescript
 * snakeToCamel('get_weather');   // => 'getWeather'
 * snakeToCamel('fetch_data');    // => 'fetchData'
 * snakeToCamel('simple');        // => 'simple'
 * ```
 */
export function snakeToCamel(name: string): string {
  const components = name.split('_');
  return components[0] + components.slice(1).map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join('');
}

/**
 * Convert JSON Schema type to JavaScript type name.
 *
 * @param schema - JSON Schema definition
 * @returns JavaScript type name as string
 *
 * @example
 * ```typescript
 * jsonSchemaToJsType({ type: 'string' });    // => 'string'
 * jsonSchemaToJsType({ type: 'integer' });   // => 'number'
 * jsonSchemaToJsType({ type: 'number' });    // => 'number'
 * jsonSchemaToJsType({ type: 'boolean' });   // => 'boolean'
 * jsonSchemaToJsType({ type: 'array' });     // => 'array'
 * jsonSchemaToJsType({ type: 'object' });    // => 'object'
 * ```
 */
export function jsonSchemaToJsType(schema: Record<string, unknown>): string {
  const typeMap: Record<string, string> = {
    string: 'string',
    integer: 'number',
    number: 'number',
    boolean: 'boolean',
    array: 'array',
    object: 'object',
    null: 'null',
  };

  const jsonType = schema['type'];
  if (typeof jsonType === 'string') {
    return typeMap[jsonType] || 'unknown';
  }

  return 'object'; // Default to object if type not specified
}

/**
 * Get commander option type for JSON Schema type.
 *
 * Used to determine which commander option method to use (.option, .requiredOption, etc.)
 *
 * @param schema - JSON Schema definition
 * @returns Commander option configuration
 *
 * @example
 * ```typescript
 * getCommanderType({ type: 'string' });
 * // => { type: 'string', parser: null }
 *
 * getCommanderType({ type: 'integer' });
 * // => { type: 'number', parser: 'parseInt' }
 *
 * getCommanderType({ type: 'boolean' });
 * // => { type: 'boolean', parser: null }
 * ```
 */
export function getCommanderType(schema: Record<string, unknown>): {
  type: string;
  parser: string | null;
} {
  const jsonType = schema['type'];

  if (jsonType === 'integer') {
    return { type: 'number', parser: 'parseInt' };
  } else if (jsonType === 'number') {
    return { type: 'number', parser: 'parseFloat' };
  } else if (jsonType === 'boolean') {
    return { type: 'boolean', parser: null };
  } else if (jsonType === 'array') {
    return { type: 'array', parser: null };
  }

  return { type: 'string', parser: null };
}

/**
 * Escape string for use in template literals.
 *
 * @param str - String to escape
 * @returns Escaped string safe for template literals
 *
 * @example
 * ```typescript
 * escapeTemplateString('Hello "world"');
 * // => 'Hello \\"world\\"'
 *
 * escapeTemplateString('Line 1\nLine 2');
 * // => 'Line 1\\nLine 2'
 * ```
 */
export function escapeTemplateString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

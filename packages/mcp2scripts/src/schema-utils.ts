/**
 * Utilities for converting JSON Schema to commander.js code.
 *
 * Generates JavaScript code that defines commander options for CLI scripts.
 */

import type { JsonSchema } from './types.js';

/**
 * Convert snake_case to kebab-case.
 *
 * @param name - String in snake_case
 * @returns String in kebab-case
 *
 * @example
 * ```typescript
 * snakeToKebab('max_retries'); // => 'max-retries'
 * ```
 */
export function snakeToKebab(name: string): string {
  return name.replace(/_/g, '-');
}

/**
 * Convert kebab-case to camelCase.
 *
 * @param name - String in kebab-case
 * @returns String in camelCase
 *
 * @example
 * ```typescript
 * kebabToCamel('max-retries'); // => 'maxRetries'
 * ```
 */
export function kebabToCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Generate commander.js option code from JSON Schema.
 *
 * Converts a JSON Schema (typically from a tool's inputSchema) into
 * commander.js code that defines CLI options.
 *
 * @param schema - JSON Schema dictionary (inputSchema from tool)
 * @returns Commander option definition code as string
 *
 * @example
 * ```typescript
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     url: { type: 'string', description: 'URL to navigate' },
 *     timeout: { type: 'integer', description: 'Timeout in ms' }
 *   },
 *   required: ['url']
 * };
 *
 * const code = generateCommanderFromSchema(schema);
 * // Returns commander option definitions
 * ```
 */
export function generateCommanderFromSchema(schema: JsonSchema): string {
  const properties = schema.properties || {};
  const required = schema.required || [];

  if (Object.keys(properties).length === 0) {
    return '  // No options required';
  }

  const optionLines: string[] = [];

  for (const [propName, propSchema] of Object.entries(properties)) {
    const cliName = snakeToKebab(propName);
    const propType = propSchema.type as string || 'string';
    const propDesc = (propSchema.description as string || '').replace(/"/g, '\\"');
    const isRequired = required.includes(propName);

    if (propType === 'boolean') {
      // Boolean: use simple flag
      optionLines.push(
        `  .option('--${cliName}', '${propDesc}')`
      );
    } else if (propType === 'integer') {
      // Integer: parse as int
      const requiredMark = isRequired ? ' (required)' : '';
      optionLines.push(
        `  .option('--${cliName} <value>', '${propDesc}${requiredMark}', (val) => parseInt(val, 10))` +
        (isRequired ? `\n  .addHelpText('after', '  Note: --${cliName} is required')` : '')
      );
    } else if (propType === 'number') {
      // Float/number: parse as float
      const requiredMark = isRequired ? ' (required)' : '';
      optionLines.push(
        `  .option('--${cliName} <value>', '${propDesc}${requiredMark}', parseFloat)` +
        (isRequired ? `\n  .addHelpText('after', '  Note: --${cliName} is required')` : '')
      );
    } else if (propType === 'array') {
      // Array: use variadic option
      const requiredMark = isRequired ? ' (required)' : '';
      optionLines.push(
        `  .option('--${cliName} <items...>', '${propDesc}${requiredMark}')`
      );
    } else if (propType === 'object') {
      // Object: accept as JSON string
      const requiredMark = isRequired ? ' (required)' : '';
      optionLines.push(
        `  .option('--${cliName} <json>', '${propDesc} (JSON string)${requiredMark}')`
      );
    } else {
      // String or unknown: treat as string
      const enumValues = propSchema.enum as unknown[] | undefined;
      const requiredMark = isRequired ? ' (required)' : '';

      if (enumValues && enumValues.length > 0) {
        const choicesStr = enumValues.map((v) => `"${v}"`).join(', ');
        optionLines.push(
          `  .option('--${cliName} <value>', '${propDesc}${requiredMark}. Choices: ${choicesStr}')`
        );
      } else {
        optionLines.push(
          `  .option('--${cliName} <value>', '${propDesc}${requiredMark}')`
        );
      }
    }
  }

  return optionLines.join('\n');
}

/**
 * Generate code to validate required options and build arguments object.
 *
 * Creates JavaScript code that checks for required options and builds
 * the arguments object to send to the MCP server.
 *
 * @param schema - JSON Schema dictionary (inputSchema from tool)
 * @returns JavaScript code for validation and argument building
 *
 * @example
 * ```typescript
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     url: { type: 'string' },
 *     timeout: { type: 'integer' }
 *   },
 *   required: ['url']
 * };
 *
 * const code = generateArgsBuilder(schema);
 * // Returns code that validates url is present and builds args object
 * ```
 */
export function generateArgsBuilder(schema: JsonSchema): string {
  const properties = schema.properties || {};
  const required = schema.required || [];

  if (Object.keys(properties).length === 0) {
    return '  const args = {};';
  }

  const lines: string[] = [];

  // Add required validation
  if (required.length > 0) {
    lines.push('  // Validate required options');
    for (const propName of required) {
      const cliName = snakeToKebab(propName);
      const camelName = kebabToCamel(cliName);
      lines.push(
        `  if (!options.${camelName}) {`,
        `    console.error('Error: --${cliName} is required');`,
        `    process.exit(1);`,
        `  }`
      );
    }
    lines.push('');
  }

  // Build arguments object
  lines.push('  // Build arguments object');
  lines.push('  const args = {};');

  for (const [propName, propSchema] of Object.entries(properties)) {
    const cliName = snakeToKebab(propName);
    const camelName = kebabToCamel(cliName);
    const propType = propSchema.type as string || 'string';

    if (propType === 'object') {
      // Parse JSON for object types
      lines.push(
        `  if (options.${camelName} !== undefined) {`,
        `    try {`,
        `      args['${propName}'] = JSON.parse(options.${camelName});`,
        `    } catch (e) {`,
        `      console.error('Error: --${cliName} must be valid JSON');`,
        `      process.exit(1);`,
        `    }`,
        `  }`
      );
    } else if (propType === 'boolean') {
      // Boolean: only include if true
      lines.push(
        `  if (options.${camelName}) {`,
        `    args['${propName}'] = true;`,
        `  }`
      );
    } else {
      // Other types: include if not undefined
      lines.push(
        `  if (options.${camelName} !== undefined) {`,
        `    args['${propName}'] = options.${camelName};`,
        `  }`
      );
    }
  }

  return lines.join('\n');
}

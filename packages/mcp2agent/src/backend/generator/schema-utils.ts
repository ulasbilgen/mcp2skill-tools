/**
 * Utilities for converting JSON Schema to commander.js code.
 *
 * Generates JavaScript code that defines commander options for CLI scripts.
 */

import type { JsonSchema } from '../../types/index.js';

/**
 * Convert snake_case to kebab-case.
 */
export function snakeToKebab(name: string): string {
  return name.replace(/_/g, '-');
}

/**
 * Convert kebab-case to camelCase.
 */
export function kebabToCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Generate commander.js option code from JSON Schema.
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
      optionLines.push(
        `  .option('--${cliName}', '${propDesc}')`
      );
    } else if (propType === 'integer') {
      const requiredMark = isRequired ? ' (required)' : '';
      optionLines.push(
        `  .option('--${cliName} <value>', '${propDesc}${requiredMark}', (val) => parseInt(val, 10))` +
        (isRequired ? `\n  .addHelpText('after', '  Note: --${cliName} is required')` : '')
      );
    } else if (propType === 'number') {
      const requiredMark = isRequired ? ' (required)' : '';
      optionLines.push(
        `  .option('--${cliName} <value>', '${propDesc}${requiredMark}', parseFloat)` +
        (isRequired ? `\n  .addHelpText('after', '  Note: --${cliName} is required')` : '')
      );
    } else if (propType === 'array') {
      const requiredMark = isRequired ? ' (required)' : '';
      optionLines.push(
        `  .option('--${cliName} <items...>', '${propDesc}${requiredMark}')`
      );
    } else if (propType === 'object') {
      const requiredMark = isRequired ? ' (required)' : '';
      optionLines.push(
        `  .option('--${cliName} <json>', '${propDesc} (JSON string)${requiredMark}')`
      );
    } else {
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
      lines.push(
        `  if (options.${camelName}) {`,
        `    args['${propName}'] = true;`,
        `  }`
      );
    } else {
      lines.push(
        `  if (options.${camelName} !== undefined) {`,
        `    args['${propName}'] = options.${camelName};`,
        `  }`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Version information for mcp2scripts.
 *
 * Imports version from package.json to ensure single source of truth.
 */

import packageJson from '../package.json' with { type: 'json' };

export const VERSION = packageJson.version;

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { Config, GatewayConfig, ServerConfig, VersionInfo } from '../../types/index.js';

/**
 * Manages configuration file operations for mcp2agent
 */
export class ConfigManager {
  private configPath: string;
  private configDir: string;

  constructor(configPath?: string) {
    this.configDir = path.join(os.homedir(), '.mcp2agent');
    this.configPath = configPath || path.join(this.configDir, 'config.yaml');
  }

  /**
   * Load configuration from YAML file
   * Creates default config if file doesn't exist
   */
  async load(): Promise<Config> {
    try {
      // Check if config file exists
      await fs.access(this.configPath);

      // Read and parse YAML file
      const fileContent = await fs.readFile(this.configPath, 'utf-8');
      const config = yaml.load(fileContent) as any;

      // Validate and return config
      return this.validate(config);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Config file doesn't exist, create default
        console.log('Config file not found, creating default configuration...');
        const defaultConfig = this.getDefaultConfig();
        await this.save(defaultConfig);
        return defaultConfig;
      }
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Save configuration to YAML file
   */
  async save(config: Config): Promise<void> {
    try {
      // Ensure config directory exists
      await this.ensureConfigDir();

      // Convert config to YAML and write to file
      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });

      await fs.writeFile(this.configPath, yamlContent, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Add a server to the configuration
   */
  async addServer(name: string, serverConfig: ServerConfig): Promise<void> {
    const config = await this.load();

    if (config.servers[name]) {
      throw new Error(`Server '${name}' already exists in configuration`);
    }

    config.servers[name] = serverConfig;
    await this.save(config);
  }

  /**
   * Remove a server from the configuration
   */
  async removeServer(name: string): Promise<void> {
    const config = await this.load();

    if (!config.servers[name]) {
      throw new Error(`Server '${name}' not found in configuration`);
    }

    delete config.servers[name];

    // Also remove version tracking for this server
    if (config.versions && config.versions[name]) {
      delete config.versions[name];
    }

    await this.save(config);
  }

  /**
   * Update version tracking for a server
   */
  async updateVersion(name: string, versionInfo: VersionInfo): Promise<void> {
    const config = await this.load();

    if (!config.versions) {
      config.versions = {};
    }

    config.versions[name] = versionInfo;
    await this.save(config);
  }

  /**
   * Get version info for a server
   */
  async getVersionInfo(name: string): Promise<VersionInfo | undefined> {
    const config = await this.load();
    return config.versions?.[name];
  }

  /**
   * Get all version info
   */
  async getAllVersionInfo(): Promise<Record<string, VersionInfo>> {
    const config = await this.load();
    return config.versions || {};
  }

  /**
   * Validate configuration structure
   */
  validate(config: any): Config {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration: must be an object');
    }

    // Validate servers section
    if (!config.servers || typeof config.servers !== 'object') {
      config.servers = {};
    }

    // Validate gateway section
    if (!config.gateway || typeof config.gateway !== 'object') {
      config.gateway = this.getDefaultConfig().gateway;
    } else {
      // Ensure all gateway properties have valid values
      const defaults = this.getDefaultConfig().gateway;
      config.gateway = {
        port: typeof config.gateway.port === 'number' ? config.gateway.port : defaults.port,
        host: typeof config.gateway.host === 'string' ? config.gateway.host : defaults.host,
        timeout: typeof config.gateway.timeout === 'number' ? config.gateway.timeout : defaults.timeout,
        logLevel: ['debug', 'info', 'warn', 'error'].includes(config.gateway.logLevel)
          ? config.gateway.logLevel
          : defaults.logLevel
      };
    }

    // Validate versions section
    if (config.versions && typeof config.versions !== 'object') {
      config.versions = {};
    }

    return config as Config;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): Config {
    return {
      servers: {},
      gateway: {
        port: 28888,
        host: 'localhost',
        timeout: 30000,
        logLevel: 'info'
      },
      versions: {}
    };
  }

  /**
   * Ensure configuration directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.access(this.configDir);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(this.configDir, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  /**
   * Get the configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Get the configuration directory path
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Check if old mcp2rest config exists for migration
   */
  async checkForMigration(): Promise<string | null> {
    const oldConfigPath = path.join(os.homedir(), '.mcp2rest', 'config.yaml');
    try {
      await fs.access(oldConfigPath);
      return oldConfigPath;
    } catch {
      return null;
    }
  }

  /**
   * Migrate from old mcp2rest config
   */
  async migrateFromMcp2rest(): Promise<boolean> {
    const oldConfigPath = await this.checkForMigration();
    if (!oldConfigPath) {
      return false;
    }

    try {
      const oldContent = await fs.readFile(oldConfigPath, 'utf-8');
      const oldConfig = yaml.load(oldContent) as any;

      // Validate and merge with defaults
      const migratedConfig = this.validate(oldConfig);

      // Save to new location
      await this.save(migratedConfig);
      console.log(`✓ Migrated configuration from ${oldConfigPath}`);
      return true;
    } catch (error: any) {
      console.warn(`⚠ Could not migrate old config: ${error.message}`);
      return false;
    }
  }
}

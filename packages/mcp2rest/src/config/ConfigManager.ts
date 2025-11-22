import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { GatewayConfig, ServerConfig, ErrorCode } from '../types/index.js';

/**
 * Manages configuration file operations for the MCP Gateway
 */
export class ConfigManager {
  private configPath: string;
  private configDir: string;

  constructor(configPath?: string) {
    this.configDir = path.join(os.homedir(), '.mcp2rest');
    this.configPath = configPath || path.join(this.configDir, 'config.yaml');
  }

  /**
   * Load configuration from YAML file
   * Creates default config if file doesn't exist
   */
  async load(): Promise<GatewayConfig> {
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
  async save(config: GatewayConfig): Promise<void> {
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
    await this.save(config);
  }

  /**
   * Validate configuration structure
   */
  validate(config: any): GatewayConfig {
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

    return config as GatewayConfig;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): GatewayConfig {
    return {
      servers: {},
      gateway: {
        port: 28888,
        host: 'localhost',
        timeout: 30000,
        logLevel: 'info'
      }
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
}

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Gateway } from './gateway/Gateway.js';
import { ConfigManager } from './gateway/ConfigManager.js';
import { ScriptGenerator } from './generator/ScriptGenerator.js';
import { getLLMProvider, getAvailableProviders } from './llm/index.js';
import { ErrorCode, LLMProvider as LLMProviderType } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main backend server for mcp2agent
 */
export class Server {
  private app: Express;
  private gateway: Gateway;
  private configManager: ConfigManager;
  private scriptGenerator: ScriptGenerator | null = null;
  private httpServer: any;
  private serverUrl = 'http://localhost:28888';

  constructor(configPath?: string) {
    this.configManager = new ConfigManager(configPath);
    this.gateway = new Gateway(this.configManager);
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupStaticServing();
    this.setupErrorHandler();
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  /**
   * Set up API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', this.handleHealthCheck.bind(this));

    // Server management
    this.app.get('/servers', this.handleGetServers.bind(this));
    this.app.post('/servers', this.handleAddServer.bind(this));
    this.app.delete('/servers/:name', this.handleRemoveServer.bind(this));
    this.app.get('/servers/:name/tools', this.handleGetServerTools.bind(this));

    // Tool execution
    this.app.post('/call', this.handleCallTool.bind(this));

    // Script generation endpoints (placeholder for mcp2scripts integration)
    this.app.post('/scripts/generate', this.handleGenerateScripts.bind(this));
    this.app.post('/scripts/generate-all', this.handleGenerateAllScripts.bind(this));

    // Skill creation endpoints (placeholder for LLM integration)
    this.app.post('/skills/enhance', this.handleEnhanceSkill.bind(this));
    this.app.get('/skills/preview', this.handlePreviewSkill.bind(this));

    // Version tracking
    this.app.get('/versions', this.handleGetVersions.bind(this));
    this.app.post('/versions/check', this.handleCheckVersions.bind(this));
  }

  /**
   * Set up static file serving for React frontend
   */
  private setupStaticServing(): void {
    const frontendPath = path.join(__dirname, '../frontend');

    // Serve static files from the frontend build directory
    this.app.use(express.static(frontendPath));

    // Serve index.html for all other routes (SPA support)
    this.app.get('*', (req: Request, res: Response, next: NextFunction) => {
      // Skip API routes
      if (req.path.startsWith('/api') ||
          req.path === '/health' ||
          req.path === '/servers' ||
          req.path === '/call' ||
          req.path.startsWith('/scripts') ||
          req.path.startsWith('/skills') ||
          req.path.startsWith('/versions')) {
        return next();
      }

      res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
        if (err) {
          // Frontend not built yet, return simple message
          res.status(200).send(`
            <!DOCTYPE html>
            <html>
              <head><title>mcp2agent</title></head>
              <body>
                <h1>mcp2agent</h1>
                <p>Backend is running. Frontend not built yet.</p>
                <p>API endpoints available:</p>
                <ul>
                  <li>GET /health</li>
                  <li>GET /servers</li>
                  <li>POST /servers</li>
                  <li>DELETE /servers/:name</li>
                  <li>GET /servers/:name/tools</li>
                  <li>POST /call</li>
                </ul>
              </body>
            </html>
          `);
        }
      });
    });
  }

  /**
   * Set up error handling middleware
   */
  private setupErrorHandler(): void {
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('API Error:', err);

      res.status(500).json({
        success: false,
        error: {
          code: 'GATEWAY_ERROR',
          message: err.message || 'Internal server error'
        }
      });
    });
  }

  // === Route Handlers ===

  private handleHealthCheck(req: Request, res: Response): void {
    try {
      const servers = this.gateway.getServerInfo();
      const connectedCount = servers.filter(s => s.status === 'connected').length;

      res.json({
        status: 'ok',
        serverCount: servers.length,
        connectedServers: connectedCount
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GATEWAY_ERROR',
          message: error.message || 'Health check failed'
        }
      });
    }
  }

  private handleGetServers(req: Request, res: Response): void {
    try {
      const servers = this.gateway.getServerInfo();
      res.json({ success: true, data: servers });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GATEWAY_ERROR',
          message: error.message || 'Failed to retrieve server information'
        }
      });
    }
  }

  private async handleAddServer(req: Request, res: Response): Promise<void> {
    try {
      const { name, package: pkg, args, url, headers, env } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: 'Missing required field: name'
          }
        });
        return;
      }

      if (!pkg && !url) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: 'Must provide either "package" (for stdio) or "url" (for HTTP)'
          }
        });
        return;
      }

      await this.gateway.addServer(name, { package: pkg, args, url, headers, env });

      res.status(201).json({
        success: true,
        message: `Server '${name}' added successfully`
      });

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const errorCodeMatch = errorMessage.match(/^([A-Z_]+):/);
      const errorCode = errorCodeMatch ? errorCodeMatch[1] : 'SERVER_ADD_FAILED';

      let statusCode = 500;
      if (errorCode === ErrorCode.SERVER_ALREADY_EXISTS) {
        statusCode = 409;
      } else if (errorCode === ErrorCode.INVALID_CONFIG || errorCode === ErrorCode.INVALID_URL) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage.replace(/^[A-Z_]+:\s*/, '')
        }
      });
    }
  }

  private async handleRemoveServer(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      if (!name) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: 'Server name is required'
          }
        });
        return;
      }

      await this.gateway.removeServer(name);

      res.json({
        success: true,
        message: `Server '${name}' removed successfully`
      });

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const errorCodeMatch = errorMessage.match(/^([A-Z_]+):/);
      const errorCode = errorCodeMatch ? errorCodeMatch[1] : 'GATEWAY_ERROR';

      let statusCode = 500;
      if (errorCode === ErrorCode.SERVER_NOT_FOUND) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage.replace(/^[A-Z_]+:\s*/, '')
        }
      });
    }
  }

  private handleGetServerTools(req: Request, res: Response): void {
    try {
      const { name } = req.params;
      const tools = this.gateway.getServerTools(name);
      res.json({ success: true, data: tools });
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const errorCodeMatch = errorMessage.match(/^([A-Z_]+):/);
      const errorCode = errorCodeMatch ? errorCodeMatch[1] : 'GATEWAY_ERROR';

      let statusCode = 500;
      if (errorCode === ErrorCode.SERVER_NOT_FOUND) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage.replace(/^[A-Z_]+:\s*/, '')
        }
      });
    }
  }

  private async handleCallTool(req: Request, res: Response): Promise<void> {
    try {
      const { server, tool, arguments: args } = req.body;

      if (!server || !tool) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: 'Missing required fields: server and tool'
          }
        });
        return;
      }

      const result = await this.gateway.callTool(server, tool, args || {});

      res.json({
        success: true,
        result
      });

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const errorCodeMatch = errorMessage.match(/^([A-Z_]+):/);
      const errorCode = errorCodeMatch ? errorCodeMatch[1] : 'TOOL_EXECUTION_ERROR';

      let statusCode = 500;
      if (errorCode === ErrorCode.SERVER_NOT_FOUND || errorCode === ErrorCode.TOOL_NOT_FOUND) {
        statusCode = 404;
      } else if (errorCode === ErrorCode.SERVER_DISCONNECTED) {
        statusCode = 503;
      } else if (errorCode === ErrorCode.TOOL_TIMEOUT) {
        statusCode = 504;
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage.replace(/^[A-Z_]+:\s*/, '')
        }
      });
    }
  }

  // === Script Generation Handlers ===

  private async handleGenerateScripts(req: Request, res: Response): Promise<void> {
    try {
      const { server, output, user } = req.body;

      if (!server) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: 'Missing required field: server'
          }
        });
        return;
      }

      if (!this.scriptGenerator) {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Script generator not initialized'
          }
        });
        return;
      }

      const result = await this.scriptGenerator.generateSkill(server, {
        outputDir: output,
        userSkills: user === true
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.GENERATION_ERROR,
          message: error.message || 'Failed to generate scripts'
        }
      });
    }
  }

  private async handleGenerateAllScripts(req: Request, res: Response): Promise<void> {
    try {
      const { output, user } = req.body;

      if (!this.scriptGenerator) {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Script generator not initialized'
          }
        });
        return;
      }

      const results = await this.scriptGenerator.generateAllSkills({
        outputDir: output,
        userSkills: user === true
      });

      res.json({
        success: true,
        data: results,
        message: `Generated ${results.length} skill(s)`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.GENERATION_ERROR,
          message: error.message || 'Failed to generate scripts'
        }
      });
    }
  }

  // === Skill Enhancement Handlers ===

  private async handleEnhanceSkill(req: Request, res: Response): Promise<void> {
    try {
      const { server, provider, features } = req.body;

      if (!server) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: 'Missing required field: server'
          }
        });
        return;
      }

      if (!provider) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: 'Missing required field: provider'
          }
        });
        return;
      }

      // Validate provider
      const validProviders: LLMProviderType[] = ['anthropic', 'openai', 'gemini'];
      if (!validProviders.includes(provider)) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: `Invalid provider. Must be one of: ${validProviders.join(', ')}`
          }
        });
        return;
      }

      // Get server info and tools
      const serverInfo = this.gateway.getServerInfo().find(s => s.name === server);
      if (!serverInfo) {
        res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.SERVER_NOT_FOUND,
            message: `Server '${server}' not found`
          }
        });
        return;
      }

      const tools = this.gateway.getServerTools(server);
      if (tools.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: `Server '${server}' has no tools`
          }
        });
        return;
      }

      // Get LLM provider
      let llmProvider;
      try {
        llmProvider = getLLMProvider(provider);
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.LLM_ERROR,
            message: error.message || 'Failed to initialize LLM provider'
          }
        });
        return;
      }

      // Generate enhanced docs
      const requestedFeatures = features || ['skill_md'];
      const result: Record<string, unknown> = {};

      if (requestedFeatures.includes('skill_md')) {
        result.skillMd = await llmProvider.generateEnhancedSkillMd(tools, serverInfo);
      }

      if (requestedFeatures.includes('workflows')) {
        result.workflows = await llmProvider.generateWorkflows(tools, serverInfo);
      }

      if (requestedFeatures.includes('reference')) {
        result.reference = await llmProvider.generateReference(tools, serverInfo);
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.LLM_ERROR,
          message: error.message || 'Failed to enhance skill'
        }
      });
    }
  }

  private async handlePreviewSkill(req: Request, res: Response): Promise<void> {
    try {
      const { server, provider } = req.query;

      if (!server || typeof server !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: 'Missing required query parameter: server'
          }
        });
        return;
      }

      // Get available providers
      const availableProviders = getAvailableProviders();

      // Get server info
      const serverInfo = this.gateway.getServerInfo().find(s => s.name === server);
      if (!serverInfo) {
        res.status(404).json({
          success: false,
          error: {
            code: ErrorCode.SERVER_NOT_FOUND,
            message: `Server '${server}' not found`
          }
        });
        return;
      }

      const tools = this.gateway.getServerTools(server);

      // If provider specified, generate preview
      if (provider && typeof provider === 'string') {
        const validProviders: LLMProviderType[] = ['anthropic', 'openai', 'gemini'];
        if (!validProviders.includes(provider as LLMProviderType)) {
          res.status(400).json({
            success: false,
            error: {
              code: ErrorCode.INVALID_ARGUMENTS,
              message: `Invalid provider. Must be one of: ${validProviders.join(', ')}`
            }
          });
          return;
        }

        let llmProvider;
        try {
          llmProvider = getLLMProvider(provider as LLMProviderType);
        } catch (error: any) {
          res.status(400).json({
            success: false,
            error: {
              code: ErrorCode.LLM_ERROR,
              message: error.message || 'Provider not available'
            }
          });
          return;
        }

        const preview = await llmProvider.generateEnhancedSkillMd(tools, serverInfo);
        res.json({
          success: true,
          data: {
            preview,
            serverInfo: {
              name: serverInfo.name,
              toolCount: tools.length,
              version: serverInfo.serverVersion?.version
            }
          }
        });
      } else {
        // Return info about available providers and server
        res.json({
          success: true,
          data: {
            availableProviders,
            serverInfo: {
              name: serverInfo.name,
              toolCount: tools.length,
              version: serverInfo.serverVersion?.version
            },
            tools: tools.map(t => ({ name: t.name, description: t.description }))
          }
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.LLM_ERROR,
          message: error.message || 'Failed to preview skill'
        }
      });
    }
  }

  // === Version Tracking Handlers ===

  private async handleGetVersions(req: Request, res: Response): Promise<void> {
    try {
      const servers = this.gateway.getServerInfo();
      const versions = await this.configManager.getAllVersionInfo();

      const versionData = servers.map(server => ({
        name: server.name,
        serverVersion: server.serverVersion?.version || 'unknown',
        scriptVersion: versions[server.name]?.scriptVersion || null,
        needsUpdate: server.serverVersion?.version !== versions[server.name]?.scriptVersion,
        lastGenerated: versions[server.name]?.lastGenerated || null
      }));

      res.json({ success: true, data: versionData });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GATEWAY_ERROR',
          message: error.message || 'Failed to get version information'
        }
      });
    }
  }

  private async handleCheckVersions(req: Request, res: Response): Promise<void> {
    // Force refresh version information
    res.json({ success: true, message: 'Version check triggered' });
  }

  // === Server Lifecycle ===

  /**
   * Initialize and start the server
   */
  async start(port?: number, host?: string): Promise<void> {
    // Initialize gateway (connects to all configured MCP servers)
    await this.gateway.initialize();

    // Get port/host from config or params
    const config = await this.configManager.load();
    const serverPort = port || parseInt(process.env.MCP2AGENT_PORT || '') || config.gateway.port;
    const serverHost = host || process.env.MCP2AGENT_HOST || config.gateway.host;

    // Set server URL for script generation
    this.serverUrl = `http://${serverHost}:${serverPort}`;

    // Initialize script generator with the gateway
    this.scriptGenerator = new ScriptGenerator(this.gateway, this.serverUrl);

    return new Promise((resolve, reject) => {
      try {
        this.httpServer = this.app.listen(serverPort, serverHost, () => {
          console.log(`\nmcp2agent server running at http://${serverHost}:${serverPort}`);
          console.log(`Web UI: http://${serverHost}:${serverPort}`);
          console.log(`API: http://${serverHost}:${serverPort}/health\n`);
          resolve();
        });

        this.httpServer.on('error', (error: any) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    console.log('Stopping mcp2agent server...');

    // Shutdown gateway
    await this.gateway.shutdown();

    // Close HTTP server
    return new Promise((resolve, reject) => {
      if (!this.httpServer) {
        resolve();
        return;
      }

      this.httpServer.close((error: any) => {
        if (error) {
          reject(error);
        } else {
          console.log('Server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get the gateway instance
   */
  getGateway(): Gateway {
    return this.gateway;
  }

  /**
   * Get the config manager instance
   */
  getConfigManager(): ConfigManager {
    return this.configManager;
  }
}

// Export for direct execution
export { Gateway } from './gateway/Gateway.js';
export { ConfigManager } from './gateway/ConfigManager.js';
export { ScriptGenerator } from './generator/ScriptGenerator.js';

// Start server if run directly
const isMainModule = process.argv[1]?.includes('backend') || process.argv[1]?.includes('index');
if (isMainModule) {
  const server = new Server();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down...');
    await server.stop();
    process.exit(0);
  });

  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

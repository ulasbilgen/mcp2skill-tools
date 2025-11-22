import express, { Express, Request, Response, NextFunction } from 'express';
import { Gateway } from '../gateway/Gateway.js';
import { ErrorCode } from '../types/index.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * REST API Server for MCP Gateway
 */
export class APIServer {
  private app: Express;
  private gateway: Gateway;
  private server: any;

  constructor(gateway: Gateway) {
    this.gateway = gateway;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandler();
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    // JSON body parser
    this.app.use(express.json());
  }

  /**
   * Set up API routes
   */
  private setupRoutes(): void {
    // POST /call - Execute tool on server
    this.app.post('/call', this.handleCallTool.bind(this));

    // GET /servers - List all servers
    this.app.get('/servers', this.handleGetServers.bind(this));

    // POST /servers - Add new server
    this.app.post('/servers', this.handleAddServer.bind(this));

    // DELETE /servers/:name - Remove server
    this.app.delete('/servers/:name', this.handleRemoveServer.bind(this));

    // GET /servers/:name/tools - Get tools for a specific server
    this.app.get('/servers/:name/tools', this.handleGetServerTools.bind(this));

    // GET /openapi.yaml - Serve OpenAPI specification
    this.app.get('/openapi.yaml', this.handleGetOpenAPISpec.bind(this));

    // GET /health - Health check
    this.app.get('/health', this.handleHealthCheck.bind(this));
  }

  /**
   * Set up error handling middleware
   */
  private setupErrorHandler(): void {
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('API Error:', err);
      
      res.status(500).json({
        error: {
          code: ErrorCode.GATEWAY_ERROR,
          message: err.message || 'Internal server error'
        }
      });
    });
  }

  /**
   * Handle POST /call endpoint
   */
  private async handleCallTool(req: Request, res: Response): Promise<void> {
    try {
      const { server, tool, arguments: args } = req.body;

      // Validate request body
      if (!server || !tool) {
        res.status(400).json({
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: 'Missing required fields: server and tool'
          }
        });
        return;
      }

      // Call tool on gateway
      const result = await this.gateway.callTool(server, tool, args || {});

      // Return success response
      res.json({
        success: true,
        result
      });

    } catch (error: any) {
      // Parse error code from error message
      const errorMessage = error.message || 'Unknown error';
      const errorCodeMatch = errorMessage.match(/^([A-Z_]+):/);
      const errorCode = errorCodeMatch ? errorCodeMatch[1] : ErrorCode.TOOL_EXECUTION_ERROR;

      // Determine status code based on error type
      let statusCode = 500;
      if (errorCode === ErrorCode.SERVER_NOT_FOUND || errorCode === ErrorCode.TOOL_NOT_FOUND) {
        statusCode = 404;
      } else if (errorCode === ErrorCode.SERVER_DISCONNECTED) {
        statusCode = 503;
      } else if (errorCode === ErrorCode.TOOL_TIMEOUT) {
        statusCode = 504;
      }

      res.status(statusCode).json({
        error: {
          code: errorCode,
          message: errorMessage.replace(/^[A-Z_]+:\s*/, '')
        }
      });
    }
  }

  /**
   * Handle GET /servers endpoint
   */
  private handleGetServers(req: Request, res: Response): void {
    try {
      const servers = this.gateway.getServerInfo();
      res.json(servers);
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: ErrorCode.GATEWAY_ERROR,
          message: error.message || 'Failed to retrieve server information'
        }
      });
    }
  }

  /**
   * Handle POST /servers endpoint
   */
  private async handleAddServer(req: Request, res: Response): Promise<void> {
    try {
      const { name, package: pkg, args, url, transport } = req.body;

      // Validate request body
      if (!name) {
        res.status(400).json({
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: 'Missing required field: name'
          }
        });
        return;
      }

      // Validate that either package or url is provided
      if (!pkg && !url) {
        res.status(400).json({
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: 'Must provide either "package" (for stdio) or "url" (for HTTP)'
          }
        });
        return;
      }

      // Validate transport type if provided
      if (transport && transport !== 'stdio' && transport !== 'http') {
        res.status(400).json({
          error: {
            code: ErrorCode.INVALID_TRANSPORT,
            message: 'Invalid transport type. Must be "stdio" or "http"'
          }
        });
        return;
      }

      // Add server via gateway
      await this.gateway.addServer(name, {
        package: pkg,
        args,
        url,
        transport
      });

      // Return success response
      res.status(201).json({
        success: true,
        message: `Server '${name}' added successfully`
      });

    } catch (error: any) {
      // Parse error code from error message
      const errorMessage = error.message || 'Unknown error';
      const errorCodeMatch = errorMessage.match(/^([A-Z_]+):/);
      const errorCode = errorCodeMatch ? errorCodeMatch[1] : ErrorCode.SERVER_ADD_FAILED;

      // Determine status code based on error type
      let statusCode = 500;
      if (errorCode === ErrorCode.SERVER_ALREADY_EXISTS) {
        statusCode = 409;
      } else if (errorCode === ErrorCode.INVALID_CONFIG || errorCode === ErrorCode.INVALID_URL || errorCode === ErrorCode.INVALID_TRANSPORT) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        error: {
          code: errorCode,
          message: errorMessage.replace(/^[A-Z_]+:\s*/, '')
        }
      });
    }
  }

  /**
   * Handle DELETE /servers/:name endpoint
   */
  private async handleRemoveServer(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      // Validate server name
      if (!name) {
        res.status(400).json({
          error: {
            code: ErrorCode.INVALID_ARGUMENTS,
            message: 'Server name is required'
          }
        });
        return;
      }

      // Remove server via gateway
      await this.gateway.removeServer(name);

      // Return success response
      res.json({
        success: true,
        message: `Server '${name}' removed successfully`
      });

    } catch (error: any) {
      // Parse error code from error message
      const errorMessage = error.message || 'Unknown error';
      const errorCodeMatch = errorMessage.match(/^([A-Z_]+):/);
      const errorCode = errorCodeMatch ? errorCodeMatch[1] : ErrorCode.GATEWAY_ERROR;

      // Determine status code based on error type
      let statusCode = 500;
      if (errorCode === ErrorCode.SERVER_NOT_FOUND) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        error: {
          code: errorCode,
          message: errorMessage.replace(/^[A-Z_]+:\s*/, '')
        }
      });
    }
  }

  /**
   * Handle GET /servers/:name/tools endpoint
   */
  private handleGetServerTools(req: Request, res: Response): void {
    try {
      const { name } = req.params;
      const tools = this.gateway.getServerTools(name);
      res.json(tools);
    } catch (error: any) {
      // Parse error code from error message
      const errorMessage = error.message || 'Unknown error';
      const errorCodeMatch = errorMessage.match(/^([A-Z_]+):/);
      const errorCode = errorCodeMatch ? errorCodeMatch[1] : ErrorCode.GATEWAY_ERROR;

      // Determine status code based on error type
      let statusCode = 500;
      if (errorCode === ErrorCode.SERVER_NOT_FOUND) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        error: {
          code: errorCode,
          message: errorMessage.replace(/^[A-Z_]+:\s*/, '')
        }
      });
    }
  }

  /**
   * Handle GET /health endpoint
   */
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
        error: {
          code: ErrorCode.GATEWAY_ERROR,
          message: error.message || 'Health check failed'
        }
      });
    }
  }

  /**
   * Serve OpenAPI specification
   */
  private async handleGetOpenAPISpec(req: Request, res: Response): Promise<void> {
    try {
      // Read the openapi.yaml file from the package root
      // __dirname points to dist/api, so go up two levels to package root
      const openapiPath = path.join(__dirname, '../../openapi.yaml');
      const openapiContent = await fs.readFile(openapiPath, 'utf-8');

      // Set appropriate Content-Type for YAML
      res.setHeader('Content-Type', 'application/x-yaml');
      res.send(openapiContent);
    } catch (error: any) {
      console.error('Failed to read OpenAPI specification:', error);
      res.status(500).json({
        error: {
          code: ErrorCode.GATEWAY_ERROR,
          message: 'Failed to read OpenAPI specification'
        }
      });
    }
  }

  /**
   * Start the API server
   */
  async start(port: number, host: string = 'localhost'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, host, () => {
          console.log(`API Server listening on http://${host}:${port}`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the API server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error: any) => {
        if (error) {
          reject(error);
        } else {
          console.log('API Server stopped');
          resolve();
        }
      });
    });
  }
}

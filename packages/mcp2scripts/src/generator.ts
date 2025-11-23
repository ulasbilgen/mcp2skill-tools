/**
 * ScriptGenerator - Main class for generating JavaScript scripts from MCP tools
 */

import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs/promises';
import { homedir } from 'os';
import type { ServerInfo, Tool, GenerateSkillResult } from './types.js';
import { MCPConnectionError } from './exceptions.js';
import { createSkillMd, createMcpClientScript, createToolScript, createPackageJson } from './templates.js';

export class ScriptGenerator {
  private baseUrl: string;

  /**
   * Initialize script generator.
   *
   * @param mcp2restUrl - Base URL of mcp2rest service (default: http://localhost:28888)
   */
  constructor(mcp2restUrl = 'http://localhost:28888') {
    this.baseUrl = mcp2restUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Get the base URL of the mcp2rest service
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get all servers from mcp2rest.
   *
   * @returns List of server info objects
   * @throws {MCPConnectionError} If cannot connect to mcp2rest
   */
  async listServers(): Promise<ServerInfo[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/servers`, {
        timeout: 10000,
      });
      return response.data as ServerInfo[];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new MCPConnectionError(
            `Cannot connect to mcp2rest at ${this.baseUrl}. Make sure mcp2rest is running.`
          );
        }
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          throw new MCPConnectionError(`Timeout connecting to mcp2rest at ${this.baseUrl}`);
        }
      }
      throw error;
    }
  }

  /**
   * Get tool schemas for a server.
   *
   * @param serverName - Name of the MCP server
   * @returns List of tool schema objects
   * @throws {Error} If server not found or request fails
   */
  async getTools(serverName: string): Promise<Tool[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/servers/${serverName}/tools`, {
        timeout: 10000,
      });
      return response.data as Tool[];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const servers = await this.listServers();
        const serverNames = servers.map((s) => s.name);
        throw new Error(
          `Server '${serverName}' not found in mcp2rest. Available servers: ${serverNames.join(', ')}`
        );
      }
      throw error;
    }
  }

  /**
   * Get info about a specific server.
   *
   * @param serverName - Name of the MCP server
   * @returns Server info object or null if not found
   */
  async getServerInfo(serverName: string): Promise<ServerInfo | null> {
    const servers = await this.listServers();
    return servers.find((s) => s.name === serverName) || null;
  }

  /**
   * Generate Claude Code skill for an MCP server.
   *
   * Creates:
   *   {outputDir}/mcp-{serverName}/
   *     ├── SKILL.md              # Minimal skill documentation
   *     ├── scripts/
   *     │   ├── mcp_client.js     # Shared REST client
   *     │   ├── tool1.js          # Generated script for tool1
   *     │   ├── tool2.js          # Generated script for tool2
   *     │   └── ...
   *
   * @param serverName - Name of the MCP server in mcp2rest
   * @param outputDir - Directory to create skill in (default: ./.claude/skills)
   * @returns Result object with skill path and metadata
   * @throws {Error} If server not found, has no tools, or cannot write files
   */
  async generateSkill(
    serverName: string,
    outputDir: string = './.claude/skills'
  ): Promise<GenerateSkillResult> {
    // Expand user path
    const expandedPath = outputDir.startsWith('~')
      ? path.join(homedir(), outputDir.slice(1))
      : outputDir;

    // Get server info and tools
    const serverInfo = await this.getServerInfo(serverName);
    if (!serverInfo) {
      throw new Error(
        `Server '${serverName}' not found in mcp2rest. Run 'mcp2scripts servers' to see available servers.`
      );
    }

    const tools = await this.getTools(serverName);
    if (tools.length === 0) {
      throw new Error(`Server '${serverName}' has no tools available.`);
    }

    // Create skill directory
    const skillDir = path.join(expandedPath, `mcp-${serverName}`);
    await fs.mkdir(skillDir, { recursive: true });

    // Generate SKILL.md
    const skillMd = createSkillMd(serverName, serverInfo, tools, this.baseUrl);
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillMd, 'utf-8');

    // Create scripts directory
    const scriptsDir = path.join(skillDir, 'scripts');
    await fs.mkdir(scriptsDir, { recursive: true });

    // Generate package.json for dependencies
    const packageJson = createPackageJson(serverName);
    await fs.writeFile(path.join(scriptsDir, 'package.json'), packageJson, 'utf-8');

    // Generate shared mcp_client.js utility
    const mcpClientCode = createMcpClientScript(this.baseUrl);
    await fs.writeFile(path.join(scriptsDir, 'mcp_client.js'), mcpClientCode, 'utf-8');

    // Generate JavaScript script for each tool
    const scriptsCreated: string[] = [];
    for (const tool of tools) {
      const scriptCode = createToolScript(serverName, tool);
      const scriptFile = path.join(scriptsDir, `${tool.name}.js`);
      await fs.writeFile(scriptFile, scriptCode, 'utf-8');
      // Make executable (Unix-like systems only)
      try {
        await fs.chmod(scriptFile, 0o755);
      } catch {
        // Ignore chmod errors on Windows
      }
      scriptsCreated.push(`${tool.name}.js`);
    }

    return {
      skillPath: skillDir,
      serverName,
      toolCount: tools.length,
      scriptsCreated,
    };
  }

  /**
   * Generate skills for all servers in mcp2rest.
   *
   * @param outputDir - Directory to create skills in (default: ./.claude/skills)
   * @returns List of result objects for generated skills
   */
  async generateAllSkills(outputDir: string = './.claude/skills'): Promise<GenerateSkillResult[]> {
    const servers = await this.listServers();
    const generated: GenerateSkillResult[] = [];

    for (const server of servers) {
      if (server.status === 'connected' && (server.toolCount ?? 0) > 0) {
        try {
          const result = await this.generateSkill(server.name, outputDir);
          generated.push(result);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.warn(`Warning: Failed to generate skill for ${server.name}: ${errorMsg}`);
        }
      }
    }

    return generated;
  }
}

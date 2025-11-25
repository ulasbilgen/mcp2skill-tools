/**
 * ScriptGenerator - Generate JavaScript skills from MCP tools
 *
 * This generator works directly with the Gateway (no HTTP needed)
 * since it's integrated into the same process.
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { homedir } from 'os';
import type { ServerInfo, Tool, GenerateSkillResult } from '../../types/index.js';
import type { Gateway } from '../gateway/Gateway.js';
import { createSkillMd, createMcpClientScript, createToolScript, createPackageJson } from './templates.js';

// Read version from package.json
let VERSION = '0.1.0';
try {
  const packagePath = new URL('../../../package.json', import.meta.url);
  const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
  VERSION = packageJson.version;
} catch {
  // Use default version
}

export interface GenerateOptions {
  outputDir?: string;
  userSkills?: boolean; // true to use ~/.claude/skills/
}

export class ScriptGenerator {
  private gateway: Gateway;
  private baseUrl: string;

  /**
   * Initialize script generator with a Gateway instance.
   */
  constructor(gateway: Gateway, baseUrl = 'http://localhost:28888') {
    this.gateway = gateway;
    this.baseUrl = baseUrl;
  }

  /**
   * Get all servers from the gateway.
   */
  getServers(): ServerInfo[] {
    return this.gateway.getServerInfo();
  }

  /**
   * Get tools for a specific server.
   */
  getTools(serverName: string): Tool[] {
    return this.gateway.getServerTools(serverName);
  }

  /**
   * Get info about a specific server.
   */
  getServerInfo(serverName: string): ServerInfo | null {
    const servers = this.getServers();
    return servers.find((s) => s.name === serverName) || null;
  }

  /**
   * Generate Claude Code skill for an MCP server.
   *
   * Creates:
   *   {outputDir}/mcp-{serverName}/
   *     ├── SKILL.md
   *     ├── .skill-metadata.json
   *     └── scripts/
   *         ├── package.json
   *         ├── mcp_client.js
   *         └── {tool}.js (for each tool)
   */
  async generateSkill(
    serverName: string,
    options: GenerateOptions = {}
  ): Promise<GenerateSkillResult> {
    const outputDir = options.userSkills
      ? path.join(homedir(), '.claude/skills')
      : options.outputDir || './.claude/skills';

    // Expand user path
    const expandedPath = outputDir.startsWith('~')
      ? path.join(homedir(), outputDir.slice(1))
      : outputDir;

    // Get server info and tools
    const serverInfo = this.getServerInfo(serverName);
    if (!serverInfo) {
      throw new Error(
        `Server '${serverName}' not found. Use 'mcp2agent servers' to see available servers.`
      );
    }

    const tools = this.getTools(serverName);
    if (tools.length === 0) {
      throw new Error(`Server '${serverName}' has no tools available.`);
    }

    // Create skill directory
    const skillDir = path.join(expandedPath, `mcp-${serverName}`);
    await fs.mkdir(skillDir, { recursive: true });

    // Extract server version
    const serverVersion = serverInfo.serverVersion?.version || 'unknown';
    const generationDate = new Date().toISOString();

    // Create .skill-metadata.json for version tracking
    const metadata = {
      serverName,
      serverVersion,
      serverVersionInfo: serverInfo.serverVersion,
      generatedAt: generationDate,
      mcp2agentVersion: VERSION,
      mcp2agentUrl: this.baseUrl
    };
    await fs.writeFile(
      path.join(skillDir, '.skill-metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

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
    const mcpClientCode = createMcpClientScript(this.baseUrl, serverName, serverVersion, generationDate);
    await fs.writeFile(path.join(scriptsDir, 'mcp_client.js'), mcpClientCode, 'utf-8');

    // Generate JavaScript script for each tool
    const scriptsCreated: string[] = [];
    for (const tool of tools) {
      const scriptCode = createToolScript(serverName, tool, serverVersion, generationDate);
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
   * Generate skills for all connected servers.
   */
  async generateAllSkills(options: GenerateOptions = {}): Promise<GenerateSkillResult[]> {
    const servers = this.getServers();
    const generated: GenerateSkillResult[] = [];

    for (const server of servers) {
      if (server.status === 'connected' && (server.toolCount ?? 0) > 0) {
        try {
          const result = await this.generateSkill(server.name, options);
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

/**
 * Integration tests for mcp2scripts
 *
 * Tests end-to-end skill generation workflow with mocked HTTP responses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';
import { ScriptGenerator } from '../src/generator.js';
import type { ServerInfo, Tool } from '../src/types.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Mock fs to avoid actually writing files
vi.mock('fs/promises');
const mockedFs = vi.mocked(fs, true);

describe('Integration Tests', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = '/tmp/test-skills';

    // Mock fs methods
    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.chmod.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Full Skill Generation Workflow', () => {
    it('should generate complete skill for chrome-devtools server', async () => {
      // Mock server info
      const mockServer: ServerInfo = {
        name: 'chrome-devtools',
        status: 'connected',
        toolCount: 3,
        transport: 'stdio',
        package: '@modelcontextprotocol/server-chrome-devtools',
      };

      // Mock tools
      const mockTools: Tool[] = [
        {
          name: 'navigate',
          description: 'Navigate to a URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to navigate to',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'screenshot',
          description: 'Take a screenshot',
          inputSchema: {
            type: 'object',
            properties: {
              fullPage: {
                type: 'boolean',
                description: 'Capture full page',
              },
            },
          },
        },
        {
          name: 'click',
          description: 'Click an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector',
              },
            },
            required: ['selector'],
          },
        },
      ];

      // Mock axios responses
      mockedAxios.get
        .mockResolvedValueOnce({ data: [mockServer] }) // getServerInfo
        .mockResolvedValueOnce({ data: mockTools }); // getTools

      const gen = new ScriptGenerator('http://localhost:28888');
      const result = await gen.generateSkill('chrome-devtools', tmpDir);

      // Verify result
      expect(result.skillPath).toBe(path.join(tmpDir, 'mcp-chrome-devtools'));
      expect(result.serverName).toBe('chrome-devtools');
      expect(result.toolCount).toBe(3);
      expect(result.scriptsCreated).toEqual(['navigate.js', 'screenshot.js', 'click.js']);

      // Verify directory creation
      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        path.join(tmpDir, 'mcp-chrome-devtools'),
        { recursive: true }
      );
      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        path.join(tmpDir, 'mcp-chrome-devtools', 'scripts'),
        { recursive: true }
      );

      // Verify SKILL.md was written
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(tmpDir, 'mcp-chrome-devtools', 'SKILL.md'),
        expect.stringContaining('name: mcp-chrome-devtools'),
        'utf-8'
      );

      // Verify mcp_client.js was written
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(tmpDir, 'mcp-chrome-devtools', 'scripts', 'mcp_client.js'),
        expect.stringContaining('export async function callTool'),
        'utf-8'
      );

      // Verify tool scripts were written
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(tmpDir, 'mcp-chrome-devtools', 'scripts', 'navigate.js'),
        expect.stringContaining('Navigate to a URL'),
        'utf-8'
      );

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(tmpDir, 'mcp-chrome-devtools', 'scripts', 'screenshot.js'),
        expect.stringContaining('Take a screenshot'),
        'utf-8'
      );

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(tmpDir, 'mcp-chrome-devtools', 'scripts', 'click.js'),
        expect.stringContaining('Click an element'),
        'utf-8'
      );

      // Verify chmod was called for each script
      expect(mockedFs.chmod).toHaveBeenCalledTimes(3);
    });

    it('should expand ~ in output directory path', async () => {
      const mockServer: ServerInfo = {
        name: 'test-server',
        status: 'connected',
        toolCount: 1,
      };

      const mockTools: Tool[] = [
        {
          name: 'test-tool',
          description: 'Test tool',
          inputSchema: { type: 'object' },
        },
      ];

      mockedAxios.get
        .mockResolvedValueOnce({ data: [mockServer] })
        .mockResolvedValueOnce({ data: mockTools });

      const gen = new ScriptGenerator();
      await gen.generateSkill('test-server', '~/.claude/skills');

      const expectedPath = path.join(homedir(), '.claude/skills/mcp-test-server');
      expect(mockedFs.mkdir).toHaveBeenCalledWith(expectedPath, { recursive: true });
    });
  });

  describe('generateAllSkills', () => {
    it('should generate skills for all connected servers with tools', async () => {
      const mockServers: ServerInfo[] = [
        {
          name: 'server1',
          status: 'connected',
          toolCount: 2,
        },
        {
          name: 'server2',
          status: 'disconnected',
          toolCount: 3,
        },
        {
          name: 'server3',
          status: 'connected',
          toolCount: 0,
        },
        {
          name: 'server4',
          status: 'connected',
          toolCount: 1,
        },
      ];

      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        inputSchema: { type: 'object' },
      };

      // Mock responses
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockServers }) // listServers
        .mockResolvedValueOnce({ data: mockServers }) // getServerInfo for server1
        .mockResolvedValueOnce({ data: [mockTool, mockTool] }) // getTools for server1
        .mockResolvedValueOnce({ data: mockServers }) // getServerInfo for server4
        .mockResolvedValueOnce({ data: [mockTool] }); // getTools for server4

      const gen = new ScriptGenerator();
      const results = await gen.generateAllSkills(tmpDir);

      // Should only generate for server1 and server4 (connected with tools)
      expect(results).toHaveLength(2);
      expect(results[0].serverName).toBe('server1');
      expect(results[0].toolCount).toBe(2);
      expect(results[1].serverName).toBe('server4');
      expect(results[1].toolCount).toBe(1);
    });

    it('should skip servers that fail to generate', async () => {
      const mockServers: ServerInfo[] = [
        {
          name: 'good-server',
          status: 'connected',
          toolCount: 1,
        },
        {
          name: 'bad-server',
          status: 'connected',
          toolCount: 1,
        },
      ];

      const mockTool: Tool = {
        name: 'test-tool',
        description: 'Test tool',
        inputSchema: { type: 'object' },
      };

      // Mock responses
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockServers }) // listServers
        .mockResolvedValueOnce({ data: mockServers }) // getServerInfo for good-server
        .mockResolvedValueOnce({ data: [mockTool] }) // getTools for good-server
        .mockResolvedValueOnce({ data: mockServers }) // getServerInfo for bad-server
        .mockRejectedValueOnce(new Error('Server error')); // getTools fails for bad-server

      const gen = new ScriptGenerator();
      const results = await gen.generateAllSkills(tmpDir);

      // Should only generate for good-server
      expect(results).toHaveLength(1);
      expect(results[0].serverName).toBe('good-server');
    });
  });

  describe('Generated SKILL.md Content', () => {
    it('should include YAML frontmatter with correct metadata', async () => {
      const mockServer: ServerInfo = {
        name: 'test-server',
        status: 'connected',
        toolCount: 1,
      };

      const mockTools: Tool[] = [
        {
          name: 'test-tool',
          description: 'Test tool description',
        },
      ];

      mockedAxios.get
        .mockResolvedValueOnce({ data: [mockServer] })
        .mockResolvedValueOnce({ data: mockTools });

      const gen = new ScriptGenerator();
      await gen.generateSkill('test-server', tmpDir);

      const skillMdCall = mockedFs.writeFile.mock.calls.find((call) =>
        call[0].toString().endsWith('SKILL.md')
      );

      expect(skillMdCall).toBeDefined();
      const skillMdContent = skillMdCall![1] as string;

      // Check YAML frontmatter
      expect(skillMdContent).toMatch(/^---\n/);
      expect(skillMdContent).toContain('name: mcp-test-server');
      expect(skillMdContent).toContain('description:');

      // Check content (server name is title-cased)
      expect(skillMdContent).toContain('# Test Server MCP Server');
      expect(skillMdContent).toContain('test-tool');
      expect(skillMdContent).toContain('Test tool description');
    });

    it('should categorize tools correctly', async () => {
      const mockServer: ServerInfo = {
        name: 'browser-server',
        status: 'connected',
        toolCount: 4,
      };

      const mockTools: Tool[] = [
        { name: 'navigate', description: 'Navigate to URL' },
        { name: 'goBack', description: 'Go back' },
        { name: 'screenshot', description: 'Take screenshot' },
        { name: 'evaluate', description: 'Execute JavaScript' },
      ];

      mockedAxios.get
        .mockResolvedValueOnce({ data: [mockServer] })
        .mockResolvedValueOnce({ data: mockTools });

      const gen = new ScriptGenerator();
      await gen.generateSkill('browser-server', tmpDir);

      const skillMdCall = mockedFs.writeFile.mock.calls.find((call) =>
        call[0].toString().endsWith('SKILL.md')
      );
      const skillMdContent = skillMdCall![1] as string;

      // Should categorize navigate/goBack as Page Management
      expect(skillMdContent).toContain('Page Management');
      expect(skillMdContent).toContain('navigate');
      expect(skillMdContent).toContain('goBack');

      // Should categorize screenshot as Inspection
      expect(skillMdContent).toContain('Inspection');
      expect(skillMdContent).toContain('screenshot');

      // Should categorize evaluate as Other (doesn't match any category)
      expect(skillMdContent).toContain('Other');
      expect(skillMdContent).toContain('evaluate');
    });
  });

  describe('Generated Script Content', () => {
    it('should generate valid JavaScript with commander options', async () => {
      const mockServer: ServerInfo = {
        name: 'test-server',
        status: 'connected',
        toolCount: 1,
      };

      const mockTools: Tool[] = [
        {
          name: 'fetch-data',
          description: 'Fetch data from API',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'API URL',
              },
              timeout: {
                type: 'integer',
                description: 'Timeout in ms',
              },
              verbose: {
                type: 'boolean',
                description: 'Enable verbose output',
              },
            },
            required: ['url'],
          },
        },
      ];

      mockedAxios.get
        .mockResolvedValueOnce({ data: [mockServer] })
        .mockResolvedValueOnce({ data: mockTools });

      const gen = new ScriptGenerator();
      await gen.generateSkill('test-server', tmpDir);

      const scriptCall = mockedFs.writeFile.mock.calls.find((call) =>
        call[0].toString().endsWith('fetch-data.js')
      );

      expect(scriptCall).toBeDefined();
      const scriptContent = scriptCall![1] as string;

      // Check shebang
      expect(scriptContent).toMatch(/^#!\/usr\/bin\/env node\n/);

      // Check imports
      expect(scriptContent).toContain("import { program } from 'commander'");
      expect(scriptContent).toContain("import { callTool } from './mcp_client.js'");

      // Check commander setup
      expect(scriptContent).toContain(".name('fetch-data')");
      expect(scriptContent).toContain('.description(');

      // Check options
      expect(scriptContent).toContain('--url');
      expect(scriptContent).toContain('--timeout');
      expect(scriptContent).toContain('--verbose');

      // Check type coercion for integer
      expect(scriptContent).toContain('parseInt');

      // Check required field validation
      expect(scriptContent).toContain("if (!options.url)");
      expect(scriptContent).toContain("console.error('Error: --url is required')");
      expect(scriptContent).toContain('process.exit(1)');

      // Check callTool invocation
      expect(scriptContent).toContain("callTool('test-server', 'fetch-data', args)");
    });

    it('should handle complex nested object schemas', async () => {
      const mockServer: ServerInfo = {
        name: 'test-server',
        status: 'connected',
        toolCount: 1,
      };

      const mockTools: Tool[] = [
        {
          name: 'configure',
          description: 'Configure settings',
          inputSchema: {
            type: 'object',
            properties: {
              settings: {
                type: 'object',
                description: 'Configuration settings (JSON)',
              },
            },
            required: ['settings'],
          },
        },
      ];

      mockedAxios.get
        .mockResolvedValueOnce({ data: [mockServer] })
        .mockResolvedValueOnce({ data: mockTools });

      const gen = new ScriptGenerator();
      await gen.generateSkill('test-server', tmpDir);

      const scriptCall = mockedFs.writeFile.mock.calls.find((call) =>
        call[0].toString().endsWith('configure.js')
      );

      const scriptContent = scriptCall![1] as string;

      // Should include JSON parsing for object type
      expect(scriptContent).toContain('JSON.parse(options.settings)');
    });
  });

  describe('mcp_client.js Generation', () => {
    it('should generate client with correct endpoint', async () => {
      const mockServer: ServerInfo = {
        name: 'test-server',
        status: 'connected',
        toolCount: 1,
      };

      const mockTools: Tool[] = [
        {
          name: 'test-tool',
          description: 'Test tool',
        },
      ];

      mockedAxios.get
        .mockResolvedValueOnce({ data: [mockServer] })
        .mockResolvedValueOnce({ data: mockTools });

      const gen = new ScriptGenerator('http://192.168.1.100:9000');
      await gen.generateSkill('test-server', tmpDir);

      const clientCall = mockedFs.writeFile.mock.calls.find((call) =>
        call[0].toString().endsWith('mcp_client.js')
      );

      expect(clientCall).toBeDefined();
      const clientContent = clientCall![1] as string;

      // Check endpoint URL
      expect(clientContent).toContain('http://192.168.1.100:9000');

      // Check environment variable support
      expect(clientContent).toContain('process.env.MCP_REST_URL');

      // Check callTool function
      expect(clientContent).toContain('export async function callTool');
      expect(clientContent).toContain("import axios from 'axios'");
    });
  });

  describe('Error Handling', () => {
    it('should throw error when server not found', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [] }); // No servers

      const gen = new ScriptGenerator();

      await expect(gen.generateSkill('missing-server', tmpDir)).rejects.toThrow(
        "Server 'missing-server' not found"
      );
    });

    it('should throw error when server has no tools', async () => {
      const mockServer: ServerInfo = {
        name: 'empty-server',
        status: 'connected',
        toolCount: 0,
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: [mockServer] })
        .mockResolvedValueOnce({ data: [] }); // No tools

      const gen = new ScriptGenerator();

      await expect(gen.generateSkill('empty-server', tmpDir)).rejects.toThrow(
        "Server 'empty-server' has no tools available"
      );
    });
  });
});

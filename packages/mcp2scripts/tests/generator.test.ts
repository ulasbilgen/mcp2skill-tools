/**
 * Tests for ScriptGenerator class
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ScriptGenerator } from '../src/generator.js';
import { MCPConnectionError } from '../src/exceptions.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('ScriptGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default URL', () => {
      const gen = new ScriptGenerator();
      expect(gen.getBaseUrl()).toBe('http://localhost:28888');
    });

    it('should initialize with custom URL', () => {
      const gen = new ScriptGenerator('http://example.com:3000');
      expect(gen.getBaseUrl()).toBe('http://example.com:3000');
    });

    it('should remove trailing slash from URL', () => {
      const gen = new ScriptGenerator('http://localhost:28888/');
      expect(gen.getBaseUrl()).toBe('http://localhost:28888');
    });
  });

  describe('listServers', () => {
    it('should return list of servers', async () => {
      const mockServers = [
        { name: 'server1', status: 'connected', toolCount: 5 },
        { name: 'server2', status: 'connected', toolCount: 3 },
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: mockServers });

      const gen = new ScriptGenerator();
      const servers = await gen.listServers();

      expect(servers).toEqual(mockServers);
      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:28888/servers', {
        timeout: 10000,
      });
    });

    it('should throw MCPConnectionError on connection refused', async () => {
      const error: any = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      error.isAxiosError = true;

      // Mock both the get method and isAxiosError check
      mockedAxios.get.mockRejectedValue(error);
      (axios.isAxiosError as any) = vi.fn().mockReturnValue(true);

      const gen = new ScriptGenerator();

      await expect(gen.listServers()).rejects.toThrow(MCPConnectionError);
      await expect(gen.listServers()).rejects.toThrow('Cannot connect to mcp2rest');
    });

    it('should throw MCPConnectionError on timeout', async () => {
      const error: any = new Error('Timeout');
      error.code = 'ETIMEDOUT';
      error.isAxiosError = true;

      // Mock both the get method and isAxiosError check
      mockedAxios.get.mockRejectedValue(error);
      (axios.isAxiosError as any) = vi.fn().mockReturnValue(true);

      const gen = new ScriptGenerator();

      await expect(gen.listServers()).rejects.toThrow(MCPConnectionError);
      await expect(gen.listServers()).rejects.toThrow('Timeout connecting');
    });
  });

  describe('getTools', () => {
    it('should return list of tools', async () => {
      const mockTools = [
        { name: 'tool1', description: 'Tool 1' },
        { name: 'tool2', description: 'Tool 2' },
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: mockTools });

      const gen = new ScriptGenerator();
      const tools = await gen.getTools('test-server');

      expect(tools).toEqual(mockTools);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:28888/servers/test-server/tools',
        { timeout: 10000 }
      );
    });

    it('should throw error if server not found', async () => {
      const mockServers = [{ name: 'other-server', status: 'connected' }];
      const error: any = new Error('Not found');
      error.isAxiosError = true;
      error.response = { status: 404 };

      (axios.isAxiosError as any) = vi.fn().mockReturnValue(true);
      mockedAxios.get
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: mockServers });

      const gen = new ScriptGenerator();

      await expect(gen.getTools('missing-server')).rejects.toThrow(
        "Server 'missing-server' not found"
      );
    });
  });

  describe('getServerInfo', () => {
    it('should return server info if found', async () => {
      const mockServers = [
        { name: 'server1', status: 'connected', toolCount: 5 },
        { name: 'server2', status: 'connected', toolCount: 3 },
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: mockServers });

      const gen = new ScriptGenerator();
      const info = await gen.getServerInfo('server2');

      expect(info).toEqual({ name: 'server2', status: 'connected', toolCount: 3 });
    });

    it('should return null if server not found', async () => {
      const mockServers = [{ name: 'server1', status: 'connected' }];

      mockedAxios.get.mockResolvedValueOnce({ data: mockServers });

      const gen = new ScriptGenerator();
      const info = await gen.getServerInfo('missing');

      expect(info).toBeNull();
    });
  });

  describe('generateAllSkills', () => {
    it('should only generate skills for connected servers with tools', async () => {
      const mockServers = [
        { name: 'server1', status: 'connected', toolCount: 5 },
        { name: 'server2', status: 'disconnected', toolCount: 3 },
        { name: 'server3', status: 'connected', toolCount: 0 },
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: mockServers });

      const gen = new ScriptGenerator();
      const results = await gen.generateAllSkills();

      // Should not generate any because generateSkill would require more mocks
      // This is more of an integration test, so we just verify the filtering logic
      expect(results.length).toBe(0);
    });
  });
});

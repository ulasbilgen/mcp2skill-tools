/**
 * LLM Provider Abstraction
 *
 * Supports Anthropic, OpenAI, and Gemini for skill enhancement.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Tool, ServerInfo, SkillDocs, LLMProvider as LLMProviderType } from '../../types/index.js';

export interface LLMProviderInterface {
  name: string;
  generateSkillDocs(tools: Tool[], serverInfo: ServerInfo): Promise<SkillDocs>;
  generateEnhancedSkillMd(tools: Tool[], serverInfo: ServerInfo): Promise<string>;
  generateWorkflows(tools: Tool[], serverInfo: ServerInfo): Promise<Record<string, string>>;
  generateReference(tools: Tool[], serverInfo: ServerInfo): Promise<Record<string, string>>;
}

/**
 * Anthropic (Claude) Provider
 */
export class AnthropicProvider implements LLMProviderInterface {
  name = 'anthropic';
  private client: Anthropic;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }
    this.client = new Anthropic({ apiKey: key });
  }

  async generateSkillDocs(tools: Tool[], serverInfo: ServerInfo): Promise<SkillDocs> {
    const skillMd = await this.generateEnhancedSkillMd(tools, serverInfo);
    const workflows = await this.generateWorkflows(tools, serverInfo);
    const reference = await this.generateReference(tools, serverInfo);

    return { skillMd, workflows, reference };
  }

  async generateEnhancedSkillMd(tools: Tool[], serverInfo: ServerInfo): Promise<string> {
    const prompt = buildSkillMdPrompt(tools, serverInfo);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    throw new Error('Unexpected response type from Anthropic');
  }

  async generateWorkflows(tools: Tool[], serverInfo: ServerInfo): Promise<Record<string, string>> {
    const prompt = buildWorkflowsPrompt(tools, serverInfo);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return parseWorkflowsResponse(content.text);
    }
    throw new Error('Unexpected response type from Anthropic');
  }

  async generateReference(tools: Tool[], serverInfo: ServerInfo): Promise<Record<string, string>> {
    const prompt = buildReferencePrompt(tools, serverInfo);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return parseReferenceResponse(content.text);
    }
    throw new Error('Unexpected response type from Anthropic');
  }
}

/**
 * OpenAI (GPT) Provider
 */
export class OpenAIProvider implements LLMProviderInterface {
  name = 'openai';
  private client: OpenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OPENAI_API_KEY not set');
    }
    this.client = new OpenAI({ apiKey: key });
  }

  async generateSkillDocs(tools: Tool[], serverInfo: ServerInfo): Promise<SkillDocs> {
    const skillMd = await this.generateEnhancedSkillMd(tools, serverInfo);
    const workflows = await this.generateWorkflows(tools, serverInfo);
    const reference = await this.generateReference(tools, serverInfo);

    return { skillMd, workflows, reference };
  }

  async generateEnhancedSkillMd(tools: Tool[], serverInfo: ServerInfo): Promise<string> {
    const prompt = buildSkillMdPrompt(tools, serverInfo);

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return content;
    }
    throw new Error('No response from OpenAI');
  }

  async generateWorkflows(tools: Tool[], serverInfo: ServerInfo): Promise<Record<string, string>> {
    const prompt = buildWorkflowsPrompt(tools, serverInfo);

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return parseWorkflowsResponse(content);
    }
    throw new Error('No response from OpenAI');
  }

  async generateReference(tools: Tool[], serverInfo: ServerInfo): Promise<Record<string, string>> {
    const prompt = buildReferencePrompt(tools, serverInfo);

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return parseReferenceResponse(content);
    }
    throw new Error('No response from OpenAI');
  }
}

/**
 * Google Gemini Provider
 */
export class GeminiProvider implements LLMProviderInterface {
  name = 'gemini';
  private client: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY not set');
    }
    this.client = new GoogleGenerativeAI(key);
  }

  async generateSkillDocs(tools: Tool[], serverInfo: ServerInfo): Promise<SkillDocs> {
    const skillMd = await this.generateEnhancedSkillMd(tools, serverInfo);
    const workflows = await this.generateWorkflows(tools, serverInfo);
    const reference = await this.generateReference(tools, serverInfo);

    return { skillMd, workflows, reference };
  }

  async generateEnhancedSkillMd(tools: Tool[], serverInfo: ServerInfo): Promise<string> {
    const prompt = buildSkillMdPrompt(tools, serverInfo);
    const model = this.client.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (text) {
      return text;
    }
    throw new Error('No response from Gemini');
  }

  async generateWorkflows(tools: Tool[], serverInfo: ServerInfo): Promise<Record<string, string>> {
    const prompt = buildWorkflowsPrompt(tools, serverInfo);
    const model = this.client.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (text) {
      return parseWorkflowsResponse(text);
    }
    throw new Error('No response from Gemini');
  }

  async generateReference(tools: Tool[], serverInfo: ServerInfo): Promise<Record<string, string>> {
    const prompt = buildReferencePrompt(tools, serverInfo);
    const model = this.client.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (text) {
      return parseReferenceResponse(text);
    }
    throw new Error('No response from Gemini');
  }
}

/**
 * Factory function to get an LLM provider
 */
export function getLLMProvider(providerName: LLMProviderType, apiKey?: string): LLMProviderInterface {
  switch (providerName) {
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'gemini':
      return new GeminiProvider(apiKey);
    default:
      throw new Error(`Unknown LLM provider: ${providerName}`);
  }
}

/**
 * Check which LLM providers are available (have API keys set)
 */
export function getAvailableProviders(): LLMProviderType[] {
  const available: LLMProviderType[] = [];

  if (process.env.ANTHROPIC_API_KEY) {
    available.push('anthropic');
  }
  if (process.env.OPENAI_API_KEY) {
    available.push('openai');
  }
  if (process.env.GEMINI_API_KEY) {
    available.push('gemini');
  }

  return available;
}

// === Prompt Builders ===

function buildSkillMdPrompt(tools: Tool[], serverInfo: ServerInfo): string {
  const serverName = serverInfo.name;
  const toolCount = tools.length;
  const toolList = tools.map(t => `- ${t.name}: ${t.description || 'No description'}`).join('\n');

  return `Generate an enhanced SKILL.md file for the "${serverName}" MCP server.

## Server Information
- Name: ${serverName}
- Tool Count: ${toolCount}
- Package: ${serverInfo.package || serverInfo.url || 'N/A'}
- Version: ${serverInfo.serverVersion?.version || 'unknown'}

## Available Tools
${toolList}

## Requirements
1. Create a comprehensive SKILL.md that follows Claude Code skill best practices
2. Include a clear description of what this skill does
3. Group tools by functionality (analyze tool names to identify categories)
4. Provide concrete, runnable examples (not abstract placeholders)
5. Keep under 500 lines for optimal performance
6. Use progressive disclosure - essential info first, details later
7. Include troubleshooting tips

## Output Format
Return ONLY the SKILL.md content in markdown format. Start with the YAML frontmatter:
\`\`\`
---
name: mcp-${serverName}
description: [concise description]
server-version: ${serverInfo.serverVersion?.version || 'unknown'}
---
\`\`\`

Then include sections for: Overview, Prerequisites, Quick Start, Available Tools (grouped), Example Workflows, and Troubleshooting.`;
}

function buildWorkflowsPrompt(tools: Tool[], serverInfo: ServerInfo): string {
  const serverName = serverInfo.name;
  const toolList = tools.map(t => `- ${t.name}: ${t.description || 'No description'}`).join('\n');

  return `Generate workflow documentation files for the "${serverName}" MCP server.

## Available Tools
${toolList}

## Requirements
1. Identify 2-4 common workflows that combine multiple tools
2. Each workflow should solve a real-world task
3. Provide step-by-step instructions with actual commands
4. Include expected outputs and error handling

## Output Format
Return the workflows as JSON-parseable sections separated by "---WORKFLOW---" markers:

---WORKFLOW---
name: workflow-name.md
content:
# Workflow Title
[markdown content]
---WORKFLOW---

Create 2-4 practical workflows based on the available tools.`;
}

function buildReferencePrompt(tools: Tool[], serverInfo: ServerInfo): string {
  const serverName = serverInfo.name;
  const toolSchemas = tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema
  }));

  return `Generate reference documentation for the "${serverName}" MCP server.

## Tool Schemas
${JSON.stringify(toolSchemas, null, 2)}

## Requirements
Create two reference files:

1. **all-tools.md**: Complete reference for all tools with full parameter documentation
2. **troubleshooting.md**: Common errors, their causes, and solutions

## Output Format
Return as JSON-parseable sections separated by "---FILE---" markers:

---FILE---
name: all-tools.md
content:
[markdown content]
---FILE---
name: troubleshooting.md
content:
[markdown content]
---FILE---`;
}

// === Response Parsers ===

function parseWorkflowsResponse(text: string): Record<string, string> {
  const workflows: Record<string, string> = {};
  const sections = text.split('---WORKFLOW---').filter(s => s.trim());

  for (const section of sections) {
    const nameMatch = section.match(/name:\s*(.+\.md)/);
    const contentMatch = section.match(/content:\s*([\s\S]+)/);

    if (nameMatch && contentMatch) {
      workflows[nameMatch[1].trim()] = contentMatch[1].trim();
    }
  }

  return workflows;
}

function parseReferenceResponse(text: string): Record<string, string> {
  const files: Record<string, string> = {};
  const sections = text.split('---FILE---').filter(s => s.trim());

  for (const section of sections) {
    const nameMatch = section.match(/name:\s*(.+\.md)/);
    const contentMatch = section.match(/content:\s*([\s\S]+)/);

    if (nameMatch && contentMatch) {
      files[nameMatch[1].trim()] = contentMatch[1].trim();
    }
  }

  return files;
}

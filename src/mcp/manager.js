const fs = require("node:fs/promises");
const { AsyncLocalStorage } = require("node:async_hooks");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const { InMemoryTransport } = require("@modelcontextprotocol/sdk/inMemory.js");
const { createLocalMcpServer } = require("./localServer");

function safeName(value) {
  return value.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64);
}

function geminiSchema(schema) {
  const allowed = new Set(["type", "format", "description", "nullable", "enum", "properties", "required", "items", "minItems", "maxItems", "minimum", "maximum", "minLength", "maxLength"]);
  if (Array.isArray(schema)) return schema.map(geminiSchema);
  if (!schema || typeof schema !== "object") return schema;
  const cleaned = {};
  for (const [key, value] of Object.entries(schema)) {
    if (!allowed.has(key)) continue;
    cleaned[key] = key === "properties"
      ? Object.fromEntries(Object.entries(value).map(([name, property]) => [name, geminiSchema(property)]))
      : geminiSchema(value);
  }
  return cleaned;
}

class McpManager {
  constructor(services) {
    this.services = services;
    this.logger = services.logger;
    this.contextStorage = new AsyncLocalStorage();
    this.connections = [];
    this.tools = new Map();
  }

  async init() {
    const server = createLocalMcpServer({ ...this.services, contextStorage: this.contextStorage });
    const client = new Client({ name: "ryu-gemini-mcp-client", version: "1.0.0" }, { capabilities: {} });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    await this.addConnection("ryu", client, server, null);
    await this.connectExternalServers();
    this.logger.info("MCP tools ready", { tools: this.tools.size, servers: this.connections.length });
  }

  async addConnection(name, client, server = null, allowTools = null) {
    const listed = await client.listTools();
    for (const tool of listed.tools) {
      if (allowTools && !allowTools.includes(tool.name)) continue;
      const geminiName = safeName(`${name}_${tool.name}`);
      if (this.tools.has(geminiName)) throw new Error(`Duplicate MCP tool name: ${geminiName}`);
      const exposeToGemini = !(name === "ryu" && tool.name === "paper_trade_execute");
      this.tools.set(geminiName, { client, originalName: tool.name, exposeToGemini, definition: { name: geminiName, description: `[MCP:${name}] ${tool.description || tool.name}`, parameters: geminiSchema(tool.inputSchema || { type: "object", properties: {} }) } });
    }
    this.connections.push({ name, client, server });
  }

  async connectExternalServers() {
    const file = this.services.config.mcpConfigFile;
    if (!file) return;
    const document = JSON.parse(await fs.readFile(file, "utf8"));
    for (const definition of document.servers || []) {
      if (!definition.enabled) continue;
      if (!definition.name || !definition.command || !Array.isArray(definition.allowTools) || !definition.allowTools.length) {
        throw new Error("Every enabled external MCP server requires name, command, and a non-empty allowTools list");
      }
      const transport = new StdioClientTransport({ command: definition.command, args: definition.args || [], env: { ...process.env, ...(definition.env || {}) }, stderr: "inherit" });
      const client = new Client({ name: `ryu-${definition.name}`, version: "1.0.0" }, { capabilities: {} });
      await client.connect(transport);
      await this.addConnection(definition.name, client, null, definition.allowTools);
      this.logger.info("Connected external MCP server", { name: definition.name, allowedTools: definition.allowTools });
    }
  }

  geminiTools() {
    return [...this.tools.values()].filter((entry) => entry.exposeToGemini).map((entry) => entry.definition);
  }

  async getLocalPrompt(name, args, context) {
    const local = this.connections.find((connection) => connection.name === "ryu");
    if (!local) throw new Error("Built-in MCP prompt server is unavailable");
    const result = await this.contextStorage.run(context, () => local.client.getPrompt({ name, arguments: args || {} }));
    return result.messages.map((message) => message.content?.text || "").filter(Boolean).join("\n");
  }

  async call(name, args, context) {
    const entry = this.tools.get(name);
    if (!entry) throw new Error(`Unknown MCP tool: ${name}`);
    const result = await this.contextStorage.run(context, () => entry.client.callTool({ name: entry.originalName, arguments: args || {} }));
    const text = (result.content || []).filter((part) => part.type === "text").map((part) => part.text).join("\n");
    if (result.isError) throw new Error(text || `${name} failed`);
    return text || JSON.stringify(result.structuredContent || {});
  }

  async close() {
    await Promise.allSettled(this.connections.map(async ({ client, server }) => {
      await client.close();
      if (server) await server.close();
    }));
  }
}

module.exports = { McpManager };

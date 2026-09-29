const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { McpManager } = require("../src/mcp/manager");
const { PaperTradingService } = require("../src/services/paperTrading");
const { JsonStore } = require("../src/storage/jsonStore");

const logger = { info() {}, warn() {}, error() {} };

test("MCP tools use authenticated user context and Gemini-safe schemas", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ryu-mcp-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = new JsonStore(path.join(directory, "data.json"), logger);
  await store.init();
  const marketData = { quote: async (symbol) => ({ symbol, price: 100, currency: "USD", asOf: new Date().toISOString(), tradingViewUrl: "https://example.test" }) };
  const config = { defaultTimezone: "UTC", mcpConfigFile: null };
  const paperTrading = new PaperTradingService({ store, marketData, config });
  const manager = new McpManager({ store, marketData, paperTrading, config, logger });
  await manager.init();
  t.after(() => manager.close());

  const definitions = manager.geminiTools();
  assert.ok(definitions.some((tool) => tool.name === "ryu_task_create"));
  assert.equal(definitions.some((tool) => tool.name === "ryu_paper_trade_execute"), false);
  assert.equal(JSON.stringify(definitions).includes("$schema"), false);
  assert.ok(definitions.find((tool) => tool.name === "ryu_task_create").parameters.properties.title);

  await manager.call("ryu_task_create", { title: "Prepare board memo", priority: "high" }, { guildId: "guild", userId: "alice" });
  const alice = JSON.parse(await manager.call("ryu_tasks_list", { status: "open" }, { guildId: "guild", userId: "alice" }));
  const bob = JSON.parse(await manager.call("ryu_tasks_list", { status: "open" }, { guildId: "guild", userId: "bob" }));
  assert.equal(alice.length, 1);
  assert.equal(bob.length, 0);
});

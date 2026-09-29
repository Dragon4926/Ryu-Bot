const test = require("node:test");
const assert = require("node:assert/strict");
const { GeminiService } = require("../src/services/gemini");

const logger = { warn() {}, error() {} };

test("Gemini tool loop executes MCP functions and returns final text", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  const requests = [];
  global.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    const body = requests.length === 1
      ? { candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "ryu_tasks_list", args: { status: "open" } } }] } }] }
      : { candidates: [{ content: { role: "model", parts: [{ text: "Your top task is the board memo." }] } }] };
    return { ok: true, json: async () => body };
  };

  const service = new GeminiService({ apiKey: "test-key", model: "test-model", logger });
  const calls = [];
  const result = await service.generate({
    system: "Test system",
    history: [],
    prompt: "What is next?",
    tools: [{ name: "ryu_tasks_list", description: "List tasks", parameters: { type: "object", properties: {} } }],
    callTool: async (name, args) => { calls.push({ name, args }); return '[{"title":"Board memo"}]'; },
  });

  assert.equal(result, "Your top task is the board memo.");
  assert.deepEqual(calls, [{ name: "ryu_tasks_list", args: { status: "open" } }]);
  assert.equal(requests[1].contents.at(-1).parts[0].functionResponse.name, "ryu_tasks_list");
});

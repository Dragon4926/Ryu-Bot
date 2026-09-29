const test = require("node:test");
const assert = require("node:assert/strict");
const { secureEqual } = require("../src/services/tradingViewWebhook");

test("webhook secret comparison is length-safe", () => {
  assert.equal(secureEqual("a-long-secret", "a-long-secret"), true);
  assert.equal(secureEqual("a-long-secret", "wrong-secret"), false);
  assert.equal(secureEqual("short", "a-much-longer-secret"), false);
});

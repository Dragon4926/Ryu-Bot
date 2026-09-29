const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { normalizeSymbol, tradingViewUrl } = require("../src/services/marketData");
const { PaperTradingService } = require("../src/services/paperTrading");
const { JsonStore } = require("../src/storage/jsonStore");

const logger = { error() {} };

test("paper portfolios are isolated and webhook fills are idempotent", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ryu-trade-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = new JsonStore(path.join(directory, "data.json"), logger);
  await store.init();
  const marketData = { quote: async (symbol) => ({ symbol, price: 100, currency: "USD", asOf: "2026-01-01T00:00:00.000Z", marketState: "REGULAR", tradingViewUrl: tradingViewUrl(symbol) }) };
  const trading = new PaperTradingService({ store, marketData, config: { defaultTimezone: "UTC" } });

  const first = await trading.execute("guild", "alice", { side: "buy", symbol: "NASDAQ:AAPL", quantity: 10, externalId: "alert-1", source: "test" });
  const duplicate = await trading.execute("guild", "alice", { side: "buy", symbol: "NASDAQ:AAPL", quantity: 10, externalId: "alert-1", source: "test" });
  assert.equal(first.id, duplicate.id);
  assert.equal((await trading.portfolio("guild", "alice")).positions[0].quantity, 10);
  assert.equal((await trading.portfolio("guild", "bob")).positions.length, 0);
});

test("TradingView symbols map to public quote-provider symbols", () => {
  assert.deepEqual(normalizeSymbol("NSE:RELIANCE"), { display: "NSE:RELIANCE", provider: "RELIANCE.NS" });
  assert.deepEqual(normalizeSymbol("BSE:500325"), { display: "BSE:500325", provider: "500325.BO" });
  assert.equal(tradingViewUrl("NASDAQ:AAPL"), "https://www.tradingview.com/chart/?symbol=NASDAQ%3AAAPL");
  assert.throws(() => normalizeSymbol("https://internal.invalid"));
});

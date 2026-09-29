const SYMBOL_PATTERN = /^(?:[A-Z0-9._-]+:)?[A-Z0-9._-]{1,24}$/i;

function normalizeSymbol(input) {
  const value = input.trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(value)) throw new Error("Invalid symbol format");
  if (value.startsWith("NSE:")) return { display: value, provider: `${value.slice(4)}.NS` };
  if (value.startsWith("BSE:")) return { display: value, provider: `${value.slice(4)}.BO` };
  const parts = value.split(":");
  return { display: value, provider: parts.length === 2 ? parts[1] : value };
}

function tradingViewUrl(symbol) {
  const { display } = normalizeSymbol(symbol);
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(display)}`;
}

class MarketDataService {
  constructor(logger) {
    this.logger = logger;
    this.cache = new Map();
  }

  async quote(symbol) {
    const normalized = normalizeSymbol(symbol);
    const cached = this.cache.get(normalized.provider);
    if (cached && Date.now() - cached.fetchedAt < 15_000) return cached.value;

    const endpoint = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalized.provider)}?interval=1m&range=1d`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(endpoint, {
        headers: { "User-Agent": "Ryu-Paper-Trading/1.0" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Quote provider returned HTTP ${response.status}`);
      const result = (await response.json())?.chart?.result?.[0];
      const meta = result?.meta;
      const price = Number(meta?.regularMarketPrice);
      if (!Number.isFinite(price) || price <= 0) throw new Error(`No market price found for ${normalized.display}`);
      const value = {
        symbol: normalized.display,
        providerSymbol: normalized.provider,
        price,
        currency: meta.currency || "USD",
        exchange: meta.exchangeName || null,
        marketState: meta.marketState || null,
        previousClose: Number(meta.chartPreviousClose) || null,
        asOf: new Date((meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        delayed: true,
        source: "Yahoo Finance public chart endpoint",
        tradingViewUrl: tradingViewUrl(normalized.display),
      };
      this.cache.set(normalized.provider, { value, fetchedAt: Date.now() });
      return value;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = { MarketDataService, normalizeSymbol, tradingViewUrl };

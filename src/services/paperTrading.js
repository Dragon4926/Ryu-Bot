const { randomUUID } = require("node:crypto");
const { normalizeSymbol } = require("./marketData");

const STARTING_CASH = { USD: 100_000, INR: 1_000_000 };

function ensurePortfolio(user) {
  if (!user.paperPortfolio) {
    user.paperPortfolio = { cash: { ...STARTING_CASH }, positions: {}, trades: [], createdAt: new Date().toISOString() };
  }
  user.paperPortfolio.cash ||= { ...STARTING_CASH };
  user.paperPortfolio.positions ||= {};
  user.paperPortfolio.trades ||= [];
  return user.paperPortfolio;
}

class PaperTradingService {
  constructor({ store, marketData, config }) {
    this.store = store;
    this.marketData = marketData;
    this.config = config;
  }

  async portfolio(guildId, userId) {
    const user = this.store.getUser(guildId, userId, this.config.defaultTimezone);
    const portfolio = ensurePortfolio(user);
    const positions = await Promise.all(Object.values(portfolio.positions).map(async (position) => {
      try {
        const quote = await this.marketData.quote(position.symbol);
        return { ...position, marketPrice: quote.price, marketValue: quote.price * position.quantity, unrealizedPnl: (quote.price - position.averagePrice) * position.quantity, quoteAsOf: quote.asOf };
      } catch {
        return { ...position, marketPrice: null, marketValue: null, unrealizedPnl: null };
      }
    }));
    return { cash: portfolio.cash, positions, tradeCount: portfolio.trades.length, disclaimer: "Simulation only. Quotes may be delayed. No real orders are placed." };
  }

  history(guildId, userId, limit = 20) {
    const user = this.store.getUser(guildId, userId, this.config.defaultTimezone);
    return ensurePortfolio(user).trades.slice(-Math.min(Math.max(limit, 1), 100)).reverse();
  }

  async preview({ side, symbol, quantity }) {
    const normalizedSide = side.toLowerCase();
    if (!["buy", "sell"].includes(normalizedSide)) throw new Error("Side must be buy or sell");
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000) throw new Error("Quantity must be between 0 and 1,000,000");
    const quote = await this.marketData.quote(symbol);
    return { side: normalizedSide, symbol: normalizeSymbol(symbol).display, quantity, estimatedPrice: quote.price, estimatedValue: quote.price * quantity, currency: quote.currency, quoteAsOf: quote.asOf, marketState: quote.marketState, tradingViewUrl: quote.tradingViewUrl, disclaimer: "Preview only; delayed quote and actual simulated fill may differ." };
  }

  async execute(guildId, userId, { side, symbol, quantity, externalId = null, source = "discord" }) {
    const preview = await this.preview({ side, symbol, quantity });
    let trade;
    await this.store.update(guildId, userId, this.config.defaultTimezone, (user) => {
      const portfolio = ensurePortfolio(user);
      if (externalId) {
        const existing = portfolio.trades.find((item) => item.externalId === externalId && item.source === source);
        if (existing) { trade = existing; return; }
      }
      const currency = preview.currency;
      portfolio.cash[currency] ??= 0;
      const position = portfolio.positions[preview.symbol] || { symbol: preview.symbol, quantity: 0, averagePrice: 0, currency };
      if (preview.side === "buy") {
        if (portfolio.cash[currency] < preview.estimatedValue) throw new Error(`Insufficient ${currency} paper cash`);
        const newQuantity = position.quantity + quantity;
        position.averagePrice = ((position.quantity * position.averagePrice) + preview.estimatedValue) / newQuantity;
        position.quantity = newQuantity;
        portfolio.cash[currency] -= preview.estimatedValue;
        portfolio.positions[preview.symbol] = position;
      } else {
        if (position.quantity < quantity) throw new Error(`Insufficient ${preview.symbol} paper position`);
        position.quantity -= quantity;
        portfolio.cash[currency] += preview.estimatedValue;
        if (position.quantity === 0) delete portfolio.positions[preview.symbol];
        else portfolio.positions[preview.symbol] = position;
      }
      trade = { id: randomUUID(), ...preview, price: preview.estimatedPrice, value: preview.estimatedValue, executedAt: new Date().toISOString(), type: "paper_market", source, externalId };
      delete trade.estimatedPrice;
      delete trade.estimatedValue;
      portfolio.trades.push(trade);
      portfolio.trades = portfolio.trades.slice(-1000);
    });
    return trade;
  }
}

module.exports = { PaperTradingService, ensurePortfolio, STARTING_CASH };

const crypto = require("node:crypto");
const http = require("node:http");
const { PermissionFlagsBits } = require("discord.js");

function secureEqual(left, right) {
  const a = Buffer.from(left || "");
  const b = Buffer.from(right || "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

class TradingViewWebhook {
  constructor({ client, config, paperTrading, logger }) {
    this.client = client;
    this.config = config;
    this.paperTrading = paperTrading;
    this.logger = logger;
    this.server = null;
  }

  get enabled() {
    return Boolean(this.config.webhookPort);
  }

  validateConfig() {
    if (!Number.isInteger(this.config.webhookPort) || this.config.webhookPort < 1 || this.config.webhookPort > 65535) throw new Error("WEBHOOK_PORT must be a valid TCP port");
    if (!this.config.tradingViewWebhookSecret || this.config.tradingViewWebhookSecret.length < 24) throw new Error("TRADINGVIEW_WEBHOOK_SECRET must contain at least 24 characters");
    if (!this.config.tradingViewGuildId || !this.config.tradingViewUserId) throw new Error("TRADINGVIEW_GUILD_ID and TRADINGVIEW_USER_ID are required when webhooks are enabled");
  }

  async assertAuthorized() {
    const { tradingViewGuildId: guildId, tradingViewUserId: userId } = this.config;
    if (this.config.ownerIds.includes(userId)) return;
    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return;
    if (this.config.allowedRoleIds.some((roleId) => member.roles.cache.has(roleId))) return;
    throw new Error("Configured TradingView user is not authorized");
  }

  async handle(request, response) {
    if (request.method === "GET" && request.url === "/health") return json(response, 200, { ok: true });
    if (request.method !== "POST" || request.url !== "/webhooks/tradingview") return json(response, 404, { error: "Not found" });
    const bearer = request.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
    let raw = "";
    for await (const chunk of request) {
      raw += chunk;
      if (raw.length > 16_384) return json(response, 413, { error: "Payload too large" });
    }
    let payload;
    try { payload = JSON.parse(raw); } catch { return json(response, 400, { error: "Invalid JSON" }); }
    if (!secureEqual(bearer || String(payload.secret || ""), this.config.tradingViewWebhookSecret)) return json(response, 401, { error: "Unauthorized" });
    const action = String(payload.action || "").toLowerCase();
    const quantity = Number(payload.quantity);
    const symbol = String(payload.symbol || "");
    const alertId = String(payload.alertId || "");
    if (!['buy', 'sell'].includes(action) || !symbol || !Number.isFinite(quantity) || quantity <= 0 || !alertId || alertId.length > 128) {
      return json(response, 400, { error: "action (buy/sell), symbol, positive quantity, and unique alertId are required" });
    }

    try {
      await this.assertAuthorized();
      const trade = await this.paperTrading.execute(this.config.tradingViewGuildId, this.config.tradingViewUserId, { side: action, symbol, quantity, externalId: alertId, source: "tradingview_webhook" });
      this.logger.info("TradingView paper alert processed", { alertId, tradeId: trade.id, symbol: trade.symbol, side: trade.side });
      return json(response, 200, { ok: true, paperTradeId: trade.id, symbol: trade.symbol, side: trade.side, quantity: trade.quantity, price: trade.price, disclaimer: "Paper simulation only" });
    } catch (error) {
      this.logger.warn("TradingView paper alert rejected", { alertId, error: error.message });
      return json(response, 422, { error: error.message });
    }
  }

  async start() {
    if (!this.enabled || this.server) return;
    this.validateConfig();
    this.server = http.createServer((request, response) => {
      this.handle(request, response).catch((error) => {
        this.logger.error("Webhook request failed", { error: error.message });
        if (!response.headersSent) json(response, 500, { error: "Internal error" });
      });
    });
    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.config.webhookPort, "0.0.0.0", resolve);
    });
    this.logger.info("TradingView webhook listening", { port: this.config.webhookPort, path: "/webhooks/tradingview" });
  }

  async stop() {
    if (!this.server) return;
    await new Promise((resolve) => this.server.close(resolve));
    this.server = null;
  }
}

module.exports = { TradingViewWebhook, secureEqual };

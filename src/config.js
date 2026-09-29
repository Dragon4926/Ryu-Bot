const path = require("node:path");

function optionalPath(value) {
  return value?.trim() ? path.resolve(value.trim()) : null;
}

function csv(name) {
  return (process.env[name] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function loadConfig() {
  return {
    token: required("DISCORD_TOKEN"),
    clientId: required("DISCORD_CLIENT_ID"),
    guildId: process.env.DISCORD_GUILD_ID?.trim() || null,
    ownerIds: csv("OWNER_USER_IDS"),
    allowedRoleIds: csv("ALLOWED_ROLE_IDS"),
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
    geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
    dataFile: path.resolve(process.env.DATA_FILE || "data/assistant.json"),
    defaultTimezone: process.env.DEFAULT_TIMEZONE?.trim() || "UTC",
    logLevel: process.env.LOG_LEVEL?.trim() || "info",
    mcpConfigFile: optionalPath(process.env.MCP_CONFIG_FILE),
    webhookPort: process.env.WEBHOOK_PORT ? Number(process.env.WEBHOOK_PORT) : null,
    tradingViewWebhookSecret: process.env.TRADINGVIEW_WEBHOOK_SECRET?.trim() || null,
    tradingViewGuildId: process.env.TRADINGVIEW_GUILD_ID?.trim() || null,
    tradingViewUserId: process.env.TRADINGVIEW_USER_ID?.trim() || null,
  };
}

module.exports = { loadConfig };

require("dotenv").config({ quiet: true });

const { Client, GatewayIntentBits } = require("discord.js");
const { commands, commandMap } = require("./commands");
const { loadConfig } = require("./config");
const { createInteractionHandler } = require("./events/interactionCreate");
const { createAuthorization } = require("./services/authorization");
const { registerCommands } = require("./services/commandRegistrar");
const { GeminiService } = require("./services/gemini");
const { MarketDataService } = require("./services/marketData");
const { McpManager } = require("./mcp/manager");
const { PaperTradingService } = require("./services/paperTrading");
const { ReminderScheduler } = require("./services/reminderScheduler");
const { TradingViewWebhook } = require("./services/tradingViewWebhook");
const { JsonStore } = require("./storage/jsonStore");
const { createLogger } = require("./utils/logger");
const { isValidTimezone } = require("./utils/time");

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  if (!isValidTimezone(config.defaultTimezone)) throw new Error(`Invalid DEFAULT_TIMEZONE: ${config.defaultTimezone}`);
  if (!config.ownerIds.length && !config.allowedRoleIds.length) {
    logger.warn("No owner or role allowlist configured; only server administrators can use the assistant");
  }
  if (!config.geminiApiKey) logger.warn("GEMINI_API_KEY is not configured; /assistant will be unavailable");

  const store = new JsonStore(config.dataFile, logger);
  await store.init();

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const marketData = new MarketDataService(logger);
  const paperTrading = new PaperTradingService({ store, marketData, config });
  const services = {
    config, logger, store, marketData, paperTrading,
    authorization: createAuthorization(config),
    gemini: new GeminiService({ apiKey: config.geminiApiKey, model: config.geminiModel, logger }),
  };
  const mcp = new McpManager(services);
  services.mcp = mcp;
  await mcp.init();

  const scheduler = new ReminderScheduler({ client, store, logger });
  const webhook = new TradingViewWebhook({ client, config, paperTrading, logger });
  if (webhook.enabled) webhook.validateConfig();

  client.once("ready", async (readyClient) => {
    logger.info("Executive assistant online", { user: readyClient.user.tag, guilds: readyClient.guilds.cache.size });
    scheduler.start();
    await webhook.start().catch((error) => logger.error("Could not start TradingView webhook", { error: error.message }));
  });
  client.on("interactionCreate", createInteractionHandler(commandMap, services));
  client.on("error", (error) => logger.error("Discord client error", { error: error.stack || error.message }));

  const shutdown = async (signal) => {
    logger.info("Shutting down", { signal });
    scheduler.stop();
    await webhook.stop().catch(() => {});
    await mcp.close().catch(() => {});
    client.destroy();
    await store.persist().catch(() => {});
    process.exit(0);
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  await registerCommands(config, commands, logger);
  await client.login(config.token);
}

main().catch((error) => {
  console.error(JSON.stringify({ time: new Date().toISOString(), level: "error", message: "Startup failed", error: error.stack || error.message }));
  process.exit(1);
});

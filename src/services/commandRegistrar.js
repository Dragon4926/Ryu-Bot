const { REST, Routes } = require("discord.js");

async function registerCommands(config, commands, logger) {
  const rest = new REST({ version: "10" }).setToken(config.token);
  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);
  const scope = config.guildId ? `guild ${config.guildId}` : "global";
  logger.info("Registering application commands", { scope, count: commands.length });
  await rest.put(route, { body: commands.map((command) => command.data.toJSON()) });
  logger.info("Application commands registered", { scope });
}

module.exports = { registerCommands };

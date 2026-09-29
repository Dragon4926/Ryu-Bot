const { MessageFlags } = require("discord.js");

function createInteractionHandler(commandMap, services) {
  return async function onInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;
    try {
      if (!(await services.authorization.enforce(interaction))) return;
      const command = commandMap.get(interaction.commandName);
      if (!command) {
        await interaction.reply({ content: "That command is not available.", flags: MessageFlags.Ephemeral });
        return;
      }
      await command.execute(interaction, services);
      services.logger.info("Command completed", { command: interaction.commandName, userId: interaction.user.id, guildId: interaction.guildId });
    } catch (error) {
      services.logger.error("Command failed", { command: interaction.commandName, userId: interaction.user.id, error: error.stack || error.message });
      const response = { content: "Something went wrong while handling that request. Please try again.", flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) await interaction.followUp(response).catch(() => {});
      else await interaction.reply(response).catch(() => {});
    }
  };
}

module.exports = { createInteractionHandler };

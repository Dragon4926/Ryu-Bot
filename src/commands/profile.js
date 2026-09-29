const { MessageFlags, SlashCommandBuilder } = require("discord.js");
const { formatInTimezone, isValidTimezone } = require("../utils/time");

module.exports = {
  data: new SlashCommandBuilder().setName("profile").setDescription("Configure your assistant preferences").setDMPermission(false)
    .addSubcommand((sub) => sub.setName("show").setDescription("Show your preferences"))
    .addSubcommand((sub) => sub.setName("timezone").setDescription("Set your IANA timezone")
      .addStringOption((o) => o.setName("value").setDescription("For example: Asia/Kolkata, Europe/London").setRequired(true))),

  async execute(interaction, services) {
    const flags = MessageFlags.Ephemeral;
    const args = [interaction.guildId, interaction.user.id, services.config.defaultTimezone];
    if (interaction.options.getSubcommand() === "show") {
      const user = services.store.getUser(...args);
      return interaction.reply({ content: `**Timezone:** ${user.profile.timezone}\n**Local time:** ${formatInTimezone(new Date(), user.profile.timezone)}\n**AI:** ${services.gemini.enabled ? `Gemini (${services.config.geminiModel})` : "Not configured"}`, flags });
    }
    const timezone = interaction.options.getString("value", true);
    if (!isValidTimezone(timezone)) return interaction.reply({ content: "That isn't a valid IANA timezone. Try a value such as `Asia/Kolkata` or `America/New_York`.", flags });
    await services.store.update(...args, (user) => { user.profile.timezone = timezone; });
    return interaction.reply({ content: `Timezone updated to **${timezone}**. Your local time is ${formatInTimezone(new Date(), timezone)}.`, flags });
  },
};

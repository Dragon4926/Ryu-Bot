const { randomUUID } = require("node:crypto");
const { MessageFlags, SlashCommandBuilder } = require("discord.js");
const { discordTimestamp, parseMoment } = require("../utils/time");
const { shortId, truncate } = require("../utils/text");

module.exports = {
  data: new SlashCommandBuilder().setName("reminder").setDescription("Set and manage private reminders").setDMPermission(false)
    .addSubcommand((sub) => sub.setName("set").setDescription("Set a reminder")
      .addStringOption((o) => o.setName("text").setDescription("What should I remind you about?").setRequired(true).setMaxLength(500))
      .addStringOption((o) => o.setName("when").setDescription("ISO date/time or relative: 30m, 2h, 3d").setRequired(true))
      .addStringOption((o) => o.setName("delivery").setDescription("Where should I remind you?").addChoices(
        { name: "Private DM (recommended)", value: "dm" }, { name: "This channel", value: "channel" }
      )))
    .addSubcommand((sub) => sub.setName("list").setDescription("List pending reminders"))
    .addSubcommand((sub) => sub.setName("cancel").setDescription("Cancel a reminder")
      .addStringOption((o) => o.setName("id").setDescription("Reminder ID").setRequired(true))),

  async execute(interaction, services) {
    const sub = interaction.options.getSubcommand();
    const flags = MessageFlags.Ephemeral;
    const args = [interaction.guildId, interaction.user.id, services.config.defaultTimezone];
    if (sub === "set") {
      const when = parseMoment(interaction.options.getString("when", true));
      if (!when || when <= new Date()) return interaction.reply({ content: "Enter a future ISO date/time (including its timezone) or a relative value such as `30m`, `2h`, or `3d`.", flags });
      const reminder = { id: randomUUID(), text: interaction.options.getString("text", true), when: when.toISOString(), status: "pending", attempts: 0, createdAt: new Date().toISOString() };
      await services.store.update(...args, (user) => user.reminders.push(reminder));
      return interaction.reply({ content: `I'll remind you by DM ${discordTimestamp(when)} (${discordTimestamp(when, "R")}). ID: \`${shortId(reminder.id)}\``, flags });
    }
    const user = services.store.getUser(...args);
    if (sub === "list") {
      const reminders = user.reminders.filter((item) => item.status === "pending").sort((a, b) => new Date(a.when) - new Date(b.when));
      const visible = reminders.slice(0, 10);
      const lines = visible.map((item) => `⏰ \`${shortId(item.id)}\` ${discordTimestamp(item.when, "R")} — ${truncate(item.text, 120)}`);
      if (reminders.length > visible.length) lines.push(`…and ${reminders.length - visible.length} more.`);
      const content = reminders.length ? lines.join("\n") : "You have no pending reminders.";
      return interaction.reply({ content, flags });
    }
    const id = interaction.options.getString("id", true).toLowerCase();
    let found;
    await services.store.update(...args, (data) => {
      const matches = data.reminders.filter((item) => item.status === "pending" && item.id.toLowerCase().startsWith(id));
      if (matches.length === 1) { matches[0].status = "cancelled"; found = matches[0]; }
      else found = matches.length ? "ambiguous" : null;
    });
    return interaction.reply({ content: found === "ambiguous" ? "That ID is ambiguous; enter more characters." : found ? `Cancelled: **${found.text}**` : "No pending reminder matches that ID.", flags });
  },
};

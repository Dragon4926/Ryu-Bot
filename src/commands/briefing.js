const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require("discord.js");
const { discordTimestamp, formatInTimezone } = require("../utils/time");
const { shortId, truncate } = require("../utils/text");

module.exports = {
  data: new SlashCommandBuilder().setName("briefing").setDescription("Get a private executive briefing").setDMPermission(false),

  async execute(interaction, services) {
    const user = services.store.getUser(interaction.guildId, interaction.user.id, services.config.defaultTimezone);
    const now = new Date();
    const tasks = user.tasks.filter((task) => task.status === "open");
    const overdue = tasks.filter((task) => task.due && new Date(task.due) < now);
    const highPriority = tasks.filter((task) => task.priority === "high" && !overdue.includes(task));
    const upcoming = user.reminders.filter((item) => item.status === "pending" && new Date(item.when) >= now).sort((a, b) => new Date(a.when) - new Date(b.when)).slice(0, 5);

    const taskLine = (task) => `\`${shortId(task.id)}\` ${truncate(task.title, 90)}${task.due ? ` · ${discordTimestamp(task.due, "R")}` : ""}`;
    const embed = new EmbedBuilder()
      .setTitle("Executive briefing")
      .setDescription(`**${formatInTimezone(now, user.profile.timezone)}** · ${user.profile.timezone}\n${tasks.length} open task${tasks.length === 1 ? "" : "s"}, ${overdue.length} overdue`)
      .setColor(overdue.length ? 0xb42318 : 0x1f7a4d)
      .addFields(
        { name: "Needs attention", value: overdue.length ? overdue.slice(0, 8).map(taskLine).join("\n") : "Nothing overdue.", inline: false },
        { name: "High priority", value: highPriority.length ? highPriority.slice(0, 8).map(taskLine).join("\n") : "No high-priority tasks.", inline: false },
        { name: "Coming up", value: upcoming.length ? upcoming.map((item) => `${discordTimestamp(item.when, "R")} — ${truncate(item.text, 90)}`).join("\n") : "No upcoming reminders.", inline: false },
      )
      .setFooter({ text: "Use /assistant for prioritization, preparation, or drafting." });
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

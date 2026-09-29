const { randomUUID } = require("node:crypto");
const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require("discord.js");
const { discordTimestamp, parseMoment } = require("../utils/time");
const { shortId, truncate } = require("../utils/text");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("task")
    .setDescription("Manage your executive task list")
    .setDMPermission(false)
    .addSubcommand((sub) => sub.setName("add").setDescription("Capture a task")
      .addStringOption((o) => o.setName("title").setDescription("Clear next action").setRequired(true).setMaxLength(200))
      .addStringOption((o) => o.setName("details").setDescription("Context or desired outcome").setMaxLength(1000))
      .addStringOption((o) => o.setName("priority").setDescription("Priority").addChoices(
        { name: "High", value: "high" }, { name: "Medium", value: "medium" }, { name: "Low", value: "low" }
      ))
      .addStringOption((o) => o.setName("due").setDescription("ISO date/time or relative: 30m, 2h, 3d")))
    .addSubcommand((sub) => sub.setName("list").setDescription("Review tasks")
      .addStringOption((o) => o.setName("status").setDescription("Which tasks").addChoices(
        { name: "Open", value: "open" }, { name: "Completed", value: "done" }, { name: "All", value: "all" }
      )))
    .addSubcommand((sub) => sub.setName("done").setDescription("Complete a task")
      .addStringOption((o) => o.setName("id").setDescription("Task ID shown in /task list").setRequired(true)))
    .addSubcommand((sub) => sub.setName("remove").setDescription("Permanently remove a task")
      .addStringOption((o) => o.setName("id").setDescription("Task ID shown in /task list").setRequired(true))),

  async execute(interaction, services) {
    const sub = interaction.options.getSubcommand();
    const flags = MessageFlags.Ephemeral;
    const args = [interaction.guildId, interaction.user.id, services.config.defaultTimezone];

    if (sub === "add") {
      const dueInput = interaction.options.getString("due");
      const due = dueInput ? parseMoment(dueInput) : null;
      if (dueInput && !due) return interaction.reply({ content: "I couldn't understand that due date. Use an ISO date with timezone, or a relative value such as `2h` or `3d`.", flags });
      const task = {
        id: randomUUID(), title: interaction.options.getString("title", true),
        details: interaction.options.getString("details") || "", priority: interaction.options.getString("priority") || "medium",
        due: due?.toISOString() || null, status: "open", createdAt: new Date().toISOString(), completedAt: null,
      };
      await services.store.update(...args, (user) => user.tasks.push(task));
      return interaction.reply({ content: `Task captured: **${task.title}** · ID \`${shortId(task.id)}\`${task.due ? ` · due ${discordTimestamp(task.due)}` : ""}`, flags });
    }

    if (sub === "list") {
      const status = interaction.options.getString("status") || "open";
      const user = services.store.getUser(...args);
      const priorityRank = { high: 0, medium: 1, low: 2 };
      const tasks = user.tasks.filter((task) => status === "all" || task.status === status)
        .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]
          || new Date(a.due || 8640000000000000) - new Date(b.due || 8640000000000000));
      if (!tasks.length) return interaction.reply({ content: `No ${status === "all" ? "" : `${status} `}tasks found.`, flags });
      const lines = tasks.slice(0, 25).map((task) => `${task.status === "done" ? "✅" : task.priority === "high" ? "🔴" : task.priority === "low" ? "⚪" : "🟡"} \`${shortId(task.id)}\` **${truncate(task.title, 100)}**${task.due ? ` · ${discordTimestamp(task.due, "R")}` : ""}`);
      const embed = new EmbedBuilder().setTitle("Executive task list").setDescription(lines.join("\n")).setColor(0x3157a4).setFooter({ text: tasks.length > 25 ? `Showing 25 of ${tasks.length}` : `${tasks.length} task${tasks.length === 1 ? "" : "s"}` });
      return interaction.reply({ embeds: [embed], flags });
    }

    const inputId = interaction.options.getString("id", true).toLowerCase();
    let result;
    await services.store.update(...args, (user) => {
      const matches = user.tasks.filter((task) => task.id.toLowerCase().startsWith(inputId));
      if (matches.length !== 1) return result = matches.length ? "ambiguous" : "missing";
      if (sub === "done") {
        matches[0].status = "done";
        matches[0].completedAt = new Date().toISOString();
        result = matches[0];
      } else {
        user.tasks = user.tasks.filter((task) => task.id !== matches[0].id);
        result = matches[0];
      }
    });
    if (result === "missing") return interaction.reply({ content: "No task matches that ID.", flags });
    if (result === "ambiguous") return interaction.reply({ content: "That ID matches multiple tasks; enter more characters.", flags });
    return interaction.reply({ content: sub === "done" ? `Completed: **${result.title}**` : `Removed: **${result.title}**`, flags });
  },
};

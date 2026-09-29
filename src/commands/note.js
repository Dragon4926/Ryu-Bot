const { randomUUID } = require("node:crypto");
const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require("discord.js");
const { shortId, truncate } = require("../utils/text");

module.exports = {
  data: new SlashCommandBuilder().setName("note").setDescription("Maintain a private executive notebook").setDMPermission(false)
    .addSubcommand((sub) => sub.setName("save").setDescription("Save a note")
      .addStringOption((o) => o.setName("title").setDescription("Note title").setRequired(true).setMaxLength(150))
      .addStringOption((o) => o.setName("content").setDescription("Note content").setRequired(true).setMaxLength(3000))
      .addStringOption((o) => o.setName("tags").setDescription("Comma-separated tags").setMaxLength(200)))
    .addSubcommand((sub) => sub.setName("list").setDescription("List or search notes")
      .addStringOption((o) => o.setName("query").setDescription("Search titles, content, and tags")))
    .addSubcommand((sub) => sub.setName("show").setDescription("Read a note")
      .addStringOption((o) => o.setName("id").setDescription("Note ID").setRequired(true)))
    .addSubcommand((sub) => sub.setName("remove").setDescription("Delete a note")
      .addStringOption((o) => o.setName("id").setDescription("Note ID").setRequired(true))),

  async execute(interaction, services) {
    const flags = MessageFlags.Ephemeral;
    const sub = interaction.options.getSubcommand();
    const args = [interaction.guildId, interaction.user.id, services.config.defaultTimezone];
    if (sub === "save") {
      const note = { id: randomUUID(), title: interaction.options.getString("title", true), content: interaction.options.getString("content", true), tags: (interaction.options.getString("tags") || "").split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 10), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await services.store.update(...args, (user) => user.notes.push(note));
      return interaction.reply({ content: `Saved **${note.title}** · ID \`${shortId(note.id)}\``, flags });
    }
    const user = services.store.getUser(...args);
    if (sub === "list") {
      const query = (interaction.options.getString("query") || "").toLowerCase();
      const notes = user.notes.filter((note) => !query || `${note.title} ${note.content} ${note.tags.join(" ")}`.toLowerCase().includes(query)).slice(-20).reverse();
      const description = notes.length ? notes.map((note) => {
        const tags = truncate(note.tags.join(", "), 80);
        return `📝 \`${shortId(note.id)}\` **${truncate(note.title, 100)}**${tags ? ` · ${tags}` : ""}`;
      }).join("\n") : "No matching notes.";
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle(query ? `Notes matching “${truncate(query, 50)}”` : "Executive notebook").setDescription(description).setColor(0x563d7c)], flags });
    }
    const id = interaction.options.getString("id", true).toLowerCase();
    const matches = user.notes.filter((note) => note.id.toLowerCase().startsWith(id));
    if (matches.length !== 1) return interaction.reply({ content: matches.length ? "That ID is ambiguous; enter more characters." : "No note matches that ID.", flags });
    const note = matches[0];
    if (sub === "show") return interaction.reply({ embeds: [new EmbedBuilder().setTitle(truncate(note.title, 250)).setDescription(truncate(note.content, 4000)).setFooter({ text: `ID ${shortId(note.id)}${note.tags.length ? ` · ${note.tags.join(", ")}` : ""}` }).setColor(0x563d7c)], flags });
    await services.store.update(...args, (data) => { data.notes = data.notes.filter((item) => item.id !== note.id); });
    return interaction.reply({ content: `Deleted **${note.title}**.`, flags });
  },
};

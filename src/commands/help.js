const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("help").setDescription("See what your executive assistant can do").setDMPermission(false),
  async execute(interaction) {
    const embed = new EmbedBuilder().setTitle("Ryu Executive Assistant").setColor(0x1d3557)
      .setDescription("A discreet command center for your priorities, memory, reminders, and executive thinking.")
      .addFields(
        { name: "🧠 Think and communicate", value: "`/assistant` — research framing, decision support, drafts, meeting preparation, summaries, and next actions.\n`/workflow` — run a designed planning, triage, memo, or portfolio-review prompt." },
        { name: "✅ Execute", value: "`/task add|list|done|remove` — maintain a prioritized action list.\n`/briefing` — review what requires attention." },
        { name: "⏰ Stay ahead", value: "`/reminder set|list|cancel` — receive private DM reminders." },
        { name: "📝 Remember", value: "`/note save|list|show|remove` — keep a searchable private notebook." },
        { name: "📈 Simulate", value: "`/trade quote|buy|sell|portfolio|history` — inspect markets and operate an isolated paper portfolio." },
        { name: "⚙️ Preferences", value: "`/profile show|timezone` — set your working timezone." },
      )
      .setFooter({ text: "Assistant replies are private by default. Verify consequential AI-generated information." });
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

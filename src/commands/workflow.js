const { MessageFlags, SlashCommandBuilder } = require("discord.js");
const { chunkText } = require("../utils/text");

const WORKFLOWS = {
  daily_plan: "daily_executive_plan",
  task_triage: "task_triage",
  decision_memo: "decision_memo",
  portfolio_review: "paper_portfolio_review",
};

module.exports = {
  data: new SlashCommandBuilder().setName("workflow").setDescription("Run a designed executive MCP workflow").setDMPermission(false)
    .addStringOption((option) => option.setName("type").setDescription("Workflow to run").setRequired(true).addChoices(
      { name: "Daily executive plan", value: "daily_plan" },
      { name: "Task triage", value: "task_triage" },
      { name: "Decision memo", value: "decision_memo" },
      { name: "Paper portfolio review", value: "portfolio_review" },
    ))
    .addStringOption((option) => option.setName("context").setDescription("Optional objective, decision, constraints, or emphasis").setMaxLength(1200)),

  async execute(interaction, services) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const type = interaction.options.getString("type", true);
    const context = interaction.options.getString("context") || "";
    const identity = { guildId: interaction.guildId, userId: interaction.user.id };
    try {
      const designedPrompt = await services.mcp.getLocalPrompt(WORKFLOWS[type], {}, identity);
      const response = await services.gemini.generate({
        system: "You are Ryu, a discreet executive assistant. Follow the supplied workflow and its output contract. Use MCP tools for current facts, clearly label assumptions, keep the result decision-ready, and never execute a conversational paper trade. Market data is delayed and educational only.",
        history: [],
        prompt: `${designedPrompt}${context ? `\n\nUser-supplied context:\n${context}` : ""}`,
        tools: services.mcp.geminiTools(),
        callTool: (name, args) => services.mcp.call(name, args, identity),
      });
      const chunks = chunkText(response);
      await interaction.editReply(chunks.shift());
      for (const chunk of chunks) await interaction.followUp({ content: chunk, flags: MessageFlags.Ephemeral });
    } catch (error) {
      services.logger.warn("Executive workflow failed", { type, userId: interaction.user.id, error: error.message });
      await interaction.editReply(`I couldn't complete that workflow: ${error.message}`);
    }
  },
};

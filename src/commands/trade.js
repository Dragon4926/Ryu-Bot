const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require("discord.js");
const { shortId, truncate } = require("../utils/text");

function money(value, currency) {
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function orderSubcommand(name) {
  return (sub) => sub.setName(name).setDescription(`${name === "buy" ? "Buy" : "Sell"} in your paper portfolio`)
    .addStringOption((o) => o.setName("symbol").setDescription("TradingView symbol, e.g. NASDAQ:AAPL or NSE:RELIANCE").setRequired(true))
    .addNumberOption((o) => o.setName("quantity").setDescription("Number of paper shares/units").setRequired(true).setMinValue(0.000001))
    .addBooleanOption((o) => o.setName("confirm").setDescription("Set true to execute; false returns a preview").setRequired(true));
}

module.exports = {
  data: new SlashCommandBuilder().setName("trade").setDescription("Use the isolated paper-trading simulator").setDMPermission(false)
    .addSubcommand((sub) => sub.setName("quote").setDescription("Get a delayed market quote and TradingView chart")
      .addStringOption((o) => o.setName("symbol").setDescription("TradingView symbol").setRequired(true)))
    .addSubcommand(orderSubcommand("buy"))
    .addSubcommand(orderSubcommand("sell"))
    .addSubcommand((sub) => sub.setName("portfolio").setDescription("Value your paper portfolio"))
    .addSubcommand((sub) => sub.setName("history").setDescription("Show recent simulated fills")),

  async execute(interaction, services) {
    const flags = MessageFlags.Ephemeral;
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ flags });
    try {
      if (sub === "quote") {
        const quote = await services.marketData.quote(interaction.options.getString("symbol", true));
        const change = quote.previousClose ? ((quote.price - quote.previousClose) / quote.previousClose) * 100 : null;
        return interaction.editReply(`**${quote.symbol}** · ${money(quote.price, quote.currency)}${change === null ? "" : ` · ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}\n${quote.exchange || "Unknown exchange"} · ${quote.marketState || "unknown market state"} · [Open TradingView](${quote.tradingViewUrl})\n-# Delayed public quote as of ${quote.asOf}; not financial advice.`);
      }

      if (sub === "buy" || sub === "sell") {
        const order = { side: sub, symbol: interaction.options.getString("symbol", true), quantity: interaction.options.getNumber("quantity", true) };
        const preview = await services.paperTrading.preview(order);
        if (!interaction.options.getBoolean("confirm", true)) {
          return interaction.editReply(`**Paper ${sub} preview**\n${preview.quantity} × **${preview.symbol}** at approximately ${money(preview.estimatedPrice, preview.currency)}\nEstimated value: **${money(preview.estimatedValue, preview.currency)}**\n[Inspect chart on TradingView](${preview.tradingViewUrl})\n\nNothing was executed. Run the command again with \`confirm: True\` to simulate the fill.`);
        }
        const trade = JSON.parse(await services.mcp.call("ryu_paper_trade_execute", {
          ...order, confirmation: "EXECUTE PAPER TRADE",
        }, { guildId: interaction.guildId, userId: interaction.user.id }));
        return interaction.editReply(`✅ **Paper ${trade.side} filled**\n${trade.quantity} × **${trade.symbol}** at ${money(trade.price, trade.currency)}\nValue: **${money(trade.value, trade.currency)}** · ID \`${shortId(trade.id)}\`\n-# Simulation only. No real order was sent.`);
      }

      if (sub === "portfolio") {
        const portfolio = await services.paperTrading.portfolio(interaction.guildId, interaction.user.id);
        const cash = Object.entries(portfolio.cash).map(([currency, amount]) => `${currency}: ${money(amount, currency)}`).join("\n");
        const positions = portfolio.positions.length ? portfolio.positions.slice(0, 20).map((p) => `**${p.symbol}** · ${p.quantity} @ ${money(p.averagePrice, p.currency)}${p.marketValue === null ? " · quote unavailable" : ` · value ${money(p.marketValue, p.currency)} · P/L ${money(p.unrealizedPnl, p.currency)}`}`).join("\n") : "No open positions.";
        const embed = new EmbedBuilder().setTitle("Paper portfolio").setColor(0x2563eb).addFields({ name: "Available paper cash", value: cash }, { name: "Positions", value: truncate(positions, 1024) }).setFooter({ text: "Simulation only · delayed quotes · no real orders" });
        return interaction.editReply({ embeds: [embed] });
      }

      const trades = services.paperTrading.history(interaction.guildId, interaction.user.id, 15);
      return interaction.editReply(trades.length ? trades.map((trade) => `${trade.side === "buy" ? "🟢" : "🔴"} \`${shortId(trade.id)}\` ${trade.side.toUpperCase()} ${trade.quantity} **${trade.symbol}** @ ${money(trade.price, trade.currency)}`).join("\n") : "No paper trades yet.");
    } catch (error) {
      services.logger.warn("Paper trading command failed", { userId: interaction.user.id, error: error.message });
      return interaction.editReply(`Paper trading request failed: ${error.message}`);
    }
  },
};

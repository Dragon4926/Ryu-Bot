const { randomUUID } = require("node:crypto");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { z } = require("zod");
const { parseMoment } = require("../utils/time");

function output(value) {
  return { content: [{ type: "text", text: JSON.stringify(value) }] };
}

function requireContext(contextStorage) {
  const context = contextStorage.getStore();
  if (!context?.guildId || !context?.userId) throw new Error("This tool requires an authenticated Ryu user context");
  return context;
}

function createLocalMcpServer({ contextStorage, store, config, marketData, paperTrading }) {
  const server = new McpServer({ name: "ryu-executive-tools", version: "1.0.0" });

  server.registerTool("tasks_list", {
    title: "List executive tasks",
    description: "Read the current user's tasks. Use before prioritizing, planning, or referring to an existing task. Never invent task IDs.",
    inputSchema: { status: z.enum(["open", "done", "all"]).default("open") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ status }) => {
    const { guildId, userId } = requireContext(contextStorage);
    const tasks = store.getUser(guildId, userId, config.defaultTimezone).tasks;
    return output(tasks.filter((task) => status === "all" || task.status === status).slice(-100));
  });

  server.registerTool("task_create", {
    title: "Create an executive task",
    description: "Create a task only when the user clearly asks to capture, add, remember, or track an action. Use a concrete next-action title. Relative due times such as 2h or 3d are accepted.",
    inputSchema: {
      title: z.string().min(1).max(200), details: z.string().max(1000).optional(),
      priority: z.enum(["high", "medium", "low"]).default("medium"), due: z.string().optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async ({ title, details, priority, due }) => {
    const { guildId, userId } = requireContext(contextStorage);
    const parsedDue = due ? parseMoment(due) : null;
    if (due && !parsedDue) throw new Error("Invalid due date; use ISO with timezone or a relative value such as 2h or 3d");
    const task = { id: randomUUID(), title, details: details || "", priority, due: parsedDue?.toISOString() || null, status: "open", createdAt: new Date().toISOString(), completedAt: null };
    await store.update(guildId, userId, config.defaultTimezone, (user) => user.tasks.push(task));
    return output(task);
  });

  server.registerTool("task_complete", {
    title: "Complete a task",
    description: "Mark one existing task complete. Call tasks_list first when the ID is not supplied or is ambiguous.",
    inputSchema: { id: z.string().min(4).describe("Full task ID or unique prefix") },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ id }) => {
    const { guildId, userId } = requireContext(contextStorage);
    let completed;
    await store.update(guildId, userId, config.defaultTimezone, (user) => {
      const matches = user.tasks.filter((task) => task.id.startsWith(id) && task.status === "open");
      if (matches.length !== 1) throw new Error(matches.length ? "Task ID is ambiguous" : "Open task not found");
      matches[0].status = "done";
      matches[0].completedAt = new Date().toISOString();
      completed = matches[0];
    });
    return output(completed);
  });

  server.registerTool("notes_search", {
    title: "Search executive notes",
    description: "Search private notes for context about people, meetings, decisions, projects, and prior research.",
    inputSchema: { query: z.string().max(200).default("") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ query }) => {
    const { guildId, userId } = requireContext(contextStorage);
    const needle = query.toLowerCase();
    const notes = store.getUser(guildId, userId, config.defaultTimezone).notes
      .filter((note) => !needle || `${note.title} ${note.content} ${note.tags.join(" ")}`.toLowerCase().includes(needle))
      .slice(-20).map((note) => ({ ...note, content: note.content.slice(0, 1500) }));
    return output(notes);
  });

  server.registerTool("reminders_list", {
    title: "List reminders",
    description: "Read pending reminders and their exact scheduled times.",
    inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => {
    const { guildId, userId } = requireContext(contextStorage);
    return output(store.getUser(guildId, userId, config.defaultTimezone).reminders.filter((item) => item.status === "pending"));
  });

  server.registerTool("executive_brief", {
    title: "Build structured executive context",
    description: "Return compact task, reminder, portfolio, and timezone context for a briefing or planning session.",
    inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => {
    const { guildId, userId } = requireContext(contextStorage);
    const user = store.getUser(guildId, userId, config.defaultTimezone);
    const portfolio = await paperTrading.portfolio(guildId, userId);
    return output({ now: new Date().toISOString(), timezone: user.profile.timezone, openTasks: user.tasks.filter((t) => t.status === "open"), pendingReminders: user.reminders.filter((r) => r.status === "pending"), paperPortfolio: portfolio });
  });

  server.registerTool("market_quote", {
    title: "Get a delayed market quote",
    description: "Get a no-key delayed public quote. Supports TradingView-style symbols such as NASDAQ:AAPL, NYSE:BRK.B, NSE:RELIANCE, and BSE:500325. Never describe it as real-time or execution-grade.",
    inputSchema: { symbol: z.string().min(1).max(32) }, annotations: { readOnlyHint: true, openWorldHint: true },
  }, async ({ symbol }) => output(await marketData.quote(symbol)));

  server.registerTool("paper_portfolio", {
    title: "Read paper portfolio",
    description: "Value the current user's isolated simulated portfolio with delayed quotes. This never accesses a brokerage or TradingView Paper Trading account.",
    inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: true },
  }, async () => {
    const { guildId, userId } = requireContext(contextStorage);
    return output(await paperTrading.portfolio(guildId, userId));
  });

  server.registerTool("paper_trade_preview", {
    title: "Preview a paper trade",
    description: "Preview a simulated buy or sell. This tool NEVER executes. Tell the user to use /trade buy or /trade sell with confirm:true after reviewing the preview.",
    inputSchema: { side: z.enum(["buy", "sell"]), symbol: z.string().min(1).max(32), quantity: z.number().positive().max(1_000_000) },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async (order) => output(await paperTrading.preview(order)));

  server.registerTool("paper_trade_execute", {
    title: "Execute a confirmed paper trade",
    description: "Execute a simulated market fill. This tool is hidden from Gemini and reserved for an explicit Discord confirmation or trusted direct MCP client. It never places a real order.",
    inputSchema: {
      side: z.enum(["buy", "sell"]), symbol: z.string().min(1).max(32),
      quantity: z.number().positive().max(1_000_000), confirmation: z.literal("EXECUTE PAPER TRADE"),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  }, async ({ side, symbol, quantity }) => {
    const { guildId, userId } = requireContext(contextStorage);
    return output(await paperTrading.execute(guildId, userId, { side, symbol, quantity, source: "discord_mcp" }));
  });

  server.registerTool("tradingview_chart", {
    title: "Create TradingView chart link",
    description: "Return a TradingView chart URL for a validated symbol without scraping or automating TradingView.",
    inputSchema: { symbol: z.string().min(1).max(32) }, annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ symbol }) => {
    const { tradingViewUrl, normalizeSymbol } = require("../services/marketData");
    return output({ symbol: normalizeSymbol(symbol).display, url: tradingViewUrl(symbol) });
  });

  const prompts = [
    ["daily_executive_plan", "Turn the executive brief into a focused daily plan", "Use executive_brief. Identify the three outcomes that matter most today, schedule deep-work blocks, surface overdue risks, and produce a concise delegation/follow-up list. Do not overload the day."],
    ["task_triage", "Triage a crowded task list", "Use tasks_list with status open. Classify tasks by urgency and leverage, identify what to do, delegate, defer, or delete, then recommend the next three concrete actions with rationale."],
    ["decision_memo", "Prepare a decision-ready memo", "Produce a one-page memo with decision, context, options, recommendation, assumptions, risks, reversible versus irreversible elements, and next action. Search notes when the user names a project or person."],
    ["paper_portfolio_review", "Review simulated portfolio risk", "Use paper_portfolio and relevant market_quote tools. Separate observations from assumptions, identify concentration and currency exposure, discuss scenarios rather than predictions, and state clearly that this is educational simulation—not financial advice."],
  ];
  for (const [name, description, text] of prompts) {
    server.registerPrompt(name, { title: description, description }, async () => ({ messages: [{ role: "user", content: { type: "text", text } }] }));
  }

  return server;
}

module.exports = { createLocalMcpServer };

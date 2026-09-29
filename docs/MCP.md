# MCP architecture and tool policy

Ryu uses the Model Context Protocol (MCP) as the boundary between Gemini and operational capabilities. Gemini decides when a tool is useful; MCP validates every input and executes against the authenticated Discord user's isolated data.

## Architecture

```text
Discord /assistant
  -> Gemini function-calling loop
    -> MCP Manager (tool name namespace + allowlist)
      -> built-in ryu-executive-tools MCP server (in-memory transport)
      -> optional external MCP servers (stdio transport)
  -> concise Discord response
```

The built-in server and client communicate through the official `@modelcontextprotocol/sdk`. `AsyncLocalStorage` attaches `guildId` and `userId` to each call so one member cannot read another member's tasks, notes, reminders, or portfolio.

## Built-in tools

| Tool | Mutates data | Intended use |
| --- | ---: | --- |
| `ryu_tasks_list` | No | Ground planning and prioritization in actual tasks |
| `ryu_task_create` | Yes | Capture a clearly requested next action |
| `ryu_task_complete` | Yes | Complete an unambiguous existing task |
| `ryu_notes_search` | No | Retrieve meeting, person, project, and decision context |
| `ryu_reminders_list` | No | Check exact upcoming commitments |
| `ryu_executive_brief` | No | Assemble tasks, reminders, timezone, and paper portfolio |
| `ryu_market_quote` | No | Retrieve a delayed public quote without another API key |
| `ryu_paper_portfolio` | No | Inspect the caller's isolated simulated portfolio |
| `ryu_paper_trade_preview` | No | Preview—but never execute—a paper order |
| `ryu_paper_trade_execute` | Yes | Execute a confirmed simulated fill; hidden from Gemini |
| `ryu_tradingview_chart` | No | Generate a validated TradingView chart link |

Paper-trade execution exists in the MCP server but is intentionally **excluded from Gemini's function declarations**. `/trade buy` and `/trade sell` call it only after the member supplies `confirm: True`. Trusted direct MCP clients must also send the exact confirmation phrase. An authenticated TradingView alert webhook uses the same underlying isolated portfolio service. This prevents a model response from autonomously changing a portfolio.

## Prompt catalogue

The MCP server publishes these reusable prompts:

- `daily_executive_plan` — three outcomes, realistic time blocks, risks, and follow-ups
- `task_triage` — do/delegate/defer/delete classification and next actions
- `decision_memo` — decision, options, recommendation, assumptions, risks, and next action
- `paper_portfolio_review` — concentration/currency/scenario review with simulation disclaimer

See [PROMPTS.md](PROMPTS.md) for design guidance and expected output contracts.

## External MCP servers

External MCP is disabled unless `MCP_CONFIG_FILE` points to a configuration file. Copy `.mcp.example.json` to `.mcp.json` and explicitly list allowed tools:

```json
{
  "servers": [
    {
      "name": "company_docs",
      "enabled": true,
      "command": "node",
      "args": ["/absolute/path/to/server.js"],
      "env": {},
      "allowTools": ["search", "read_document"]
    }
  ]
}
```

Security rules:

1. No external tool is exposed unless its exact name appears in `allowTools`.
2. Tool names are namespaced before Gemini sees them.
3. Prefer read-only tools. Do not allow shell, filesystem-write, payment, credential, or real-trading tools.
4. Pin packages and use absolute executable paths in production; avoid unreviewed `npx` packages.
5. Put secrets in process environment—not the tracked configuration file.
6. Treat an MCP server as trusted code with the bot process's operating-system privileges.

## Adding a first-party tool

1. Register it in `src/mcp/localServer.js` with strict Zod constraints.
2. Write a precise description: when to call it, when not to call it, and the meaning of its output.
3. Set MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`).
4. Resolve user state only through authenticated MCP context.
5. Return compact JSON in an MCP text content block.
6. Add unit tests for validation, isolation, and failure behavior.
7. Update the table above and the assistant safety prompt.

## Tool-design standard

A good tool performs one bounded operation, uses typed inputs, has deterministic authorization, returns facts rather than prose, and makes side effects obvious. Tools must not accept arbitrary URLs, commands, file paths, or user IDs unless the use case requires them and validation prevents cross-user access or SSRF.

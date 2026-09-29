# Product task list

## Completed foundation

- [x] Role/owner authorization and private Discord responses
- [x] Durable tasks, notes, reminders, profile, and executive briefing
- [x] Gemini conversational assistance with bounded function-calling loop
- [x] First-party MCP server using the official SDK
- [x] Authenticated per-user MCP context and typed tool schemas
- [x] External stdio MCP support with explicit per-tool allowlists
- [x] Executive prompt catalogue and action/safety contracts
- [x] Multi-market paper portfolio with isolated user accounts
- [x] TradingView symbol links and no-key delayed public quotes
- [x] Explicit Discord paper-order confirmation
- [x] Authenticated, idempotent TradingView alert ingestion
- [x] Audit history, position valuation, and simulation disclaimers

## Recommended next capabilities

### Executive operations

- [ ] Scheduled morning/evening briefings with quiet hours
- [ ] Recurring tasks and reminders
- [ ] Task dependencies, projects, delegates, and status-review cadence
- [ ] Meeting packets and follow-up extraction from pasted notes
- [ ] Calendar MCP after choosing a calendar provider and completing OAuth
- [ ] Email drafting MCP with send disabled until per-message confirmation

### MCP governance

- [ ] Persist an audit record for every MCP invocation and result category
- [ ] Add per-tool rate limits and external-server timeouts
- [ ] Add an admin command to inspect connected servers and allowed tools
- [ ] Add Streamable HTTP MCP with OAuth if remote MCP is required
- [ ] Add contract tests against supported external MCP servers

### Paper simulation

- [ ] Limit/stop paper orders and pending-order cancellation
- [ ] Configurable fees, slippage, taxes, and market-session checks
- [ ] Realized P/L, equity curve, drawdown, and benchmark comparison
- [ ] Corporate actions and FX conversion
- [ ] Strategy-level budgets and maximum-position/risk guardrails
- [ ] CSV export/import and portfolio reset with multi-step confirmation
- [ ] Replace the public quote endpoint with an official licensed feed if stronger reliability or real-time data is required

### Production readiness

- [ ] Move JSON data to PostgreSQL before running multiple replicas
- [ ] Encrypt sensitive note content at rest with managed keys
- [ ] Add backup/restore drills, health metrics, and alerting
- [ ] Add integration tests with a Discord test guild and mocked Gemini/market APIs

Real-money trade execution is intentionally out of scope. It requires a regulated broker API, separate credentials, stronger identity controls, transaction signing, limits, and compliance review.

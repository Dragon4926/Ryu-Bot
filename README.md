# Ryu Executive Assistant

Ryu is a private executive personal assistant that lives in Discord. It combines dependable workflows—tasks, reminders, notes, and briefings—with Gemini-powered drafting, planning, analysis, and decision support.

## Capabilities

- **Executive copilot:** private AI assistance with task, reminder, and notebook context
- **Task command center:** priorities, due dates, completion, and concise reviews
- **Durable reminders:** reminders delivered by private DM or in a chosen channel, even after restarts
- **Executive notebook:** searchable notes for people, meetings, decisions, and ideas
- **Daily briefing on demand:** overdue work, top priorities, and upcoming commitments
- **Controlled access:** server administrators, selected roles, and selected owners only
- **Privacy by default:** ephemeral command output, minimal Discord intents, local JSON storage

## Commands

| Command | Purpose |
| --- | --- |
| `/assistant` | Draft, analyze, prioritize, plan, prepare, or ask a question |
| `/workflow` | Run an MCP-backed daily plan, task triage, decision memo, or portfolio review |
| `/task add/list/done/remove` | Manage the executive action list |
| `/reminder set/list/cancel` | Schedule private DM reminders |
| `/note save/list/show/remove` | Maintain a searchable private notebook |
| `/briefing` | Review urgent and upcoming work |
| `/profile show/timezone` | Configure personal preferences |
| `/trade quote/buy/sell/portfolio/history` | Operate an isolated paper portfolio |
| `/help` | Show an in-Discord guide |

## Setup

### Requirements

- Node.js 20.11 or later
- A Discord application and bot token
- A Gemini API key for `/assistant` (all deterministic workflows work without it)

### Install and configure

```bash
npm install
cp .env.example .env
```

Fill in at least:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
DISCORD_GUILD_ID=your_test_server_id
ALLOWED_ROLE_IDS=role_id_for_authorized_members
GEMINI_API_KEY=your_gemini_key
DEFAULT_TIMEZONE=Asia/Kolkata
```

Enable the `bot` and `applications.commands` scopes when installing the Discord application. Ryu only requests the Guilds gateway intent; privileged message-content and member intents are not needed.

Start the assistant:

```bash
npm start
```

Guild-scoped commands appear immediately. If `DISCORD_GUILD_ID` is omitted, commands are registered globally and Discord may take time to propagate them.

## Access control

A user is authorized when any of these is true:

1. Their user ID appears in `OWNER_USER_IDS`.
2. They hold a role listed in `ALLOWED_ROLE_IDS`.
3. They are a server administrator.

Both ID settings accept comma-separated values. If neither is configured, only server administrators can use the bot.

## Time input

Tasks and reminders accept relative time (`30m`, `2h`, `3d`) or an ISO timestamp. Absolute timestamps should include an offset, for example `2026-10-01T09:30:00+05:30`, to avoid timezone ambiguity.

## Data and privacy

State is stored at `data/assistant.json` by default and is excluded from Git. Writes use a restricted file mode and atomic replacement. Back up this file as part of deployment operations.

Requests sent through `/assistant`, along with relevant tasks, reminders, notes, and recent assistant history, are sent to the configured Gemini API. Deterministic commands do not send data to Gemini. Do not store passwords, tokens, regulated records, or other secrets in the assistant.

JSON storage is appropriate for a personal or small trusted-team deployment running as one process. Move to a transactional database before running multiple bot replicas.

## Development

```bash
npm run check
npm test
npm audit --omit=dev
```

Use `npm run dev` for automatic restarts. Logs are structured JSON and intentionally avoid command content.

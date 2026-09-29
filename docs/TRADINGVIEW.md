# TradingView-compatible paper trading

Ryu provides its own paper simulator. It does **not** log into, scrape, or control TradingView's Paper Trading account; TradingView does not expose a general public API for that account. Ryu accepts TradingView-style symbols, opens TradingView charts, and can consume strategy alerts.

## Simulator behavior

- Each authorized Discord member gets an isolated portfolio.
- Starting balances are `USD 100,000` and `INR 1,000,000`.
- US and other symbols use forms such as `NASDAQ:AAPL` or `BTC-USD`.
- NSE uses `NSE:RELIANCE`; BSE uses `BSE:500325`.
- Quotes come from Yahoo Finance's unauthenticated public chart endpoint and may be delayed or unavailable.
- Orders are simulated market fills at the retrieved quote; there is no spread, fee, slippage, tax, corporate-action, FX, or partial-fill model.
- No real order is ever routed.

Use `/trade quote`, `/trade buy`, `/trade sell`, `/trade portfolio`, and `/trade history`. Buy and sell commands require the caller to explicitly set `confirm: True`; otherwise they return only a preview.

## TradingView alerts

Webhook ingestion is optional and disabled by default. Configure:

```env
WEBHOOK_PORT=8080
TRADINGVIEW_WEBHOOK_SECRET=generate-a-long-random-value-at-least-24-characters
TRADINGVIEW_GUILD_ID=your_discord_server_id
TRADINGVIEW_USER_ID=the_portfolio_owner_discord_user_id
```

Expose the endpoint through a trusted HTTPS reverse proxy:

```text
POST https://your-host.example/webhooks/tradingview
```

TradingView alert message example:

```json
{
  "secret": "your-long-random-secret",
  "alertId": "my-strategy-{{ticker}}-{{time}}-buy",
  "action": "buy",
  "symbol": "{{exchange}}:{{ticker}}",
  "quantity": 10
}
```

`alertId` is required for idempotency: repeated delivery of the same alert returns the existing simulated trade instead of filling twice. The configured Discord user must still be an owner, administrator, or holder of an allowed role.

For a sell alert, set `action` to `sell`. A sell is rejected if the isolated paper portfolio does not own enough quantity.

## Deployment safety

- Use HTTPS; never expose the plain HTTP listener directly to the internet.
- Keep the secret out of Git and rotate it after any exposure.
- Restrict inbound traffic where practical. TradingView publishes webhook source guidance, but IP ranges can change.
- Do not reuse Discord, Gemini, or infrastructure credentials as the webhook secret.
- The health endpoint is `GET /health` and reveals no portfolio data.
- Webhook request bodies and secrets are never logged.
- Paper alerts can still create misleading outcomes due to delayed quotes. They are not suitable for evaluating execution-sensitive strategies.

## Limitations

This is an educational simulator, not a backtester, broker, investment adviser, or source of real-time exchange data. Performance excludes many real-world costs and should not be treated as evidence that a strategy will perform similarly with money at risk.

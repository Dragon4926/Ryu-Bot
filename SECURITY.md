# Security

- Never commit `.env`, Discord tokens, Gemini keys, or the `data/` directory.
- Rotate a credential immediately if it is exposed.
- Use Discord role and owner allowlists; grant access only to trusted people.
- Treat Gemini output as advisory and verify consequential financial, legal, personnel, and scheduling decisions.
- Gemini receives `/assistant` requests and selected personal context. Avoid storing credentials or regulated secrets.
- Keep dependencies current and run `npm audit --omit=dev` before deployment.
- Treat external MCP servers as trusted executable code. Enable only reviewed servers and explicitly allow individual tools.
- Keep TradingView webhook secrets out of Git, require HTTPS at the edge, and rotate exposed secrets.
- Never add real-broker execution tools without separate identity, approval, transaction-signing, and compliance controls.

Report vulnerabilities privately to the repository owner rather than opening a public issue containing sensitive details.

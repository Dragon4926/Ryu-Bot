class GeminiService {
  constructor({ apiKey, model, logger }) {
    this.apiKey = apiKey;
    this.model = model;
    this.logger = logger;
  }

  get enabled() {
    return Boolean(this.apiKey);
  }

  async generate({ system, history, prompt, tools = [], callTool = null }) {
    if (!this.enabled) throw new Error("AI assistance is not configured. Add GEMINI_API_KEY to the environment.");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    const contents = [
      ...history.map((entry) => ({ role: entry.role === "assistant" ? "model" : "user", parts: [{ text: entry.text }] })),
      { role: "user", parts: [{ text: prompt }] },
    ];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      for (let round = 0; round < 6; round += 1) {
        const request = {
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
        };
        if (tools.length) request.tools = [{ functionDeclarations: tools }];

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error?.message || `Gemini returned HTTP ${response.status}`);
        const candidate = body.candidates?.[0]?.content;
        if (!candidate?.parts?.length) throw new Error("Gemini returned an empty response");
        const functionCalls = candidate.parts.filter((part) => part.functionCall).map((part) => part.functionCall);
        if (!functionCalls.length) {
          const text = candidate.parts.map((part) => part.text || "").join("").trim();
          if (!text) throw new Error("Gemini returned no text response");
          return text;
        }
        if (!callTool) throw new Error("Gemini requested a tool, but tool execution is unavailable");
        if (functionCalls.length > 8) throw new Error("Gemini requested too many tools at once");

        contents.push({ role: "model", parts: candidate.parts });
        const results = await Promise.all(functionCalls.map(async (toolCall) => {
          try {
            const result = await callTool(toolCall.name, toolCall.args || {});
            return { functionResponse: { name: toolCall.name, response: { result } } };
          } catch (error) {
            this.logger.warn("MCP tool call failed", { tool: toolCall.name, error: error.message });
            return { functionResponse: { name: toolCall.name, response: { error: error.message } } };
          }
        }));
        contents.push({ role: "user", parts: results });
      }
      throw new Error("The assistant exceeded the maximum tool-call depth");
    } catch (error) {
      this.logger.error("Gemini request failed", { error: error.message });
      if (error.name === "AbortError") throw new Error("The AI request timed out. Please try again.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = { GeminiService };

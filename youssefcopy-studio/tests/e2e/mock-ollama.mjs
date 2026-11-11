// Minimal mock of the Ollama HTTP API for browser tests (NOT a real model).
// Returns canned, schema-valid JSON so the AI Mode UI can be exercised deterministically.
import http from "node:http";

const PORT = Number(process.env.MOCK_OLLAMA_PORT ?? 11500);

const draft = {
  objective: "Introduce the mask and its primary benefit",
  subjectLines: ["Mock AI subject one", "Mock AI subject two", "Mock AI subject three"],
  previewText: "Mock AI preview text.",
  hook: "Mock AI hook: early light waking you up?",
  body: "Mock AI body paragraph one about the problem.\n\nMock AI body paragraph two about the verified benefit.",
  cta: "Mock AI CTA",
  segment: "New subscribers (mock)",
  rationale: "Mock AI rationale.",
  researchRefs: ["Profile: benefits"],
  missingInformation: ["Mock: no verified reviews"],
};

function reply(prompt) {
  if (prompt.includes("Act as a senior editor")) {
    return { summary: "Mock review.", categories: [{ key: "clarity", score: 8, comment: "Clear." }, { key: "factual", score: 9, comment: "Grounded." }], improvements: ["Mock improvement 1", "Mock improvement 2", "Mock improvement 3"], factualConcerns: [] };
  }
  if (prompt.includes("Write 3 alternative opening hooks")) return { options: ["Mock hook option A", "Mock hook option B", "Mock hook option C"], changeSummary: "Three hooks", missingInformation: [] };
  if (prompt.includes("Write 3 alternative CTAs")) return { options: ["Mock CTA A", "Mock CTA B", "Mock CTA C"], changeSummary: "Three CTAs", missingInformation: [] };
  if (prompt.includes("Shorten the email")) return { body: "Mock shortened body.", changeSummary: "Shortened", missingInformation: [] };
  return draft;
}

http
  .createServer((req, res) => {
    const send = (code, obj) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(obj));
    };
    if (req.method === "GET" && req.url === "/") return send(200, { status: "mock ollama" });
    if (req.method === "GET" && req.url === "/api/version") return send(200, { version: "mock-0.0" });
    if (req.method === "GET" && req.url === "/api/tags") return send(200, { models: [{ name: "qwen3:1.7b" }] });
    if (req.method === "POST" && req.url === "/api/chat") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const body = JSON.parse(raw);
        if (body.model !== "qwen3:1.7b") return send(404, { error: `model '${body.model}' not found` });
        const prompt = body.messages.map((m) => m.content).join("\n");
        setTimeout(() => send(200, { model: body.model, message: { role: "assistant", content: JSON.stringify(reply(prompt)) }, prompt_eval_count: 500, eval_count: 200, done: true }), 300);
      });
      return;
    }
    send(404, { error: "not found" });
  })
  .listen(PORT, "127.0.0.1", () => console.log(`mock ollama on ${PORT}`));

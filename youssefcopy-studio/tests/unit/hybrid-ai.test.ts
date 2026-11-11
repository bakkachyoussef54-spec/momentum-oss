import { describe, expect, it, vi } from "vitest";
import { aiStatusFrom, keyPresence, OLLAMA_DEFAULT_MODEL, OLLAMA_DEFAULT_URL, readAiConfig } from "@/lib/ai/config";
import { complete, extractJson, testConnection } from "@/lib/ai/providers";
import { buildDraftPrompt, buildRevisionPrompt, draftResponseSchema, REVISION_ACTIONS, reviewResponseSchema, revisionResponseSchema } from "@/lib/ai/prompts";
import { buildCampaignBrief } from "@/lib/strategy/playbooks";
import { sleepMaskBrand, verifiedResearch } from "../fixtures";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe("AI settings resolution (mocked, no network)", () => {
  it("defaults Ollama to the local URL and qwen3:1.7b with no key", () => {
    const { config } = readAiConfig(env({}), { provider: "ollama" });
    expect(config).toMatchObject({ provider: "ollama", baseUrl: OLLAMA_DEFAULT_URL, model: OLLAMA_DEFAULT_MODEL, apiKey: "", inputCostPerMTok: 0 });
    expect(OLLAMA_DEFAULT_URL).toBe("http://127.0.0.1:11434");
    expect(aiStatusFrom({ config, reason: "" }, true)).toMatchObject({ available: true, isLocal: true, providerLabel: "Ollama (local)" });
  });

  it("UI choices override env defaults, but keys only come from env", () => {
    const { config } = readAiConfig(env({ AI_PROVIDER: "ollama", OPENAI_API_KEY: "sk-secret" }), { provider: "openai", model: "gpt-x" });
    expect(config).toMatchObject({ provider: "openai", model: "gpt-x", apiKey: "sk-secret", baseUrl: "https://api.openai.com/v1" });
    // A base URL typed in the UI cannot redirect the OpenAI key elsewhere.
    expect(readAiConfig(env({ OPENAI_API_KEY: "sk" }), { provider: "openai", baseUrl: "https://evil.example" }).config?.baseUrl).toBe("https://api.openai.com/v1");
  });

  it("only sends the OpenAI-compatible key to the env-configured host", () => {
    const e = env({ OPENAI_COMPATIBLE_BASE_URL: "http://localhost:1234/v1", OPENAI_COMPATIBLE_API_KEY: "k", AI_MODEL: "m" });
    expect(readAiConfig(e, { provider: "openai-compatible" }).config?.apiKey).toBe("k");
    expect(readAiConfig(e, { provider: "openai-compatible", baseUrl: "http://localhost:1234/v1/" }).config?.apiKey).toBe("k");
    expect(readAiConfig(e, { provider: "openai-compatible", baseUrl: "https://other.example/v1" }).config?.apiKey).toBe("");
  });

  it("explains what is missing and never falls back to another provider", () => {
    const r = readAiConfig(env({ ANTHROPIC_API_KEY: "a" }), { provider: "openai" });
    expect(r.config).toBeNull();
    expect(r.reason).toMatch(/OPENAI_API_KEY/);
    expect(readAiConfig(env({}), { provider: "none" }).reason).toMatch(/Human Mode works fully/);
  });

  it("reports key presence without exposing values", () => {
    const p = keyPresence(env({ OPENAI_API_KEY: "sk-secret" }));
    expect(p).toEqual({ OPENAI_API_KEY: true, ANTHROPIC_API_KEY: false, OPENAI_COMPATIBLE_API_KEY: false });
    expect(JSON.stringify(p)).not.toContain("sk-secret");
  });
});

const ollama = readAiConfig(env({}), { provider: "ollama", temperature: 0.4 }).config!;

describe("Ollama adapter (mocked HTTP — not a real Ollama server)", () => {
  it("calls /api/chat with think:false, a JSON schema, temperature and returns usage", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ model: "qwen3:1.7b", message: { role: "assistant", content: '{"ok":true}' }, prompt_eval_count: 120, eval_count: 40, done: true }));
    const schema = { type: "object" };
    const r = await complete(ollama, { system: "s", user: "u", jsonSchema: schema }, fetchMock);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:11434/api/chat");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: "qwen3:1.7b", stream: false, think: false, format: schema, options: { temperature: 0.4 } });
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(["system", "user"]);
    expect(init.headers.authorization).toBeUndefined();
    expect(r).toEqual({ text: '{"ok":true}', model: "qwen3:1.7b", usage: { inputTokens: 120, outputTokens: 40 } });
  });

  it("gives an informative error when Ollama is not running", async () => {
    const refused = vi.fn().mockRejectedValue(new TypeError("fetch failed: ECONNREFUSED"));
    await expect(complete(ollama, { system: "", user: "" }, refused)).rejects.toMatchObject({ code: "unreachable", message: expect.stringMatching(/not reachable at http:\/\/127\.0\.0\.1:11434[\s\S]*ollama\.com\/download/) });
  });

  it("tells the user to pull a missing model", async () => {
    const missing = vi.fn().mockResolvedValue(Response.json({ error: "model 'qwen3:1.7b' not found" }, { status: 404 }));
    await expect(complete(ollama, { system: "", user: "" }, missing)).rejects.toMatchObject({ code: "model_missing", message: expect.stringContaining("ollama pull qwen3:1.7b") });
  });

  it("connection test lists models without generating text", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/api/version") ? Response.json({ version: "0.40.16" }) : Response.json({ models: [{ name: "qwen3:1.7b" }, { name: "llama3.2:latest" }] }),
    );
    const ok = await testConnection(ollama, fetchMock as unknown as typeof fetch);
    expect(ok).toMatchObject({ ok: true, version: "0.40.16", modelAvailable: true });
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(["http://127.0.0.1:11434/api/version", "http://127.0.0.1:11434/api/tags"]);
    const notPulled = await testConnection({ ...ollama, model: "mistral" }, fetchMock as unknown as typeof fetch);
    expect(notPulled.ok).toBe(false);
    expect(notPulled.message).toContain("ollama pull mistral");
    const down = await testConnection(ollama, vi.fn().mockRejectedValue(new TypeError("ECONNREFUSED")));
    expect(down).toMatchObject({ ok: false, message: expect.stringContaining("not reachable") });
  });

  it("OpenAI and Anthropic connection tests use the free models endpoint", async () => {
    const openai = readAiConfig(env({ OPENAI_API_KEY: "sk" }), { provider: "openai", model: "gpt-4.1-mini" }).config!;
    const f = vi.fn().mockResolvedValue(Response.json({ data: [{ id: "gpt-4.1-mini" }] }));
    expect(await testConnection(openai, f)).toMatchObject({ ok: true, modelAvailable: true });
    expect(f.mock.calls[0][0]).toBe("https://api.openai.com/v1/models");
    const bad = await testConnection(openai, vi.fn().mockResolvedValue(new Response("", { status: 401 })));
    expect(bad).toMatchObject({ ok: false, message: expect.stringMatching(/rejected the API key/) });
  });

  it("strips <think> blocks before parsing JSON", () => {
    expect(extractJson('<think>planning…{"x":1}</think>\n{"subjectLines":["a"]}')).toEqual({ subjectLines: ["a"] });
  });
});

describe("structured outputs", () => {
  it("accepts slightly loose small-model output but rejects unusable drafts", () => {
    const ok = draftResponseSchema.safeParse({ subjectLines: "One subject", body: "x".repeat(60), cta: "See how", researchRefs: "Spec sheet" });
    expect(ok.success && ok.data.subjectLines).toEqual(["One subject"]);
    expect(ok.success && ok.data.researchRefs).toEqual(["Spec sheet"]);
    expect(ok.success && ok.data.missingInformation).toEqual([]);
    expect(draftResponseSchema.safeParse({ subjectLines: ["a"], body: "too short", cta: "Go" }).success).toBe(false);
    expect(revisionResponseSchema.parse({ options: ["a", "b", "c"] }).options).toHaveLength(3);
    expect(reviewResponseSchema.safeParse({ categories: [{ key: "factual", score: "7" }], improvements: ["x"] }).success).toBe(true);
    expect(reviewResponseSchema.safeParse({ categories: [{ key: "vibes", score: 7 }] }).success).toBe(false);
  });

  it("applies tone, length and framework preferences and asks for missing info", () => {
    const brand = sleepMaskBrand();
    const brief = buildCampaignBrief({ type: "welcome", emailCount: 3, audience: "a", goal: "g", tone: "Calm", brand, research: verifiedResearch });
    const p = buildDraftPrompt({ brand, research: verifiedResearch, campaign: { name: "c", type: "welcome", audience: "a", goal: "g", tone: "Calm" }, email: brief.emails[1], sequence: brief.emails, prefs: { tone: "Playful", length: "short", framework: "BAB", temperature: null } });
    expect(p).toContain("Tone: Playful");
    expect(p).toContain("Body length: 80–140 words");
    expect(p).toMatch(/Framework: BAB \(Before → After → Bridge/);
    expect(p).toContain("missingInformation");
    for (const action of Object.keys(REVISION_ACTIONS) as (keyof typeof REVISION_ACTIONS)[]) {
      const r = buildRevisionPrompt({ brand, research: verifiedResearch, action, email: { subjectLines: ["s"], previewText: "", hook: "", body: "b", cta: "c", objective: "o" } });
      expect(r).toContain(REVISION_ACTIONS[action].instruction);
      expect(r).toContain("Do not add any facts");
    }
  });
});

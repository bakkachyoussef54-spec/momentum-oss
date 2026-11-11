"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CircleCheck, CircleX, KeyRound, Loader2, PlugZap, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveAiSettingsAction, testAiConnectionAction } from "@/app/actions";
import { EMAIL_LENGTHS, KEY_VARS, OLLAMA_DEFAULT_MODEL, OLLAMA_DEFAULT_URL, PROVIDER_LABELS, PROVIDERS, type AiSettings, type ProviderChoice } from "@/lib/ai/config";
import { FRAMEWORKS } from "@/lib/constants";

const MODEL_HINTS: Record<ProviderChoice, string> = {
  none: "",
  openai: "e.g. gpt-4.1-mini",
  anthropic: "e.g. claude-sonnet-4-5",
  "openai-compatible": "model id served by your server",
  ollama: `e.g. ${OLLAMA_DEFAULT_MODEL} (run: ollama pull ${OLLAMA_DEFAULT_MODEL})`,
};

export function AiSettingsForm({ initial, envProvider, keys }: { initial: AiSettings; envProvider: string; keys: Record<string, boolean> }) {
  const router = useRouter();
  const [s, setS] = useState<AiSettings>(initial);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string; models?: string[] } | null>(null);
  const provider: ProviderChoice = s.provider ?? ((PROVIDERS as readonly string[]).includes(envProvider) ? (envProvider as ProviderChoice) : "none");
  const keyVar = provider !== "none" ? KEY_VARS[provider] : undefined;
  const showBaseUrl = provider === "ollama" || provider === "openai-compatible";

  const save = (andTest: boolean) =>
    start(async () => {
      setResult(null);
      const res = await saveAiSettingsAction({ ...s, provider });
      if (!res.ok) return void toast.error(res.error);
      toast.success("AI settings saved");
      router.refresh();
      if (andTest) {
        const t = await testAiConnectionAction();
        if (!t.ok) return void setResult({ ok: false, message: t.error });
        setResult(t.data);
      }
    });

  return (
    <div className="space-y-4" data-testid="ai-settings-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Provider</span>
          <select aria-label="AI provider" className="field-select" value={provider} onChange={(e) => setS({ ...s, provider: e.target.value as ProviderChoice, model: "", baseUrl: "" })}>
            {PROVIDERS.map((p) => <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>)}
          </select>
        </label>
        {provider !== "none" && (
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Model</span>
            <Input aria-label="AI model" value={s.model} placeholder={MODEL_HINTS[provider]} onChange={(e) => setS({ ...s, model: e.target.value })} list="ai-model-options" />
            {result?.models && result.models.length > 0 && (
              <datalist id="ai-model-options">{result.models.map((m) => <option key={m} value={m} />)}</datalist>
            )}
          </label>
        )}
        {showBaseUrl && (
          <label className="space-y-1.5 text-sm sm:col-span-2">
            <span className="font-medium">{provider === "ollama" ? "Ollama URL" : "Server URL"}</span>
            <Input aria-label="AI base URL" value={s.baseUrl} placeholder={provider === "ollama" ? OLLAMA_DEFAULT_URL : "http://localhost:1234/v1"} onChange={(e) => setS({ ...s, baseUrl: e.target.value })} />
            <span className="block text-xs text-muted-foreground">
              {provider === "ollama"
                ? "Leave blank for the default local address. Ollama runs on your own computer, so nothing leaves your machine."
                : "Any server that speaks the OpenAI chat API (LM Studio, vLLM…). OPENAI_COMPATIBLE_API_KEY is only sent when this URL matches OPENAI_COMPATIBLE_BASE_URL in .env."}
            </span>
          </label>
        )}
      </div>

      {keyVar && (
        <p className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${keys[keyVar] ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`} data-testid="ai-key-status">
          <KeyRound className="size-4" /> {keyVar} is {keys[keyVar] ? "set in .env" : "not set — add it to .env and restart the app"}. Keys are never shown or sent to the browser.
        </p>
      )}

      {provider !== "none" && (
        <fieldset className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Generation preferences (defaults for AI Mode)</legend>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Writing tone</span>
            <Input aria-label="Default tone" value={s.tone} placeholder="Use each brand's tone of voice" onChange={(e) => setS({ ...s, tone: e.target.value })} />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Email length</span>
            <select aria-label="Default length" className="field-select" value={s.length} onChange={(e) => setS({ ...s, length: e.target.value as AiSettings["length"] })}>
              {EMAIL_LENGTHS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Framework</span>
            <select aria-label="Default framework" className="field-select" value={s.framework} onChange={(e) => setS({ ...s, framework: e.target.value })}>
              <option value="">From the campaign plan (recommended)</option>
              {FRAMEWORKS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Timeout (seconds)</span>
            <Input aria-label="Timeout seconds" type="number" min={10} max={600} value={s.timeoutSeconds ?? ""} placeholder={provider === "ollama" ? "240" : "90"} onChange={(e) => setS({ ...s, timeoutSeconds: e.target.value ? Math.max(10, Math.min(600, Number(e.target.value))) : null })} />
          </label>
          <label className="space-y-1.5 text-sm sm:col-span-2">
            <span className="flex justify-between font-medium">
              <span>Creativity {s.temperature === null ? "(provider default)" : s.temperature.toFixed(1)}</span>
              {s.temperature !== null && <button type="button" className="text-xs text-primary hover:underline" onClick={() => setS({ ...s, temperature: null })}>Use provider default</button>}
            </span>
            <input aria-label="Default creativity" type="range" min={0} max={1} step={0.1} value={s.temperature ?? 0.7} onChange={(e) => setS({ ...s, temperature: Number(e.target.value) })} className="w-full accent-[#0057FF]" />
            <span className="block text-xs text-muted-foreground">Some models (for example OpenAI reasoning models) ignore or reject custom creativity — leave it on the provider default if generation fails.</span>
          </label>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save(false)} disabled={pending} variant="outline">
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save
        </Button>
        {provider !== "none" && (
          <Button onClick={() => save(true)} disabled={pending} data-testid="ai-test-connection">
            {pending ? <Loader2 className="animate-spin" /> : <PlugZap />} Save & test connection
          </Button>
        )}
      </div>
      {result && (
        <p className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${result.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`} role="status" data-testid="ai-test-result">
          {result.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <CircleX className="mt-0.5 size-4 shrink-0" />} {result.message}
        </p>
      )}
      <p className="text-xs text-muted-foreground">The connection test only lists available models — it never generates text, so it costs nothing.</p>
    </div>
  );
}

import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();
export const VISION_MODEL = process.env.CLAUDE_VISION_MODEL ?? "claude-sonnet-5-5";
export const WRITER_MODEL = process.env.CLAUDE_WRITER_MODEL ?? "claude-opus-5-5";

export type Usage = { model: string; input_tokens: number; output_tokens: number; cost_cents: number };

// Per-million-token list prices (USD, Claude API, 2026-10) for cost tracking only.
const PRICE: Record<string, [number, number]> = { "claude-sonnet-5-5": [2, 10], "claude-opus-5-5": [4, 20], "claude-haiku-5-5": [0.1, 0.5] };
function cost(model: string, inTok: number, outTok: number) {
  const [i, o] = PRICE[model] ?? [4, 20];
  return ((inTok * i + outTok * o) / 1_000_000) * 100;
}

type ContentBlock = Anthropic.Messages.ContentBlockParam;
type Params = Anthropic.Messages.MessageCreateParamsNonStreaming;

// Opus 5.5 / Sonnet 5.5 reject forced tool_choice ({type:"tool"|"any"}) with a 400, so we always use "auto" (one call at a time)
// and steer with the system prompt; the follow-up call below covers the rare prose-only answer.
const toolChoice = (): Params["tool_choice"] => ({ type: "auto", disable_parallel_tool_use: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const retryable = (e: unknown) =>
  e instanceof Anthropic.APIConnectionError ||
  (e instanceof Anthropic.APIError && (e.status === 429 || e.status === 408 || e.status === 409 || (e.status ?? 0) >= 500 || /overloaded/i.test(e.message)));

/** messages.create with up to 2 extra attempts on 429/5xx/overloaded/network errors. */
async function createWithRetry(params: Params): Promise<Anthropic.Messages.Message> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await anthropic.messages.create(params);
    } catch (e) {
      if (attempt >= 2 || !retryable(e)) throw e;
      const wait = 1500 * 2 ** attempt + Math.random() * 500;
      console.warn(`claude: ${e instanceof Error ? e.message : e} — retry ${attempt + 1}/2 in ${Math.round(wait)} ms`);
      await sleep(wait);
    }
  }
}

/**
 * Ask Claude for structured JSON via a single tool call whose input schema is the shape we want.
 * This is how every pipeline step gets validated output instead of free text.
 * If Claude answers in prose instead of calling the tool, we make ONE follow-up call (no search) with that prose as context.
 */
export async function structured<T>(opts: {
  model?: string; system: string; content: string | ContentBlock[]; schema: Record<string, unknown>; toolName: string;
  maxTokens?: number; webSearch?: boolean;
}): Promise<{ data: T; usage: Usage }> {
  const model = opts.model ?? WRITER_MODEL;
  const tools: Anthropic.Messages.Tool[] = [{ name: opts.toolName, description: "Return the result in this exact shape.", input_schema: opts.schema as Anthropic.Messages.Tool.InputSchema }];
  const system = `${opts.system}\nYou MUST finish by calling the ${opts.toolName} tool exactly once with the complete result; never answer in prose.`;
  const findBlock = (res: Anthropic.Messages.Message) =>
    res.content.find((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use" && b.name === opts.toolName);

  let res = await createWithRetry({
    model, max_tokens: opts.maxTokens ?? 4000, system,
    messages: [{ role: "user", content: opts.content }],
    tools: opts.webSearch
      ? [...tools, { type: "web_search_20260209", name: "web_search", max_uses: Number(process.env.WEB_SEARCH_MAX_USES ?? 3) } as unknown as Anthropic.Messages.Tool]
      : tools,
    tool_choice: opts.webSearch ? { type: "auto" } : toolChoice(),
  });
  let input = res.usage.input_tokens, output = res.usage.output_tokens;
  let block = findBlock(res);

  if (!block) {
    // Claude replied in prose (or only searched) — one more call, no search, prior text as context.
    const prose = res.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    console.warn(`claude: no ${opts.toolName} call; re-asking once without search`);
    res = await createWithRetry({
      model, max_tokens: opts.maxTokens ?? 4000, system,
      messages: [
        { role: "user", content: opts.content },
        { role: "assistant", content: prose || "(no text)" },
        { role: "user", content: `Using your research notes above, call ${opts.toolName} now with the complete result. Do not search again.` },
      ],
      tools, tool_choice: toolChoice(),
    });
    input += res.usage.input_tokens; output += res.usage.output_tokens;
    block = findBlock(res);
  }
  if (!block) throw new Error(`Claude returned no ${opts.toolName} call`);
  const usage = { model, input_tokens: input, output_tokens: output, cost_cents: cost(model, input, output) };
  return { data: block.input as T, usage };
}

export function imageBlock(jpeg: Buffer): ContentBlock {
  return { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } };
}

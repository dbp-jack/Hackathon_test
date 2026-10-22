import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();
export const VISION_MODEL = process.env.CLAUDE_VISION_MODEL ?? "claude-sonnet-5-5";
export const WRITER_MODEL = process.env.CLAUDE_WRITER_MODEL ?? "claude-opus-5-5";

export type Usage = { model: string; input_tokens: number; output_tokens: number; cost_cents: number };

// Rough per-million-token prices for cost tracking only; adjust to current pricing.
const PRICE: Record<string, [number, number]> = { "claude-sonnet-5-5": [3, 15], "claude-opus-5-5": [15, 75] };
function cost(model: string, inTok: number, outTok: number) {
  const [i, o] = PRICE[model] ?? [3, 15];
  return ((inTok * i + outTok * o) / 1_000_000) * 100;
}

type ContentBlock = Anthropic.Messages.ContentBlockParam;

/**
 * Ask Claude for structured JSON by forcing a single tool call whose input schema is the shape we want.
 * This is how every pipeline step gets validated output instead of free text.
 */
export async function structured<T>(opts: {
  model?: string; system: string; content: string | ContentBlock[]; schema: Record<string, unknown>; toolName: string;
  maxTokens?: number; webSearch?: boolean;
}): Promise<{ data: T; usage: Usage }> {
  const model = opts.model ?? WRITER_MODEL;
  const tools: Anthropic.Messages.Tool[] = [{ name: opts.toolName, description: "Return the result in this exact shape.", input_schema: opts.schema as Anthropic.Messages.Tool.InputSchema }];
  const res = await anthropic.messages.create({
    model, max_tokens: opts.maxTokens ?? 4000, system: opts.system,
    messages: [{ role: "user", content: opts.content }],
    tools: opts.webSearch
      ? [...tools, { type: "web_search_20250305", name: "web_search", max_uses: 6 } as unknown as Anthropic.Messages.Tool]
      : tools,
    tool_choice: opts.webSearch ? { type: "auto" } : { type: "tool", name: opts.toolName },
  });
  const block = res.content.find((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use" && b.name === opts.toolName);
  if (!block) throw new Error(`Claude returned no ${opts.toolName} call`);
  const usage = { model, input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens, cost_cents: cost(model, res.usage.input_tokens, res.usage.output_tokens) };
  return { data: block.input as T, usage };
}

export function imageBlock(jpeg: Buffer): ContentBlock {
  return { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } };
}

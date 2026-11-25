import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Lang } from "../i18n";

const Result = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      source_lang: z.enum(["es", "en"]),
      title: z.string(),
      notes: z.string(),
    }),
  ),
});

const SYSTEM = `You translate task-manager items between Spanish (Rioplatense, as spoken in Uruguay) and English for a project manager.
For each item: detect its language (es or en), then translate its title and notes into the target language.
If an item is already in the target language, return its title and notes unchanged.
Keep names of people, products, companies, book titles in quotes, file and folder names, URLs, dates, times and Markdown formatting exactly as they are.
Keep the tone short and practical, like a to-do list. Do not add explanations.`;

export type TranslateItem = { id: string; title: string; notes: string };

export async function translateItems(items: TranslateItem[], to: Lang) {
  const client = new Anthropic();
  const target = to === "es" ? "Spanish (Rioplatense)" : "English";
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(Result) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Target language: ${target}.\n\nItems (JSON):\n${JSON.stringify(items)}`,
      },
    ],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`No se pudo traducir (${response.stop_reason})`);
  }
  return response.parsed_output.items;
}

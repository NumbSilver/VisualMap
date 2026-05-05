import {
  ProviderConfigurationError,
  type PlanNextPageInput,
  type PlanNextPageOutput,
  type TextProvider
} from "./types";
import { VISUAL_STYLE_CONTRACT } from "@/server/style/visual-style";

interface ChatCompletionChoice {
  message?: {
    content?: string;
  };
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
}

const DEFAULT_TEXT_BASE_URL =
  "https://aidp.bytedance.net/api/modelhub/online/v2/crawl/openai/deployments/gpt_openapi";

function extractJsonObject(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] ?? trimmed;
}

function parsePlan(content: string, model: string): PlanNextPageOutput {
  const parsed = JSON.parse(extractJsonObject(content)) as Partial<PlanNextPageOutput>;
  if (!parsed.title || !parsed.summary || !parsed.visualPrompt) {
    throw new Error("Text provider returned an incomplete page plan");
  }

  return {
    title: parsed.title,
    summary: parsed.summary,
    visualPrompt: parsed.visualPrompt,
    nodes: Array.isArray(parsed.nodes) ? parsed.nodes.slice(0, 8) : [],
    provider: "bytedance-aidp",
    model
  };
}

function buildPlanningPrompt(input: PlanNextPageInput) {
  return [
    "You are the planning layer for VisualMap, an image-first visual knowledge browser.",
    "Return only valid JSON. Do not wrap it in markdown.",
    "The JSON schema is:",
    '{"title": "short title", "summary": "short intent", "visualPrompt": "prompt for an image model", "nodes": [{"title": "short node", "description": "short meaning"}]}',
    "",
    "Product constraints:",
    "- The visual page must not look like a traditional website, dashboard, or landing page.",
    "- It should feel like a complete light hand-drawn infographic.",
    VISUAL_STYLE_CONTRACT,
    "- Text in the image prompt must be short and readable.",
    "- Use 4-7 visual nodes.",
    "- If clicked coordinates are present, plan a zoom-in page centered on that clicked area, not a richer version of the same overview.",
    "- A zoom-in page should reveal fine details, local structure, close-up labels, and a stronger focal point.",
    "- Explain mode should be source-grounded.",
    "- Explore mode can extend into related possibilities.",
    "- Add mode should suggest annotation surfaces.",
    "",
    `Mode: ${input.mode}`,
    `Depth: ${input.depth}`,
    `Current path: ${input.currentPath.join(" / ") || "root"}`,
    input.clickedCoordinates
      ? `Clicked coordinates: x=${input.clickedCoordinates.x.toFixed(2)}, y=${input.clickedCoordinates.y.toFixed(2)}`
      : "Clicked coordinates: none; generate opening overview.",
    `Source summary: ${input.sourceSummary}`
  ].join("\n");
}

export const bytedanceAidpTextProvider: TextProvider = {
  async planNextPage(input: PlanNextPageInput): Promise<PlanNextPageOutput> {
    const apiKey = process.env.BYTEDANCE_AIDP_TEXT_API_KEY;
    if (!apiKey) {
      throw new ProviderConfigurationError("Missing BYTEDANCE_AIDP_TEXT_API_KEY");
    }

    const baseUrl = (
      process.env.BYTEDANCE_AIDP_TEXT_BASE_URL ?? DEFAULT_TEXT_BASE_URL
    ).replace(/\/$/, "");
    const model = process.env.BYTEDANCE_AIDP_TEXT_MODEL ?? "gpt-5.4-2026-03-05";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "api-key": apiKey
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: buildPlanningPrompt(input)
          }
        ],
        temperature: 0.4,
        max_tokens: 1800
      })
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`AIDP text planning failed: HTTP ${response.status}`);
    }

    const body = JSON.parse(text) as ChatCompletionResponse;
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AIDP text planning returned no content");
    }

    return parsePlan(content, model);
  }
};

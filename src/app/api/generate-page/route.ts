import { NextResponse } from "next/server";
import { getImageProvider, getTextProvider } from "@/server/model-providers";
import { ProviderConfigurationError } from "@/server/model-providers/types";

export const runtime = "nodejs";

interface GeneratePageRequest {
  source: string;
  depth?: number;
  path?: string[];
  click?: {
    x: number;
    y: number;
  };
  parentImage?: string;
  mode?: "explain" | "explore" | "add";
}

function isUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function summarizeSource(source: string) {
  if (isUrl(source)) {
    return `the content, topic, and context represented by this URL: ${source}`;
  }

  return source.length > 1200 ? `${source.slice(0, 1200)}...` : source;
}

function formatClick(click: GeneratePageRequest["click"]) {
  if (!click) {
    return "No parent click. Generate the opening overview map.";
  }

  return [
    `The user clicked normalized coordinates x=${click.x.toFixed(2)}, y=${click.y.toFixed(2)}.`,
    "The next image must feel like the camera zoomed into that exact clicked region.",
    "Do not merely add more objects to the old composition.",
    "Replace the old overview with a close-up scene centered on the clicked area, revealing finer details, labels, and micro-structure."
  ].join(" ");
}

function parseDataUrl(dataUrl?: string) {
  if (!dataUrl) {
    return undefined;
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return undefined;
  }

  return {
    mimeType: match[1],
    base64: match[2]
  };
}

function buildFallbackImagePrompt(input: GeneratePageRequest) {
  const depth = input.depth ?? 0;
  const mode = input.mode ?? "explore";
  const path = input.path?.length ? input.path.join(" / ") : "root";
  const sourceSummary = summarizeSource(input.source);

  return [
    "Create a full-screen, fancy, image-first visual knowledge map.",
    "The result should feel like an interactive generated visual browser, not a traditional website, not a SaaS landing page, and not a dashboard.",
    "Use a cinematic illustrated infographic style with rich spatial depth, coherent visual nodes, connective paths, and readable short labels.",
    "Keep text short, large, and clean. Avoid long paragraphs. Avoid tiny text.",
    "No navigation bar, no pricing section, no website chrome, no browser mockup.",
    `Source to visualize: ${sourceSummary}`,
    `Current path: ${path}`,
    `Depth: ${depth}`,
    `Mode: ${mode}. Explain should look more source-grounded; Explore can feel more expansive; Add can suggest annotation surfaces.`,
    formatClick(input.click),
    input.parentImage
      ? "A parent image is provided as visual reference. Preserve its style, but zoom into the clicked region as if entering it."
      : "No parent image is provided; generate the opening overview.",
    "Compose the image as one complete immersive canvas with a central focus and 4-7 surrounding visual nodes."
  ].join("\n");
}

function normalizeClick(click: GeneratePageRequest["click"]) {
  if (!click) {
    return undefined;
  }

  return {
    x: Math.max(0, Math.min(1, Number(click.x.toFixed(2)))),
    y: Math.max(0, Math.min(1, Number(click.y.toFixed(2))))
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GeneratePageRequest;
    if (!body.source?.trim()) {
      return NextResponse.json({ error: "Missing source" }, { status: 400 });
    }

    const normalized: GeneratePageRequest = {
      ...body,
      source: body.source.trim(),
      click: normalizeClick(body.click)
    };
    const textProvider = getTextProvider();
    const plan = await textProvider.planNextPage({
      source: normalized.source,
      sourceSummary: summarizeSource(normalized.source),
      currentPath: normalized.path ?? [],
      clickedCoordinates: normalized.click,
      mode: normalized.mode ?? "explore",
      depth: normalized.depth ?? 0
    });

    const prompt = [
      buildFallbackImagePrompt(normalized),
      "",
      "Page plan:",
      `Title: ${plan.title}`,
      `Summary: ${plan.summary}`,
      "Planned visual prompt:",
      plan.visualPrompt,
      "Planned nodes:",
      ...plan.nodes.map((node) => `- ${node.title}: ${node.description}`)
    ].join("\n");

    const imageProvider = getImageProvider();
    const referenceImage = parseDataUrl(normalized.parentImage);
    const result = await imageProvider.generateImage({
      prompt,
      referenceImageBase64: referenceImage?.base64,
      referenceImageMimeType: referenceImage?.mimeType,
      aspectRatio: "16:9",
      quality: "preview",
      logId: `visualmap-generate-${Date.now()}`
    });

    return NextResponse.json({
      id: `page_${Date.now()}`,
      prompt,
      plan,
      source: normalized.source,
      depth: normalized.depth ?? 0,
      click: normalized.click ?? null,
      mode: normalized.mode ?? "explore",
      image: `data:${result.mimeType};base64,${result.imageBase64}`,
      provider: result.provider,
      model: result.model,
      textProvider: plan.provider,
      textModel: plan.model,
      usage: result.usage ?? null
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown image generation error";
    const status = error instanceof ProviderConfigurationError ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextResponse } from "next/server";
import { getImageProvider, getTextProvider } from "@/server/model-providers";
import { ProviderConfigurationError } from "@/server/model-providers/types";
import {
  resolveMode,
  type RequestedMode,
  type ResolvedMode
} from "@/server/mode/resolve-mode";
import { readProductImageBase64, saveProduct } from "@/server/products/store";

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
  parentProductId?: string | null;
  mode?: RequestedMode;
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

async function getReferenceImage(input: GeneratePageRequest) {
  const dataUrlReference = parseDataUrl(input.parentImage);
  if (dataUrlReference) {
    return dataUrlReference;
  }

  if (input.parentProductId) {
    try {
      return await readProductImageBase64(input.parentProductId);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function buildFallbackImagePrompt(input: GeneratePageRequest) {
  const depth = input.depth ?? 0;
  const mode = resolveMode({
    source: input.source,
    depth: input.depth,
    requestedMode: input.mode
  });
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
      ? "A parent image is provided as visual reference. The clicked area is marked with a red ZOOM HERE ring. Preserve the parent style, but generate the next page as a close-up inside that marked ring. Do not focus on any unmarked area."
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
      mode: resolveMode({
        source: normalized.source,
        depth: normalized.depth,
        requestedMode: normalized.mode
      }),
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
    const referenceImage = await getReferenceImage(normalized);
    const result = await imageProvider.generateImage({
      prompt,
      referenceImageBase64: referenceImage?.base64,
      referenceImageMimeType: referenceImage?.mimeType,
      referenceClick: normalized.click,
      aspectRatio: "16:9",
      quality: "preview",
      logId: `visualmap-generate-${Date.now()}`
    });
    const product = await saveProduct({
      source: normalized.source,
      depth: normalized.depth ?? 0,
      mode: resolveMode({
        source: normalized.source,
        depth: normalized.depth,
        requestedMode: normalized.mode
      }),
      requestedMode: normalized.mode ?? "auto",
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
      prompt,
      provider: result.provider,
      model: result.model,
      textProvider: plan.provider,
      textModel: plan.model,
      parentProductId: normalized.parentProductId ?? null,
      click: normalized.click ?? null,
      plan
    });

    return NextResponse.json({
      id: `page_${Date.now()}`,
      productId: product.id,
      productImageUrl: product.imageUrl,
      prompt,
      plan,
      source: normalized.source,
      depth: normalized.depth ?? 0,
      click: normalized.click ?? null,
      mode: resolveMode({
        source: normalized.source,
        depth: normalized.depth,
        requestedMode: normalized.mode
      }),
      requestedMode: normalized.mode ?? "auto",
      image: product.imageUrl,
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

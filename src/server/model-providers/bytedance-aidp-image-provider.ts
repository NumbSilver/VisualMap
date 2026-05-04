import {
  ProviderConfigurationError,
  type GenerateImageInput,
  type GenerateImageOutput,
  type ImageProvider,
  type VisualMapAspectRatio,
  type VisualMapQuality
} from "./types";
import sharp from "sharp";

type AidpSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";
type AidpQuality = "high" | "medium" | "low" | "auto";

const PUBLIC_BASE_URL =
  "https://aidp.bytedance.net/api/modelhub/online/v2/crawl/openai";
const OFFICE_BASE_URL =
  "https://aidp-i18ntt-sg.tiktok-row.net/api/modelhub/online/v2/crawl/openai";
const PUBLIC_EDIT_BASE_URL =
  "https://aidp.bytedance.net/gpt/openapi/online/v2/crawl/openai";
const OFFICE_EDIT_BASE_URL =
  "https://aidp-i18ntt-sg.tiktok-row.net/gpt/openapi/online/v2/crawl/openai";

function mapSize(aspectRatio: VisualMapAspectRatio = "16:9"): AidpSize {
  switch (aspectRatio) {
    case "1:1":
      return "1024x1024";
    case "4:3":
    case "16:9":
      return "1536x1024";
    case "9:16":
      return "1024x1536";
    case "auto":
    default:
      return "auto";
  }
}

function mapQuality(quality: VisualMapQuality = "preview"): AidpQuality {
  switch (quality) {
    case "preview":
      return "low";
    case "final":
      return "high";
    case "auto":
    default:
      return "auto";
  }
}

function getCandidateBaseUrls() {
  const configured = process.env.BYTEDANCE_AIDP_BASE_URL;
  const officeConfigured = process.env.BYTEDANCE_AIDP_OFFICE_BASE_URL;
  const urls = [
    configured,
    process.env.BYTEDANCE_AIDP_USE_OFFICE === "true"
      ? (officeConfigured ?? OFFICE_BASE_URL)
      : undefined,
    officeConfigured,
    PUBLIC_BASE_URL,
    OFFICE_BASE_URL
  ].filter(Boolean) as string[];

  return Array.from(new Set(urls.map((url) => url.replace(/\/$/, ""))));
}

function getCandidateEditBaseUrls() {
  const configured = process.env.BYTEDANCE_AIDP_EDIT_BASE_URL;
  const officeConfigured = process.env.BYTEDANCE_AIDP_EDIT_OFFICE_BASE_URL;
  const urls = [
    configured,
    process.env.BYTEDANCE_AIDP_USE_OFFICE === "true"
      ? (officeConfigured ?? OFFICE_EDIT_BASE_URL)
      : undefined,
    officeConfigured,
    PUBLIC_EDIT_BASE_URL,
    OFFICE_EDIT_BASE_URL
  ].filter(Boolean) as string[];

  return Array.from(new Set(urls.map((url) => url.replace(/\/$/, ""))));
}

function base64ToBlob(base64: string, mimeType = "image/png") {
  const bytes = Buffer.from(base64, "base64");
  return new Blob([bytes], { type: mimeType });
}

async function markClickedRegion(input: GenerateImageInput) {
  if (!input.referenceImageBase64 || !input.referenceClick) {
    return input.referenceImageBase64;
  }

  const image = Buffer.from(input.referenceImageBase64, "base64");
  const metadata = await sharp(image).metadata();
  const width = metadata.width ?? 1536;
  const height = metadata.height ?? 1024;
  const cx = Math.round(input.referenceClick.x * width);
  const cy = Math.round(input.referenceClick.y * height);
  const radius = Math.round(Math.min(width, height) * 0.07);
  const stroke = Math.max(8, Math.round(Math.min(width, height) * 0.012));
  const labelY = Math.max(42, cy - radius - 20);

  const marker = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#ff2d2d" stroke-width="${stroke}"/>
      <circle cx="${cx}" cy="${cy}" r="${Math.max(8, Math.round(stroke * 0.8))}" fill="#ff2d2d"/>
      <rect x="${Math.max(12, cx - 132)}" y="${labelY - 34}" width="264" height="42" rx="21" fill="#ff2d2d" opacity="0.92"/>
      <text x="${cx}" y="${labelY - 7}" fill="#ffffff" font-family="Arial, sans-serif" font-size="24" font-weight="700" text-anchor="middle">ZOOM HERE</text>
    </svg>
  `);

  const output = await sharp(image)
    .composite([{ input: marker, left: 0, top: 0 }])
    .png()
    .toBuffer();

  return output.toString("base64");
}

async function generateFromReference(
  input: GenerateImageInput,
  ak: string,
  model: string
): Promise<GenerateImageOutput | null> {
  if (!input.referenceImageBase64) {
    return null;
  }

  let lastError = "No AIDP edit endpoint attempted";
  for (const baseUrl of getCandidateEditBaseUrls()) {
    const url = `${baseUrl}/images/edits?ak=${encodeURIComponent(ak)}`;
    const form = new FormData();
    const markedReference = await markClickedRegion(input);
    form.append(
      "image[]",
      base64ToBlob(markedReference ?? input.referenceImageBase64, "image/png"),
      "parent-marked.png"
    );
    form.append("prompt", input.prompt);
    form.append("model", model);
    form.append("quality", mapQuality(input.quality));
    form.append("size", mapSize(input.aspectRatio));
    form.append("n", "1");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-TT-LOGID": input.logId ?? `visualmap-edit-${Date.now()}`,
        "api-key": ak
      },
      body: form
    });

    const text = await response.text();
    let body: Record<string, unknown> | undefined;
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      body = undefined;
    }

    if (!response.ok) {
      const message =
        body && typeof body === "object" && "error" in body
          ? JSON.stringify(body.error).slice(0, 180)
          : text.slice(0, 180);
      lastError = `${new URL(baseUrl).host}: HTTP ${response.status} ${message}`;
      continue;
    }

    const data = body?.data as Array<{ b64_json?: string }> | undefined;
    const imageBase64 = data?.[0]?.b64_json;
    if (!imageBase64) {
      lastError = `${new URL(baseUrl).host}: missing b64_json`;
      continue;
    }

    return {
      imageBase64,
      mimeType: "image/png",
      provider: "bytedance-aidp-edit",
      model,
      usage: body?.usage
    };
  }

  throw new Error(`AIDP image edit failed: ${lastError}`);
}

export const bytedanceAidpImageProvider: ImageProvider = {
  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const ak = process.env.BYTEDANCE_AIDP_AK;
    if (!ak) {
      throw new ProviderConfigurationError("Missing BYTEDANCE_AIDP_AK");
    }

    const model = process.env.BYTEDANCE_AIDP_IMAGE_MODEL ?? "gpt-image-2";
    const referenceResult = await generateFromReference(input, ak, model);
    if (referenceResult) {
      return referenceResult;
    }

    const payload = {
      model,
      prompt: input.prompt,
      n: 1,
      size: mapSize(input.aspectRatio),
      quality: mapQuality(input.quality)
    };

    let lastError = "No AIDP endpoint attempted";
    for (const baseUrl of getCandidateBaseUrls()) {
      const url = `${baseUrl}/images/generations?ak=${encodeURIComponent(ak)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-TT-LOGID": input.logId ?? `visualmap-${Date.now()}`
        },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      let body: Record<string, unknown> | undefined;
      try {
        body = JSON.parse(text) as Record<string, unknown>;
      } catch {
        body = undefined;
      }

      if (!response.ok) {
        lastError = `${new URL(baseUrl).host}: HTTP ${response.status}`;
        continue;
      }

      const data = body?.data as Array<{ b64_json?: string }> | undefined;
      const imageBase64 = data?.[0]?.b64_json;
      if (!imageBase64) {
        lastError = `${new URL(baseUrl).host}: missing b64_json`;
        continue;
      }

      return {
        imageBase64,
        mimeType: "image/png",
        provider: "bytedance-aidp",
        model,
        usage: body?.usage
      };
    }

    throw new Error(`AIDP image generation failed: ${lastError}`);
  }
};

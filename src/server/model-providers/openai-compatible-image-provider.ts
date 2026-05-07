import {
  ProviderConfigurationError,
  type GenerateImageInput,
  type GenerateImageOutput,
  type ImageProvider,
  type VisualMapAspectRatio,
  type VisualMapQuality
} from "./types";
import sharp from "sharp";

type OpenAICompatibleSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";
type OpenAICompatibleQuality = "high" | "medium" | "low" | "auto";
type ImageResponseContext = "image generation" | "image edit";

class NoImagePayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoImagePayloadError";
  }
}

function mapSize(
  aspectRatio: VisualMapAspectRatio = "16:9"
): OpenAICompatibleSize {
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

function mapQuality(
  quality: VisualMapQuality = "preview"
): OpenAICompatibleQuality {
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

function getBaseUrl(envName: string) {
  const configured = process.env[envName];
  if (!configured) {
    throw new ProviderConfigurationError(`Missing ${envName}`);
  }

  return configured.replace(/\/$/, "");
}

function getImageBaseUrl() {
  return getBaseUrl("OPENAI_COMPATIBLE_IMAGE_BASE_URL");
}

function getEditBaseUrl() {
  return (
    process.env.OPENAI_COMPATIBLE_IMAGE_EDIT_BASE_URL?.replace(/\/$/, "") ??
    getImageBaseUrl()
  );
}

function withOptionalApiKeyQuery(url: string, apiKey: string) {
  const queryParam = process.env.OPENAI_COMPATIBLE_API_KEY_QUERY_PARAM;
  if (!queryParam) {
    return url;
  }

  const parsed = new URL(url);
  parsed.searchParams.set(queryParam, apiKey);
  return parsed.toString();
}

function base64ToBlob(base64: string, mimeType = "image/png") {
  const bytes = Buffer.from(base64, "base64");
  return new Blob([bytes], { type: mimeType });
}

function firstString(...values: unknown[]) {
  return values.find(
    (value): value is string => typeof value === "string" && value.length > 0
  );
}

function dataItems(body: Record<string, unknown> | undefined) {
  return Array.isArray(body?.data)
    ? (body.data as Array<Record<string, unknown>>)
    : [];
}

async function imageUrlToBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image URL fetch failed: HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    imageBase64: bytes.toString("base64"),
    mimeType: response.headers.get("content-type") ?? "image/png"
  };
}

async function extractImageFromResponse(
  response: Response,
  context: ImageResponseContext
) {
  const contentType = response.headers.get("content-type") ?? "";
  const bytes = Buffer.from(await response.arrayBuffer());

  if (response.ok && contentType.startsWith("image/")) {
    return {
      imageBase64: bytes.toString("base64"),
      mimeType: contentType,
      body: undefined
    };
  }

  const text = bytes.toString("utf8");
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
    throw new Error(
      `OpenAI-compatible ${context} failed: HTTP ${response.status} ${message}`
    );
  }

  const firstItem = dataItems(body)[0];
  const imageBase64 = firstString(
    firstItem?.b64_json,
    firstItem?.base64,
    firstItem?.image_base64,
    firstItem?.image
  );
  if (imageBase64) {
    return {
      imageBase64,
      mimeType: "image/png",
      body
    };
  }

  const imageUrl = firstString(firstItem?.url);
  if (imageUrl) {
    const image = await imageUrlToBase64(imageUrl);
    return {
      ...image,
      body
    };
  }

  const keys = firstItem ? Object.keys(firstItem).join(", ") : "no data item";
  throw new NoImagePayloadError(
    `OpenAI-compatible ${context} returned no image payload (${keys})`
  );
}

function getEditImageFieldNames() {
  const configured = process.env.OPENAI_COMPATIBLE_IMAGE_EDIT_FIELD;
  if (configured) {
    return configured
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean);
  }

  return ["image[]", "image"];
}

async function buildZoomReferenceImage(input: GenerateImageInput) {
  if (!input.referenceImageBase64 || !input.referenceClick) {
    return input.referenceImageBase64;
  }

  const image = Buffer.from(input.referenceImageBase64, "base64");
  const metadata = await sharp(image).metadata();
  const width = metadata.width ?? 1536;
  const height = metadata.height ?? 1024;
  const sourceCx = Math.round(input.referenceClick.x * width);
  const sourceCy = Math.round(input.referenceClick.y * height);
  const cropSize = Math.round(Math.min(width, height) * 0.42);
  const left = Math.max(0, Math.min(width - cropSize, sourceCx - cropSize / 2));
  const top = Math.max(0, Math.min(height - cropSize, sourceCy - cropSize / 2));
  const outputWidth = width;
  const outputHeight = height;
  const cx = Math.round(outputWidth / 2);
  const cy = Math.round(outputHeight / 2);
  const radius = Math.round(Math.min(outputWidth, outputHeight) * 0.16);
  const stroke = Math.max(10, Math.round(Math.min(outputWidth, outputHeight) * 0.012));
  const labelY = Math.max(58, cy - radius - 26);

  const marker = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}">
      <rect x="0" y="0" width="${outputWidth}" height="${outputHeight}" fill="none" stroke="#ffcc00" stroke-width="${stroke * 1.5}"/>
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#ff2d2d" stroke-width="${stroke}"/>
      <circle cx="${cx}" cy="${cy}" r="${Math.max(8, Math.round(stroke * 0.8))}" fill="#ff2d2d"/>
      <rect x="${Math.max(12, cx - 132)}" y="${labelY - 34}" width="264" height="42" rx="21" fill="#ff2d2d" opacity="0.92"/>
      <text x="${cx}" y="${labelY - 7}" fill="#ffffff" font-family="Arial, sans-serif" font-size="24" font-weight="700" text-anchor="middle">ZOOM HERE</text>
    </svg>
  `);

  const output = await sharp(image)
    .extract({
      left: Math.round(left),
      top: Math.round(top),
      width: cropSize,
      height: cropSize
    })
    .resize(outputWidth, outputHeight, { fit: "cover" })
    .composite([{ input: marker, left: 0, top: 0 }])
    .png()
    .toBuffer();

  return output.toString("base64");
}

async function generateFromReference(
  input: GenerateImageInput,
  apiKey: string,
  model: string
): Promise<GenerateImageOutput | null> {
  if (!input.referenceImageBase64) {
    return null;
  }

  const markedReference = await buildZoomReferenceImage(input);
  let lastNoPayloadError: Error | null = null;

  for (const imageFieldName of getEditImageFieldNames()) {
    const baseUrl = getEditBaseUrl();
    const url = withOptionalApiKeyQuery(`${baseUrl}/images/edits`, apiKey);
    const form = new FormData();
    form.append(
      imageFieldName,
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
        Authorization: `Bearer ${apiKey}`,
        "api-key": apiKey
      },
      body: form
    });

    try {
      const parsed = await extractImageFromResponse(response, "image edit");

      return {
        imageBase64: parsed.imageBase64,
        mimeType: parsed.mimeType,
        provider: "openai-compatible-edit",
        model,
        usage: parsed.body?.usage
      };
    } catch (error) {
      if (error instanceof NoImagePayloadError) {
        lastNoPayloadError = error;
        continue;
      }

      throw error;
    }
  }

  console.warn(
    lastNoPayloadError?.message ??
      "OpenAI-compatible image edit returned no image payload; falling back to generation."
  );

  return null;
}

export const openAICompatibleImageProvider: ImageProvider = {
  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const apiKey = process.env.OPENAI_COMPATIBLE_IMAGE_API_KEY;
    if (!apiKey) {
      throw new ProviderConfigurationError(
        "Missing OPENAI_COMPATIBLE_IMAGE_API_KEY"
      );
    }

    const model = process.env.OPENAI_COMPATIBLE_IMAGE_MODEL ?? "gpt-image-2";
    const referenceResult = await generateFromReference(input, apiKey, model);
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

    const baseUrl = getImageBaseUrl();
    const url = withOptionalApiKeyQuery(
      `${baseUrl}/images/generations`,
      apiKey
    );
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    const parsed = await extractImageFromResponse(response, "image generation");

    return {
      imageBase64: parsed.imageBase64,
      mimeType: parsed.mimeType,
      provider: "openai-compatible",
      model,
      usage: parsed.body?.usage
    };
  }
};

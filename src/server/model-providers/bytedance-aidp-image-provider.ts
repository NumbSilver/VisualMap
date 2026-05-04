import {
  ProviderConfigurationError,
  type GenerateImageInput,
  type GenerateImageOutput,
  type ImageProvider,
  type VisualMapAspectRatio,
  type VisualMapQuality
} from "./types";

type AidpSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";
type AidpQuality = "high" | "medium" | "low" | "auto";

const PUBLIC_BASE_URL =
  "https://aidp.bytedance.net/api/modelhub/online/v2/crawl/openai";
const OFFICE_BASE_URL =
  "https://aidp-i18ntt-sg.tiktok-row.net/api/modelhub/online/v2/crawl/openai";

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

export const bytedanceAidpImageProvider: ImageProvider = {
  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const ak = process.env.BYTEDANCE_AIDP_AK;
    if (!ak) {
      throw new ProviderConfigurationError("Missing BYTEDANCE_AIDP_AK");
    }

    const model = process.env.BYTEDANCE_AIDP_IMAGE_MODEL ?? "gpt-image-2";
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

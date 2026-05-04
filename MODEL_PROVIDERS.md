# Model Provider Design

## 1. Goal

VisualMap will be open sourced, so all external OpenAPI and model calls must be isolated behind replaceable provider modules.

Business logic must not call a specific vendor API directly.

```text
VisualMap business flow
  -> Model Provider Interface
  -> Concrete Provider
  -> External Model API
```

## 2. Demo Default

During the demo stage, the default provider is `mock` so the open source project runs without secrets.

For internal demo usage, VisualMap can use the ByteDance AIDP OpenAI-compatible image endpoint. For public open source usage, users can replace it with OpenAI or any custom image model provider.

The project must never commit a real API key. The runtime reads keys from environment variables:

```text
OPENAI_API_KEY=...
IMAGE_PROVIDER=mock
VISION_PROVIDER=mock
TEXT_PROVIDER=mock
```

The API key must be created by the project runner in their own OpenAI account and configured locally or in their deployment environment.

OpenAI keys are created from the API platform's API key page. For project-scoped usage, create a key in the target project settings and store it securely. The key is shown once when created, so it must be copied into a local secret store or deployment secret manager at creation time.

For ByteDance AIDP demo usage:

```text
BYTEDANCE_AIDP_AK=...
BYTEDANCE_AIDP_BASE_URL=https://aidp.bytedance.net/api/modelhub/online/v2/crawl/openai
BYTEDANCE_AIDP_OFFICE_BASE_URL=https://aidp-i18ntt-sg.tiktok-row.net/api/modelhub/online/v2/crawl/openai
BYTEDANCE_AIDP_IMAGE_MODEL=gpt-image-2
IMAGE_PROVIDER=bytedance-aidp
```

For ByteDance AIDP text planning:

```text
BYTEDANCE_AIDP_TEXT_API_KEY=...
BYTEDANCE_AIDP_TEXT_BASE_URL=https://aidp.bytedance.net/api/modelhub/online/v2/crawl/openai/deployments/gpt_openapi
BYTEDANCE_AIDP_TEXT_MODEL=gpt-5.4-2026-03-05
TEXT_PROVIDER=bytedance-aidp
```

Office network deployments should use the office base URL domain:

```text
https://aidp-i18ntt-sg.tiktok-row.net
```

The AK must not be committed. It should be passed as an environment variable and sent server-side only.

## 3. Provider File Layout

Recommended layout:

```text
src/server/model-providers/
  index.ts
  types.ts
  mock-image-provider.ts
  bytedance-aidp-image-provider.ts
  mock-text-provider.ts
  bytedance-aidp-text-provider.ts
  custom-image-provider.example.ts
```

## 4. Interfaces

```ts
export interface GenerateImageInput {
  prompt: string;
  referenceImageUrl?: string;
  aspectRatio?: "1:1" | "4:3" | "16:9" | "9:16";
  quality?: "preview" | "final";
}

export interface GenerateImageOutput {
  imageUrl?: string;
  imageBase64?: string;
  provider: string;
  model: string;
}

export interface ImageProvider {
  generateImage(input: GenerateImageInput): Promise<GenerateImageOutput>;
}
```

Provider-specific mapping for ByteDance AIDP:

```text
VisualMap quality preview -> low
VisualMap quality final   -> high

VisualMap aspectRatio 1:1  -> 1024x1024
VisualMap aspectRatio 4:3  -> 1536x1024
VisualMap aspectRatio 16:9 -> 1536x1024
VisualMap aspectRatio 9:16 -> 1024x1536
default                    -> auto
```

The upstream endpoint supports:

```text
size: 1024x1024, 1536x1024, 1024x1536, auto
quality: high, medium, low, auto
model: gpt-image-2
```

```ts
export interface DescribeClickedRegionInput {
  imageUrl: string;
  x: number;
  y: number;
  context?: string;
}

export interface DescribeClickedRegionOutput {
  subject: string;
  confidence: number;
  reasoning?: string;
}

export interface VisionProvider {
  describeClickedRegion(
    input: DescribeClickedRegionInput
  ): Promise<DescribeClickedRegionOutput>;
}
```

```ts
export interface PlanNextPageInput {
  sourceSummary: string;
  currentPath: string[];
  clickedSubject?: string;
  mode: "explain" | "explore" | "add";
}

export interface PlanNextPageOutput {
  title: string;
  prompt: string;
  summary: string;
}

export interface TextProvider {
  planNextPage(input: PlanNextPageInput): Promise<PlanNextPageOutput>;
}
```

Text providers are responsible for outline extraction, page planning, and prompt preparation. The image provider should not decide the product structure by itself.

## 5. Replacement Rule

Open source users should be able to replace the image model by implementing only:

```text
ImageProvider.generateImage()
```

They should not need to modify:

- URL parsing.
- Page generation flow.
- Click handling.
- Cache logic.
- Share logic.
- UI components.

## 6. Security Rules

- Never commit real API keys.
- Never log full API keys.
- Never expose provider secrets to the browser.
- Server-only provider modules read environment variables.
- `.env.local` stays gitignored.
- `.env.example` documents required variables.

## 7. Provider Selection

Provider selection should be centralized:

```ts
export function getImageProvider(): ImageProvider {
  switch (process.env.IMAGE_PROVIDER ?? "mock") {
    case "bytedance-aidp":
      return bytedanceAidpImageProvider;
    case "mock":
      return mockImageProvider;
    case "custom":
      return customImageProvider;
    default:
      throw new Error("Unsupported IMAGE_PROVIDER");
  }
}
```

This keeps the demo simple while preserving model replaceability.

## 8. ByteDance AIDP Image Provider Contract

The ByteDance AIDP provider should live in one file:

```text
src/server/model-providers/bytedance-aidp-image-provider.ts
```

It should be responsible for:

- Reading `BYTEDANCE_AIDP_AK`.
- Selecting `BYTEDANCE_AIDP_BASE_URL`.
- Mapping VisualMap size and quality values to upstream values.
- Calling image generation.
- Returning `imageBase64` or a stored asset URL.
- Never exposing AK to the browser.

Expected OpenAI-compatible SDK usage:

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.BYTEDANCE_AIDP_AK,
  baseURL: process.env.BYTEDANCE_AIDP_BASE_URL,
});

const result = await client.images.generate({
  model: process.env.BYTEDANCE_AIDP_IMAGE_MODEL ?? "gpt-image-2",
  prompt: input.prompt,
  n: 1,
  size,
  quality,
  extra_headers: {
    "api-key": process.env.BYTEDANCE_AIDP_AK,
  },
});
```

For image editing, the same provider can later add:

```ts
editImage(input): Promise<GenerateImageOutput>
```

using the OpenAI-compatible `images.edit` API with `image[]`, `mask`, `prompt`, `model`, `quality`, `size`, and `n`.

## 9. ByteDance AIDP Text Provider Contract

The ByteDance AIDP text provider should live in one file:

```text
src/server/model-providers/bytedance-aidp-text-provider.ts
```

It should be responsible for:

- Reading `BYTEDANCE_AIDP_TEXT_API_KEY`.
- Reading `BYTEDANCE_AIDP_TEXT_BASE_URL`.
- Reading `BYTEDANCE_AIDP_TEXT_MODEL`.
- Producing a stable JSON page plan.
- Never exposing the key to the browser.

The provider should return:

```json
{
  "title": "short page title",
  "summary": "short page intent",
  "visualPrompt": "image-generation prompt",
  "nodes": [
    {
      "title": "node title",
      "description": "node meaning"
    }
  ]
}
```

The text model can have a large context window, but the Phase 1 implementation should still keep prompts compact so image generation latency remains the main bottleneck.

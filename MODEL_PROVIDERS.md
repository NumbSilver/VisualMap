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

During the demo stage, the default provider can be OpenAI.

The project must never commit a real API key. The runtime reads keys from environment variables:

```text
OPENAI_API_KEY=...
IMAGE_PROVIDER=openai
VISION_PROVIDER=openai
TEXT_PROVIDER=openai
```

The API key must be created by the project runner in their own OpenAI account and configured locally or in their deployment environment.

OpenAI keys are created from the API platform's API key page. For project-scoped usage, create a key in the target project settings and store it securely. The key is shown once when created, so it must be copied into a local secret store or deployment secret manager at creation time.

## 3. Provider File Layout

Recommended layout:

```text
src/server/model-providers/
  index.ts
  types.ts
  openai-image-provider.ts
  openai-vision-provider.ts
  openai-text-provider.ts
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
  switch (process.env.IMAGE_PROVIDER ?? "openai") {
    case "openai":
      return openaiImageProvider;
    case "custom":
      return customImageProvider;
    default:
      throw new Error("Unsupported IMAGE_PROVIDER");
  }
}
```

This keeps the demo simple while preserving model replaceability.

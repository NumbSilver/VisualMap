# VisualMap

VisualMap turns URLs, articles, or short questions into an interactive visual knowledge map. The current prototype follows a Flipbook-style approach: generate a full-screen infographic image first, then let users click any region to drill into a more focused visual explanation.

The project is designed to be open-source and model-provider replaceable. All image and text planning calls are isolated behind provider files so you can swap in your own OpenAI-compatible, local, or commercial model.

## Features

- Generate a visual map from a pasted URL or topic.
- Open directly with a URL query, for example `/?url=https://example.com/article`.
- Auto-select Explain or Explore mode based on source length and drill depth.
- Click anywhere on the generated image to drill into that region.
- Navigate backward and forward through generated pages.
- Hide all UI controls for a clean image-only view.
- Save each generated page as a local Product under `data/products`.
- Use mock providers by default, so the app can run without model credentials.

## Modes

- `Auto`: chooses the best mode automatically.
- `Explain`: drills down based on the original source content.
- `Explore`: extends beyond the source into related possibilities, context, analogies, and external knowledge.
- `Add`: reserved for user comments and annotations.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Sharp for local image crop/annotation preprocessing
- Replaceable text and image providers

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

Generate from a URL:

```text
http://localhost:3000/?url=https%3A%2F%2Fexample.com%2Farticle
```

## Configuration

The default configuration uses mock providers:

```env
IMAGE_PROVIDER=mock
TEXT_PROVIDER=mock
VISION_PROVIDER=mock
```

To use real providers, edit `.env.local`. Do not commit real API keys.

### OpenAI-Compatible Image Provider

```env
IMAGE_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_IMAGE_API_KEY=your-image-api-key
OPENAI_COMPATIBLE_IMAGE_BASE_URL=https://your-provider.example/v1
OPENAI_COMPATIBLE_IMAGE_EDIT_BASE_URL=https://your-provider.example/v1
OPENAI_COMPATIBLE_IMAGE_MODEL=gpt-image-2
OPENAI_COMPATIBLE_API_KEY_QUERY_PARAM=
```

`OPENAI_COMPATIBLE_IMAGE_EDIT_BASE_URL` is optional. If it is empty, VisualMap uses `OPENAI_COMPATIBLE_IMAGE_BASE_URL` for both image generation and image edit calls.

`OPENAI_COMPATIBLE_API_KEY_QUERY_PARAM` is optional. Leave it empty for standard Bearer-token providers. Set it only when your provider requires the API key in a query parameter.

The image provider expects OpenAI-style endpoints:

```text
POST /images/generations
POST /images/edits
```

### OpenAI-Compatible Text Provider

```env
TEXT_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_TEXT_API_KEY=your-text-api-key
OPENAI_COMPATIBLE_TEXT_BASE_URL=https://your-provider.example/v1
OPENAI_COMPATIBLE_TEXT_MODEL=gpt-4.1
```

The text provider expects an OpenAI-style endpoint:

```text
POST /chat/completions
```

## Provider Architecture

Provider code lives in:

```text
src/server/model-providers
```

Important files:

- `types.ts`: provider interfaces.
- `index.ts`: provider selection from environment variables.
- `mock-image-provider.ts`: local mock image generator.
- `mock-text-provider.ts`: local mock planner.
- `openai-compatible-image-provider.ts`: OpenAI-compatible image provider.
- `openai-compatible-text-provider.ts`: OpenAI-compatible text planner.

To add your own model, implement the provider interface and register it in `index.ts`.

## Product Storage

Generated pages are saved locally:

```text
data/products/<productId>/image.png
data/products/<productId>/product.json
```

The `data/products` folder is ignored by git.

## Useful Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run start
```

## Project Docs

- [Product Requirements](./PRD.md)
- [Technical Design](./TECHNICAL_DESIGN.md)
- [Two-Phase Plan](./TWO_PHASE_PLAN.md)
- [Model Providers](./MODEL_PROVIDERS.md)
- [Implementation Status](./IMPLEMENTATION_STATUS.md)
- [Flipbook Gap Analysis](./XHS_FLIPBOOK_GAP_ANALYSIS.md)

## Current Status

VisualMap is still an early prototype. Phase 1 focuses on direct image generation and click-to-drill behavior. If direct image generation is not reliable enough, Phase 2 will move toward a more deterministic VisualMap renderer with structured layout and controlled text rendering.

## License

MIT

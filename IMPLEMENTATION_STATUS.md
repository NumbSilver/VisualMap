# VisualMap Implementation Status

## Current Stage

The project is currently in Phase 1 of the two-phase plan:

```text
Flipbook-style direct generation prototype
```

## Implemented

- Next.js app scaffold.
- Full-screen image-first canvas.
- Center input command for URL or topic.
- `?url=` query parameter entry.
- Click-to-drill interaction using normalized image coordinates.
- Path depth tracking with back and forward navigation.
- Mode switch UI for Auto / Explain / Explore / Add.
- Auto mode selection: short questions default to Explore, long documents default to Explain, and deeper drilldowns can fall back to Explore.
- Server-side image generation API route.
- Replaceable model provider abstraction.
- Mock image provider for open source local runs without secrets.
- OpenAI-compatible image provider for internal demo runs.
- Mock text provider for open source local runs without secrets.
- OpenAI-compatible text provider for outline extraction and page planning.
- URL Source Fetcher for readable HTML/article extraction before planning.
- Global visual style contract for light hand-drawn infographic generation.
- Parent image reference is passed on click so providers that support image edit/reference can generate a zoom-in page.
- Clicked regions are converted into a cropped, enlarged reference image and marked with a red `ZOOM HERE` ring before image edit, so the model focuses on the local target instead of re-summarizing the full map.
- Every generated page is automatically saved as a local Product with image asset and JSON metadata.
- Environment variable based provider selection.
- `.env.example` with non-secret configuration shape.

## Not Implemented Yet

- Robust content extraction for pages that require login, browser verification, or dynamic rendering.
- VLM-based clicked-region understanding.
- Low-quality preview plus high-quality final replacement.
- Product list UI and Product detail page.
- Persistent page cache beyond local Product files.
- Share link storage.
- Add annotation persistence.
- Deterministic DOM / SVG text overlay system.

## Current Effect

The current app already behaves like an image-first prototype:

```text
open app
  -> paste URL or topic
  -> generate full-screen visual image
  -> click anywhere on the image
  -> send the parent image and click coordinates
  -> generate the next page as a zoom-in attempt around that clicked area
  -> save every generated result as a Product
  -> use back / forward arrows to move through the generated path
```

With `IMAGE_PROVIDER=mock` and `TEXT_PROVIDER=mock`, the app runs without any external API key and shows a generated SVG placeholder.

With `IMAGE_PROVIDER=openai-compatible` and `OPENAI_COMPATIBLE_IMAGE_API_KEY` configured, the app calls the OpenAI-compatible `gpt-image-2` endpoint and renders real generated images.

With `TEXT_PROVIDER=openai-compatible` and `OPENAI_COMPATIBLE_TEXT_API_KEY` configured, the app calls the OpenAI-compatible `gpt-4.1` endpoint to produce the page title, summary, nodes, and visual prompt before image generation.

The default UI mode is `Auto`. Users can still force Explain, Explore, or Add when they want direct control.

When the input is a URL, the server now attempts to fetch and extract readable article text before planning. If extraction fails, generation is blocked instead of producing an unrelated generic image.

## How To Run

Recommended runtime:

```text
Node.js 22 LTS or 24+
```

Install dependencies:

```bash
npm install
```

Run with mock provider:

```bash
npm run dev
```

Run with OpenAI-compatible provider:

```bash
IMAGE_PROVIDER=openai-compatible \
OPENAI_COMPATIBLE_IMAGE_API_KEY=your-ak \
OPENAI_COMPATIBLE_USE_ALTERNATE_BASE_URL=true \
npm run dev
```

Run with OpenAI-compatible text planning and mock image generation:

```bash
TEXT_PROVIDER=openai-compatible \
OPENAI_COMPATIBLE_TEXT_API_KEY=your-text-api-key \
npm run dev
```

Then open:

```text
http://localhost:3000
http://localhost:3000/?url=https%3A%2F%2Fexample.com%2Farticle
```

## Verification

Latest local checks:

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm audit --omit=dev`: 0 vulnerabilities after `postcss` override.
- OpenAI-compatible provider route test: passed.
- OpenAI-compatible text provider route test: passed.

Observed OpenAI-compatible generation speed:

```text
preview / low request through local API: about 51s
text planning request through local API: about 9.5s
```

Effect quality:

```text
The image generation path works and returns a real PNG data URL.
URL content is now parsed before planning; tested WeChat URL extraction returned the article title and about 12k characters of readable text in local source-fetcher verification.
The default generation style is now constrained toward a premium hand-drawn educational infographic plate: ivory paper, graphite outlines, watercolor/colored-pencil fills, field-guide panels, leader lines, numbered callouts, and no dark cinematic fantasy-map aesthetics.
Auto mode behavior: short question -> Explore, long document -> Explain, depth >= 2 -> Explore fallback.
Click drilldown now passes a cropped and marked parent image to the provider and prompts for a close-up detail plate with sub-parts, mechanism diagrams, examples, or internal structure instead of another overview-level layout.
Back / forward navigation now preserves history instead of deleting forward pages.
Each generated page is saved under data/products/<productId>/ with image and metadata.
The UI now has a Hide control that collapses mode buttons, command input, and the status panel so only the generated image remains, with a subtle Show affordance to restore controls.
Parent pages now show numbered drill markers at clicked positions for generated child pages, so the global view can reveal where deeper content lives without regenerating a denser overview image.
The experience is visually aligned with the Phase 1 direction, but synchronous waiting is too slow for a polished demo.
The next speed improvement should move generation into an async job flow and show an immediate interactive skeleton while the image is rendering.
```

## Next Step

The next implementation step is to add a basic persistent page cache:

```text
generated page
  -> save metadata and image asset
  -> allow back / refresh / share without regeneration
```

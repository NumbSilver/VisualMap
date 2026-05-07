# XHS Flipbook Local Clone Gap Analysis

## Source

Observed from the Xiaohongshu shared video page:

- Title: `复制一个flipbook`
- Author note: `在本地复制一个flipbook项目`
- Author comment indicates it is a local project and not published yet.

This is a reverse-engineering note from the visible demo, not source-code access.

## What The Demo Appears To Do

1. Opens directly into a generated visual page, not a traditional website shell.
2. Uses a full-canvas generated infographic as the primary interface.
3. Accepts text prompts and image uploads as starting points.
4. Provides quality tiers: `fast`, `balanced`, `pro`.
5. Supports click-anywhere exploration from the current image.
6. Tracks depth and explored page count, for example `第1层 已探索4页`.
7. Generates or exposes permanent links, for example `/n/<id>`.
8. May have a livestream/progressive mode, based on comments mentioning `livestream`.
9. Uses a light hand-drawn scientific explainer style with cream paper, diagram labels, and precise central subject framing.

## Likely Implementation Shape

The product is probably simpler than a deterministic DOM/SVG map:

1. One canonical page record stores prompt, source image, generated image, depth, parent id, click coordinates, and generation settings.
2. The main view renders one image full-screen and overlays only minimal controls.
3. Clicking the image sends the current image plus normalized click coordinates to an image-edit or multimodal generation model.
4. The backend either crops/marks the clicked region or describes the region with a vision model before generation.
5. Consistent style is mostly prompt-contract driven, with a fixed visual grammar.
6. Text accuracy comes from asking the image model to render sparse labels, not full paragraphs, and possibly from post-processing or model-specific text rendering ability.
7. Speed is controlled by quality presets, async jobs, cached page records, and reusing the current image as edit context.

## Current VisualMap Coverage

Already implemented:

- Image-first full-screen canvas.
- URL input and `?url=` generation.
- Replaceable text/image providers.
- OpenAI-compatible text planning and image generation.
- OpenAI-compatible image edit drilldown.
- URL parsing for WeChat article content.
- Product persistence under `data/products`.
- Back and forward navigation.
- Automatic Explain/Explore selection.
- Crop-based clicked-region drilldown.
- Light hand-drawn infographic style contract.

## Major Gaps

1. Visual polish is still behind the reference demo.
   The style contract was updated, but the generated output still needs repeated prompt tuning and visual QA.

2. No upload-image starting mode yet.
   The reference supports text or image as the seed.

3. No quality tier control yet.
   We should expose `fast`, `balanced`, and `pro`, mapped to model quality, prompt detail, and timeout expectations.

4. Product permalink is incomplete.
   We save products, but do not yet have a clean `/n/:id` read-only page that can be shared directly.

5. No session/history gallery.
   We track local navigation, but not a browsable product/session tree.

6. Drilldown is still not semantically precise enough.
   We crop the clicked region, but do not yet identify the clicked visual object before generating.

7. No progressive/livestream generation.
   Generation currently waits for the provider response.

## How Far Behind We Are

Product mechanics: about 50-60% there.

Visual feel and demo polish: about 30-40% there.

The biggest gap is not the base architecture. It is the tight loop of visual style, clickable-region semantics, shareable node pages, and perceived speed.

## Recommended Next Sprint

1. Add `/n/:productId` read-only product page.
2. Add `fast / balanced / pro` quality selector.
3. Add image upload as a starting point.
4. Add semantic click planning: identify the clicked region before image edit.
5. Add a history/session tray showing explored pages.
6. Tune the default visual prompt toward light scientific hand-drawn explainer pages.
7. Add async generation status so the UI feels alive during long waits.


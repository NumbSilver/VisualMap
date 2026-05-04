import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProductRecord } from "./types";

const PRODUCTS_ROOT = path.join(process.cwd(), "data", "products");

function safeId() {
  const random = crypto.randomUUID().slice(0, 8);
  return `product_${Date.now()}_${random}`;
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/svg+xml") {
    return "svg";
  }

  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  return "png";
}

export async function saveProduct(input: {
  source: string;
  depth: number;
  mode: ProductRecord["mode"];
  imageBase64: string;
  mimeType: string;
  prompt: string;
  provider: string;
  model: string;
  textProvider?: string;
  textModel?: string;
  parentProductId?: string | null;
  click?: ProductRecord["click"];
  plan?: unknown;
}) {
  const id = safeId();
  const dir = path.join(PRODUCTS_ROOT, id);
  await mkdir(dir, { recursive: true });

  const extension = extensionForMime(input.mimeType);
  const imageFileName = `image.${extension}`;
  const imagePath = path.join(dir, imageFileName);
  const metadataPath = path.join(dir, "product.json");
  await writeFile(imagePath, Buffer.from(input.imageBase64, "base64"));

  const record: ProductRecord = {
    id,
    source: input.source,
    depth: input.depth,
    mode: input.mode,
    imagePath,
    imageUrl: `/api/products/${id}/image`,
    prompt: input.prompt,
    provider: input.provider,
    model: input.model,
    textProvider: input.textProvider,
    textModel: input.textModel,
    parentProductId: input.parentProductId ?? null,
    click: input.click ?? null,
    plan: input.plan,
    createdAt: new Date().toISOString()
  };

  await writeFile(metadataPath, JSON.stringify(record, null, 2));

  return record;
}

export async function readProduct(id: string) {
  const metadataPath = path.join(PRODUCTS_ROOT, id, "product.json");
  const content = await readFile(metadataPath, "utf-8");
  return JSON.parse(content) as ProductRecord;
}

export async function readProductImageBase64(id: string) {
  const product = await readProduct(id);
  const image = await readFile(product.imagePath);
  const mimeType = product.imagePath.endsWith(".svg")
    ? "image/svg+xml"
    : product.imagePath.endsWith(".jpg") || product.imagePath.endsWith(".jpeg")
      ? "image/jpeg"
      : "image/png";

  return {
    base64: image.toString("base64"),
    mimeType
  };
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function contentTypeForImagePath(imagePath: string) {
  if (imagePath.endsWith(".svg")) {
    return "image/svg+xml";
  }

  if (imagePath.endsWith(".jpg") || imagePath.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  return "image/png";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const root = path.join(process.cwd(), "data", "products", id);
  const candidates = ["image.png", "image.jpg", "image.svg"];

  for (const fileName of candidates) {
    const imagePath = path.join(root, fileName);
    try {
      const bytes = await readFile(imagePath);
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": contentTypeForImagePath(imagePath),
          "Cache-Control": "public, max-age=31536000, immutable"
        }
      });
    } catch {
      // Try the next extension.
    }
  }

  return NextResponse.json({ error: "Product image not found" }, { status: 404 });
}

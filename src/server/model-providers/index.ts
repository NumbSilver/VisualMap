import { bytedanceAidpImageProvider } from "./bytedance-aidp-image-provider";
import { mockImageProvider } from "./mock-image-provider";
import type { ImageProvider } from "./types";

export function getImageProvider(): ImageProvider {
  switch (process.env.IMAGE_PROVIDER ?? "mock") {
    case "bytedance-aidp":
      return bytedanceAidpImageProvider;
    case "mock":
      return mockImageProvider;
    default:
      return mockImageProvider;
  }
}

export type {
  GenerateImageInput,
  GenerateImageOutput,
  ImageProvider,
  VisualMapAspectRatio,
  VisualMapQuality
} from "./types";

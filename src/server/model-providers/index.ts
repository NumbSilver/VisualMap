import { bytedanceAidpImageProvider } from "./bytedance-aidp-image-provider";
import { bytedanceAidpTextProvider } from "./bytedance-aidp-text-provider";
import { mockImageProvider } from "./mock-image-provider";
import { mockTextProvider } from "./mock-text-provider";
import type { ImageProvider, TextProvider } from "./types";

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

export function getTextProvider(): TextProvider {
  switch (process.env.TEXT_PROVIDER ?? "mock") {
    case "bytedance-aidp":
      return bytedanceAidpTextProvider;
    case "mock":
      return mockTextProvider;
    default:
      return mockTextProvider;
  }
}

export type {
  GenerateImageInput,
  GenerateImageOutput,
  ImageProvider,
  PlanNextPageInput,
  PlanNextPageOutput,
  TextProvider,
  VisualMapAspectRatio,
  VisualMapQuality
} from "./types";

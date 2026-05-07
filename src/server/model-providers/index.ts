import { mockImageProvider } from "./mock-image-provider";
import { mockTextProvider } from "./mock-text-provider";
import { openAICompatibleImageProvider } from "./openai-compatible-image-provider";
import { openAICompatibleTextProvider } from "./openai-compatible-text-provider";
import type { ImageProvider, TextProvider } from "./types";

export function getImageProvider(): ImageProvider {
  switch (process.env.IMAGE_PROVIDER ?? "mock") {
    case "openai-compatible":
      return openAICompatibleImageProvider;
    case "mock":
      return mockImageProvider;
    default:
      return mockImageProvider;
  }
}

export function getTextProvider(): TextProvider {
  switch (process.env.TEXT_PROVIDER ?? "mock") {
    case "openai-compatible":
      return openAICompatibleTextProvider;
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

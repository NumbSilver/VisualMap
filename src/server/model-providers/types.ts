export type VisualMapAspectRatio = "1:1" | "4:3" | "16:9" | "9:16" | "auto";
export type VisualMapQuality = "preview" | "final" | "auto";

export interface GenerateImageInput {
  prompt: string;
  aspectRatio?: VisualMapAspectRatio;
  quality?: VisualMapQuality;
  logId?: string;
}

export interface GenerateImageOutput {
  imageBase64: string;
  mimeType: string;
  provider: string;
  model: string;
  usage?: unknown;
}

export interface ImageProvider {
  generateImage(input: GenerateImageInput): Promise<GenerateImageOutput>;
}

export class ProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigurationError";
  }
}

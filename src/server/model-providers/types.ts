export type VisualMapAspectRatio = "1:1" | "4:3" | "16:9" | "9:16" | "auto";
export type VisualMapQuality = "preview" | "final" | "auto";

export interface GenerateImageInput {
  prompt: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
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

export interface PlanNextPageInput {
  source: string;
  sourceSummary: string;
  currentPath: string[];
  clickedCoordinates?: {
    x: number;
    y: number;
  };
  mode: "explain" | "explore" | "add";
  depth: number;
}

export interface PlannedNode {
  title: string;
  description: string;
}

export interface PlanNextPageOutput {
  title: string;
  summary: string;
  visualPrompt: string;
  nodes: PlannedNode[];
  provider: string;
  model: string;
}

export interface TextProvider {
  planNextPage(input: PlanNextPageInput): Promise<PlanNextPageOutput>;
}

export class ProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigurationError";
  }
}

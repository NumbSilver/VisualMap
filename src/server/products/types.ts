export interface ProductRecord {
  id: string;
  source: string;
  depth: number;
  mode: "explain" | "explore" | "add";
  requestedMode?: "auto" | "explain" | "explore" | "add";
  imagePath: string;
  imageUrl: string;
  prompt: string;
  provider: string;
  model: string;
  textProvider?: string;
  textModel?: string;
  parentProductId?: string | null;
  click?: {
    x: number;
    y: number;
  } | null;
  plan?: unknown;
  createdAt: string;
}

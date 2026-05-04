export type ResolvedMode = "explain" | "explore" | "add";
export type RequestedMode = ResolvedMode | "auto";

export interface ResolveModeInput {
  source: string;
  depth?: number;
  requestedMode?: RequestedMode;
}

function looksLikeQuestion(source: string) {
  const trimmed = source.trim();
  return (
    trimmed.endsWith("?") ||
    trimmed.endsWith("？") ||
    /^(what|why|how|when|where|who|is|are|can|should|does|do)\b/i.test(trimmed) ||
    /^(什么|为什么|怎么|如何|是否|能不能|有没有|请问)/.test(trimmed)
  );
}

function estimateContentLength(source: string) {
  return source.replace(/\s+/g, "").length;
}

export function resolveMode(input: ResolveModeInput): ResolvedMode {
  if (input.requestedMode && input.requestedMode !== "auto") {
    return input.requestedMode;
  }

  const sourceLength = estimateContentLength(input.source);
  const depth = input.depth ?? 0;

  if (looksLikeQuestion(input.source) || sourceLength < 80) {
    return "explore";
  }

  if (depth >= 2) {
    return "explore";
  }

  return "explain";
}

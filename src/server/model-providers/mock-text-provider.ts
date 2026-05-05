import type {
  PlanNextPageInput,
  PlanNextPageOutput,
  TextProvider
} from "./types";
import { VISUAL_STYLE_CONTRACT } from "@/server/style/visual-style";

function shortSource(input: string) {
  return input.length > 120 ? `${input.slice(0, 120)}...` : input;
}

export const mockTextProvider: TextProvider = {
  async planNextPage(input: PlanNextPageInput): Promise<PlanNextPageOutput> {
    const click = input.clickedCoordinates
      ? `clicked x=${input.clickedCoordinates.x.toFixed(2)}, y=${input.clickedCoordinates.y.toFixed(2)}`
      : "opening overview";
    const title =
      input.depth === 0
        ? "VisualMap Overview"
        : `${input.mode.toUpperCase()} Drilldown ${input.depth}`;
    const summary = `${click} for ${shortSource(input.sourceSummary)}`;

    return {
      title,
      summary,
      visualPrompt: [
        title,
        summary,
        input.clickedCoordinates
          ? "This is a zoom-in page. Center the composition on the clicked area and reveal details that were not visible before."
          : "This is the opening overview page.",
        VISUAL_STYLE_CONTRACT,
        "Create a complete light hand-drawn infographic with a central focus, 4-7 surrounding nodes, elegant labels, and airy spacing."
      ].join("\n"),
      nodes: [
        { title: "Context", description: "What this source is about." },
        { title: "Structure", description: "The main parts of the idea." },
        { title: "Next", description: "Where the user can drill deeper." }
      ],
      provider: "mock",
      model: "mock-text"
    };
  }
};

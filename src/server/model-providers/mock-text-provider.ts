import type {
  PlanNextPageInput,
  PlanNextPageOutput,
  TextProvider
} from "./types";

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
        "Create a complete visual knowledge map with a central focus, 4-7 surrounding nodes, elegant labels, and spatial depth."
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

import type { GenerateImageInput, GenerateImageOutput, ImageProvider } from "./types";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const mockImageProvider: ImageProvider = {
  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const title = escapeXml(input.prompt.slice(0, 110));
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
        <defs>
          <radialGradient id="glow" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stop-color="#32505a"/>
            <stop offset="54%" stop-color="#121719"/>
            <stop offset="100%" stop-color="#08090a"/>
          </radialGradient>
          <filter id="blur"><feGaussianBlur stdDeviation="26"/></filter>
        </defs>
        <rect width="1536" height="1024" fill="url(#glow)"/>
        <circle cx="320" cy="210" r="180" fill="#7fd7c7" opacity="0.18" filter="url(#blur)"/>
        <circle cx="1220" cy="720" r="260" fill="#f0b36a" opacity="0.14" filter="url(#blur)"/>
        <path d="M274 518 C 460 318, 682 704, 884 478 S 1182 370, 1286 612" fill="none" stroke="#f4efe5" stroke-opacity="0.28" stroke-width="4"/>
        <g fill="#101315" stroke="#f4efe5" stroke-opacity="0.24" stroke-width="2">
          <rect x="180" y="160" width="360" height="180" rx="28"/>
          <rect x="616" y="412" width="330" height="170" rx="28"/>
          <rect x="1010" y="610" width="350" height="176" rx="28"/>
        </g>
        <g fill="#f4efe5" font-family="Inter, system-ui, sans-serif">
          <text x="120" y="92" font-size="42" font-weight="700">VisualMap Mock Provider</text>
          <text x="120" y="146" font-size="22" opacity="0.72">No image API key configured. The app shell is still interactive.</text>
          <text x="220" y="248" font-size="26" font-weight="700">Source</text>
          <text x="656" y="502" font-size="26" font-weight="700">Generated Page</text>
          <text x="1052" y="704" font-size="26" font-weight="700">Click to Drill</text>
          <text x="120" y="928" font-size="22" opacity="0.66">${title}</text>
        </g>
      </svg>`;

    return {
      imageBase64: Buffer.from(svg).toString("base64"),
      mimeType: "image/svg+xml",
      provider: "mock",
      model: "svg-mock"
    };
  }
};

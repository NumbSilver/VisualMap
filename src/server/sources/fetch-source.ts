import * as cheerio from "cheerio";

export interface SourceContent {
  original: string;
  isUrl: boolean;
  ok: boolean;
  title?: string;
  description?: string;
  text: string;
  error?: string;
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractHtml(html: string, url: string): SourceContent {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();

  const title = normalizeWhitespace(
    $("meta[property='og:title']").attr("content") ??
      $("meta[name='twitter:title']").attr("content") ??
      $("title").text()
  );
  const description = normalizeWhitespace(
    $("meta[property='og:description']").attr("content") ??
      $("meta[name='description']").attr("content") ??
      ""
  );

  const candidates = [
    $("#js_content").text(),
    $("article").text(),
    $("main").text(),
    $("[role='main']").text(),
    $("body").text()
  ]
    .map(normalizeWhitespace)
    .filter(Boolean);

  const text = candidates.sort((a, b) => b.length - a.length)[0] ?? "";
  const blocked =
    text.includes("环境异常") ||
    text.includes("完成验证后即可继续访问") ||
    text.includes("去验证");

  if (blocked) {
    return {
      original: url,
      isUrl: true,
      ok: false,
      title,
      description,
      text,
      error:
        "This URL appears to require browser verification, so the server could not read the article body."
    };
  }

  if (text.length < 160) {
    return {
      original: url,
      isUrl: true,
      ok: false,
      title,
      description,
      text,
      error: "The fetched page did not contain enough readable article text."
    };
  }

  return {
    original: url,
    isUrl: true,
    ok: true,
    title,
    description,
    text
  };
}

export async function resolveSourceContent(source: string): Promise<SourceContent> {
  const trimmed = source.trim();
  if (!isHttpUrl(trimmed)) {
    return {
      original: trimmed,
      isUrl: false,
      ok: true,
      text: trimmed
    };
  }

  try {
    const response = await fetch(trimmed, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
      },
      redirect: "follow"
    });

    if (!response.ok) {
      return {
        original: trimmed,
        isUrl: true,
        ok: false,
        text: "",
        error: `The URL request failed with HTTP ${response.status}.`
      };
    }

    const html = await response.text();
    return extractHtml(html, trimmed);
  } catch (error) {
    return {
      original: trimmed,
      isUrl: true,
      ok: false,
      text: "",
      error:
        error instanceof Error
          ? `The URL could not be fetched: ${error.message}`
          : "The URL could not be fetched."
    };
  }
}

export function sourceSummaryForPlanning(source: SourceContent) {
  const parts = [
    source.title ? `Title: ${source.title}` : "",
    source.description ? `Description: ${source.description}` : "",
    `Content: ${source.text}`
  ].filter(Boolean);

  const summary = parts.join("\n");
  return summary.length > 6000 ? `${summary.slice(0, 6000)}...` : summary;
}

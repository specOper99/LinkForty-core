export type ScrapedOg = {
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  ogType?: string;
};

function metaContent(
  html: string,
  property: string,
): string | undefined {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // content before or after property attribute
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}

export async function scrapeOpenGraph(url: string): Promise<ScrapedOg> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; LinkFortyBot/1.0; +https://linkforty.com)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) return {};
    const html = await res.text();
    const ogTitle = metaContent(html, "og:title");
    const ogDescription = metaContent(html, "og:description");
    const ogImageUrl = metaContent(html, "og:image");
    const ogType = metaContent(html, "og:type");
    return {
      ...(ogTitle ? { ogTitle } : {}),
      ...(ogDescription ? { ogDescription } : {}),
      ...(ogImageUrl ? { ogImageUrl } : {}),
      ...(ogType ? { ogType } : {}),
    };
  } catch {
    return {};
  }
}

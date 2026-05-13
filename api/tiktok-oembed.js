const TIKTOK_OEMBED_URL = "https://www.tiktok.com/oembed";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawUrl = request.query?.url;

  if (!rawUrl || typeof rawUrl !== "string") {
    response.status(400).json({ error: "Missing TikTok URL." });
    return;
  }

  let sourceUrl;

  try {
    sourceUrl = new URL(rawUrl);
  } catch {
    response.status(400).json({ error: "Invalid URL." });
    return;
  }

  if (!isTikTokUrl(sourceUrl)) {
    response.status(400).json({ error: "Only TikTok URLs are supported." });
    return;
  }

  const oembedUrl = new URL(TIKTOK_OEMBED_URL);
  oembedUrl.searchParams.set("url", sourceUrl.toString());

  try {
    const tiktokResponse = await fetch(oembedUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "nowe-lokale-gastro/0.1",
      },
    });

    if (!tiktokResponse.ok) {
      response.status(tiktokResponse.status).json({
        error: "TikTok did not return metadata for this URL.",
      });
      return;
    }

    const data = await tiktokResponse.json();

    response.status(200).json({
      title: data.title || "",
      authorName: data.author_name || "",
      authorUrl: data.author_url || "",
      providerName: data.provider_name || "TikTok",
      thumbnailUrl: data.thumbnail_url || "",
      sourceUrl: sourceUrl.toString(),
    });
  } catch {
    response.status(502).json({ error: "Could not fetch TikTok metadata." });
  }
}

function isTikTokUrl(url) {
  return url.hostname === "tiktok.com" || url.hostname.endsWith(".tiktok.com");
}

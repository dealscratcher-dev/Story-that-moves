// 1. Define robust CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Max-Age": "86400",
};

// 2. Helper for consistent JSON responses
function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

Deno.serve(async (req: Request) => {
  // 🛡️ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  // 🛡️ Handle direct browser visits (GET)
  if (req.method === "GET") {
    return jsonResponse({ message: "Dynamic API is online. Use POST to fetch content." });
  }

  // Only allow POST for the actual fetching logic
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed", allowed: ["POST"] }, { status: 405 });
  }

  let url: string | undefined;
  let mode: "html" | "text" | undefined;

  // ---- 🛡️ SAFE PARSING PATCH ----
  try {
    const bodyText = await req.text();
    if (!bodyText) {
      return jsonResponse({ error: "Empty request body" }, { status: 400 });
    }
    const body = JSON.parse(bodyText);
    url = body?.url;
    mode = body?.mode;
  } catch (err) {
    return jsonResponse({ error: "Malformed JSON", details: String(err) }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return jsonResponse({ error: "URL is required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; StoriesReader/1.0; +https://stitchqylt)",
      },
    });

    if (!upstream.ok) {
      return jsonResponse(
        { error: "Failed to fetch upstream", status: upstream.status },
        { status: upstream.status }
      );
    }

    let html = await upstream.text();

    // ---------- MODE: HTML ----------
    if (mode === "html") {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

      let processedHtml = html
        .replace(/<base[^>]*>/gi, "")
        .replace(/<head>/i, `<head><base href="${baseUrl}">`)
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, (match) => {
          if (match.length > 15000) return ""; 
          return match;
        })
        .replace(/\s+/g, " ")
        .trim();

      const MAX_SIZE = 950_000;
      if (processedHtml.length > MAX_SIZE) {
        const bodyMatch = processedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          const bodyContent = bodyMatch[1];
          const headMatch = processedHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
          const head = headMatch ? headMatch[0] : `<head><base href="${baseUrl}"></head>`;
          processedHtml = `<!DOCTYPE html><html>${head}<body>${bodyContent}</body></html>`;
        }
      }

      return jsonResponse({ html: processedHtml, url });
    }

    // ---------- MODE: TEXT ----------
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    let content = articleMatch ? articleMatch[1] : mainMatch ? mainMatch[1] : html;
    const paragraphs = content.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [];

    let text = paragraphs
      .map((p) => p.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim())
      .filter((p) => p.length > 20)
      .join("\n\n");

    return jsonResponse({ text, url });
  } catch (error) {
    console.error("fetch error:", error);
    return jsonResponse({ error: "Internal error", details: String(error) }, { status: 500 });
  }
});

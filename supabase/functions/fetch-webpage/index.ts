const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  // lower-case names; this is the pattern Supabase uses in their examples
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed", allowed: ["POST"] },
      { status: 405 },
    );
  }

  let url: string | undefined;
  let mode: "html" | "text" | undefined;

  // ---- Parse body safely ----
  try {
    const body = await req.json();
    url = body?.url;
    mode = body?.mode;
  } catch (err) {
    return jsonResponse(
      { error: "Invalid JSON body", details: String(err) },
      { status: 400 },
    );
  }

  if (!url || typeof url !== "string") {
    return jsonResponse({ error: "URL is required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; StoriesReader/1.0; +https://stitchqylt)",
      },
    });

    if (!upstream.ok) {
      return jsonResponse(
        {
          error: "Failed to fetch upstream",
          status: upstream.status,
          statusText: upstream.statusText,
        },
        { status: upstream.status },
      );
    }

    let html = await upstream.text();

    // ---------- MODE: HTML ----------
    if (mode === "html") {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

      let processedHtml = html
        // remove existing <base>
        .replace(/<base[^>]*>/gi, "")
        // inject our base so relative links work
        .replace(/<head>/i, `<head><base href="${baseUrl}">`)
        // strip scripts completely
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
        // strip comments
        .replace(/<!--[\s\S]*?-->/g, "")
        // keep style tags but drop huge ones
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, (match) => {
          if (match.length > 10000) return "";
          return match;
        })
        // compress whitespace a bit
        .replace(/\s+/g, " ")
        .trim();

      //  ~900 KB safety cap
      const MAX_SIZE = 900_000;
      if (processedHtml.length > MAX_SIZE) {
        const bodyMatch = processedHtml.match(
          /<body[^>]*>([\s\S]*?)<\/body>/i,
        );
        if (bodyMatch) {
          const bodyContent = bodyMatch[1];
          const headMatch = processedHtml.match(
            /<head[^>]*>([\s\S]*?)<\/head>/i,
          );
          const head = headMatch
            ? headMatch[0]
            : `<head><base href="${baseUrl}"></head>`;
          processedHtml = `<!DOCTYPE html><html>${head}<body>${bodyContent}</body></html>`;
        }
      }

      return jsonResponse({ html: processedHtml, url });
    }

    // ---------- MODE: TEXT (default) ----------
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

    let content = articleMatch
      ? articleMatch[1]
      : mainMatch
      ? mainMatch[1]
      : html;

    const paragraphs = content.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [];

    let text = paragraphs
      .map((p) => {
        const cleaned = p
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
        return cleaned;
      })
      .filter((p) => p.length > 20)
      .join("\n\n");

    // fallback: whole <body> if paragraphs are too weak
    if (!text || text.length < 50) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        text = bodyMatch[1]
          .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
          .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/\s+/g, " ")
          .trim();
      }
    }

    return jsonResponse({ text, url });
  } catch (error) {
    console.error("fetch-webpage error:", error);
    return jsonResponse(
      { error: "Internal error", details: String(error) },
      { status: 500 },
    );
  }
});

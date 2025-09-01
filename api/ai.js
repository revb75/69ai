// api/ai.js — Edge Function (no Node APIs needed)
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" }
    });
  }

  const key = process.env.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;
  if (!key) {
    return new Response(JSON.stringify({ error: "missing_openrouter_api_key" }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }

  let body = {};
  try {
    body = await req.json();
  } catch (_) {
    // ignore: will validate below
  }
  const { userMessage, history = [] } = body;
  if (!userMessage || typeof userMessage !== "string") {
    return new Response(JSON.stringify({ error: "missing_user_message" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        // OpenRouter recommends these (helps with rate limits/attribution)
        "HTTP-Referer": req.headers.get("origin") || "https://https://69ai-nu.vercel.app/",
        "X-Title": "Uncensored AI Chat"
      },
      body: JSON.stringify({
        model: "nousresearch/nous-hermes-2-mistral-7b-dpo",
        messages: [
          { role: "system", content: "You are a helpful uncensored assistant." },
          ...history,
          { role: "user", content: userMessage }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return new Response(
        JSON.stringify({ error: "upstream_non_json", status: r.status, body: text.slice(0, 400) }),
        { status: r.status || 502, headers: { "content-type": "application/json" } }
      );
    }

    if (!r.ok) {
      return new Response(
        JSON.stringify({ error: "upstream_error", status: r.status, body: data }),
        { status: r.status, headers: { "content-type": "application/json" } }
      );
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || "";
    return new Response(JSON.stringify({ reply }), {
      headers: { "content-type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "ai_failed", detail: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

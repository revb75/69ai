// api/ai.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userMessage, history = [] } = req.body;

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${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}`,
        "Content-Type": "application/json"
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

    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "[no reply]";
    res.json({ reply });
  } catch (err) {
    console.error("AI error", err);
    res.status(500).json({ error: "ai_failed" });
  }
}


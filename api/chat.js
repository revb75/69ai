// /api/chat.js — Serverless proxy for OpenRouter
// Works on Vercel/Next.js (Node runtime). Keeps your API key off the client.
// Set env var: chatbotkey (preferred) or fallback OPENROUTER_API_KEY

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.chatbotkey || process.env.CHATBOTKEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing chatbotkey / CHATBOTKEY / OPENROUTER_API_KEY' });
  }

  try {
    const { model, messages, temperature = 0.7, stream = true } = req.body || {};

    if (!model || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing `model` or `messages` (array)' });
    }

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.PUBLIC_URL || 'http://localhost',
        'X-Title': process.env.SITE_TITLE || 'OpenRouter Inline Chat'
      },
      body: JSON.stringify({ model, messages, temperature, stream })
    });

    if (stream) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');

      if (!upstream.ok || !upstream.body) {
        const errorText = await upstream.text().catch(() => '');
        res.write(`data: ${JSON.stringify({ error: `Upstream ${upstream.status}: ${errorText.slice(0,200)}` })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }

      const reader = upstream.body.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
      } catch (err) {
        res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
      } finally {
        res.write('data: [DONE]\n\n');
        res.end();
      }
      return;
    }

    const text = await upstream.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const json = JSON.parse(text);
      return res.status(upstream.status).json(json);
    } catch {
      return res.status(upstream.status).send(text);
    }
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}

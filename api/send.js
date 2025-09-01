import jwt from "jsonwebtoken";
import PubNub from "pubnub";

const pubnub = new PubNub({
  publishKey: "pub-c-acd54e50-42a9-4ac5-bd2e-442ed8e5541f",
  subscribeKey: "sub-c-f22ff86e-252f-4592-83ef-17f4d28d7ecc",
  secretKey: "sec-c-NDA3MDE5MTgtM2M2OC00OGY0LTg3NDUtMDU4Y2NjZGU1ZmQ3",
  uuid: "server"
});

function sanitize(text) {
  return text.replace(/\b(fuck|shit|bitch|asshole)\b/gi, "•••");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { channel, from, text, token } = req.body;
  if (!channel || !from || !text || !token)
    return res.status(400).json({ error: "missing_fields" });

  try {
    jwt.verify(token, "supersecret123");
  } catch {
    return res.status(403).json({ error: "invalid_token" });
  }

  const clean = sanitize(text);
  try {
    const result = await pubnub.publish({ channel, message: { from, text: clean } });
    res.json({ ok: true, timetoken: result.timetoken });
  } catch {
    res.status(500).json({ error: "publish_failed" });
  }
}

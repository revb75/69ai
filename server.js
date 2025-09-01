import express from "express";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import PubNub from "pubnub";
import jwt from "jsonwebtoken";
import fs from "fs";

dotenv.config();

const {
  PUBNUB_PUBLISH_KEY,
  PUBNUB_SUBSCRIBE_KEY,
  JWT_SECRET,
  DEFAULT_CHANNEL = "room-1",
  PORT = 5173,
} = process.env;

const pubnub = new PubNub({
  publishKey: PUBNUB_PUBLISH_KEY,
  subscribeKey: PUBNUB_SUBSCRIBE_KEY,
  uuid: "server",
});

const app = express();
app.use(morgan("tiny"));
app.use(cors());
app.use(express.json());

// Auth: check DOB >= 18, issue JWT
app.post("/auth", (req, res) => {
  const { dob, user } = req.body;
  if (!dob || !user) return res.status(400).json({ error: "missing_fields" });
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25*24*60*60*1000));
  if (age < 18) return res.status(403).json({ error: "age_restriction" });
  const token = jwt.sign({ user }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token, subscribeKey: PUBNUB_SUBSCRIBE_KEY, defaultChannel: DEFAULT_CHANNEL });
});

// Simple profanity filter
function sanitize(text) {
  return text.replace(/\b(fuck|shit|bitch|asshole)\b/gi, "•••");
}

// Relay endpoint
app.post("/send", (req, res) => {
  const { channel, from, text, token } = req.body;
  if (!channel || !from || !text || !token)
    return res.status(400).json({ error: "missing_fields" });
  try { jwt.verify(token, JWT_SECRET); } catch { return res.status(403).json({ error: "invalid_token" }); }
  const clean = sanitize(text);
  pubnub.publish({ channel, message: { from, text: clean } })
    .then(r => {
      fs.appendFileSync("messages.log", JSON.stringify({ channel, from, text: clean, ts: Date.now() })+"\n");
      res.json({ ok: true, timetoken: r.timetoken });
    })
    .catch(() => res.status(500).json({ error: "publish_failed" }));
});

// Serve index.html
app.use("/", express.static("./"));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

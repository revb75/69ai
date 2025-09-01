import jwt from "jsonwebtoken";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { dob, user } = req.body;
  if (!dob || !user) return res.status(400).json({ error: "missing_fields" });

  const age = Math.floor(
    (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  if (age < 18) return res.status(403).json({ error: "age_restriction" });

  const token = jwt.sign({ user }, "supersecret123", { expiresIn: "1h" });
  res.json({
    token,
    subscribeKey: "sub-c-f22ff86e-252f-4592-83ef-17f4d28d7ecc",
    defaultChannel: "room-1"
  });
}

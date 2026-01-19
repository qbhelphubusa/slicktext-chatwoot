app.post("/test", (req, res) => {
  console.log("✅ TEST ROUTE HIT");
  res.send("TEST OK");
});

import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

/**
 * Health check (Railway requires this)
 */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/**
 * Normalize phone to E.164 (+15551234567)
 */
function normalizePhone(phone) {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("1")) clean = "1" + clean;
  return `+${clean}`;
}

app.post("/slicktext", async (req, res) => {
  console.log("📩 SlickText payload:", JSON.stringify(req.body, null, 2));

  try {
    const { event, data } = req.body;

    /**
     * Support BOTH possible SlickText events
     */
    if (!["incoming_message", "message.received"].includes(event)) {
      return res.sendStatus(200);
    }

    /**
     * Support BOTH payload formats
     */
    const phone = normalizePhone(data?.from);
    const text = data?.body || data?.message;

    if (!phone || !text) {
      console.log("⚠️ Missing phone or text");
      return res.sendStatus(200);
    }

    console.log(`📞 SMS from ${phone}: ${text}`);

    const url = `${process.env.CHATWOOT_URL}/api/v1/inboxes/${process.env.INBOX_IDENTIFIER}/messages`;

    await axios.post(
      url,
      {
        source_id: phone, // REQUIRED by Chatwoot
        content: text
      },
      {
        headers: {
          "Content-Type": "application/json",
          api_access_token: process.env.CHATWOOT_API_TOKEN
        },
        timeout: 10000
      }
    );

    console.log("✅ Message delivered to Chatwoot");
    res.sendStatus(200);

  } catch (err) {
    console.error(
      "❌ SlickText → Chatwoot error:",
      err.response?.data || err.message
    );
    res.sendStatus(500);
  }
});

/**
 * 🚨 Railway FIX (MOST IMPORTANT)
 * - Use dynamic PORT
 * - Bind to 0.0.0.0
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

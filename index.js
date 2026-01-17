import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

/**
 * Health check (Railway)
 */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/**
 * Helpers
 */
function normalizePhone(phone) {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("1")) clean = "1" + clean;
  return "+" + clean;
}

/**
 * ==============================
 * SlickText → Chatwoot
 * ==============================
 */
app.post("/slicktext", async (req, res) => {
  console.log("📩 Received payload:", JSON.stringify(req.body));

  try {
    const { event, data } = req.body;
    if (event !== "message.received") return res.sendStatus(200);

    const phone = normalizePhone(data.from);
    const text = data.message;

    console.log(`📞 Incoming SMS from ${phone}: ${text}`);

    await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/inboxes/${process.env.INBOX_ID}/messages`,
      {
        source_id: `slicktext_${phone}`,
        content: text,
        content_type: "text"
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHATWOOT_INBOX_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Message sent to Chatwoot");
    res.sendStatus(200);

  } catch (err) {
    console.error("❌ SlickText → Chatwoot error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

/**
 * ==============================
 * Chatwoot → SlickText
 * ==============================
 */
app.post("/chatwoot", async (req, res) => {
  try {
    if (req.body.message_type !== "outgoing" || req.body.private) {
      return res.sendStatus(200);
    }

    const phone = normalizePhone(req.body.conversation?.contact?.phone_number);
    const text = req.body.content;

    console.log(`📤 Agent reply to ${phone}: ${text}`);

    // ENABLE IN PRODUCTION
    /*
    await axios.post(
      "https://api.slicktext.com/v1/messages/send",
      { to: phone, message: text },
      {
        headers: {
          Authorization: `Bearer ${process.env.SLICKTEXT_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    */

    res.sendStatus(200);

  } catch (err) {
    console.error("❌ Chatwoot → SlickText error:", err.message);
    res.sendStatus(500);
  }
});

/**
 * Server
 */
const PORT = process.env.PORT;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

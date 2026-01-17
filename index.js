import express from "express";
import axios from "axios";

const app = express();

/**
 * ------------------------
 * MIDDLEWARE
 * ------------------------
 */
app.use(express.json());

// Simple health check (Railway needs this)
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/**
 * ------------------------
 * HELPERS
 * ------------------------
 */
function normalizePhone(phone) {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("1")) clean = "1" + clean;
  return "+" + clean;
}

/**
 * ------------------------
 * SLICKTEXT → CHATWOOT
 * Incoming SMS webhook
 * ------------------------
 */
app.post("/slicktext", async (req, res) => {
  console.log("📩 Received payload:", JSON.stringify(req.body));

  try {
    const { event, data } = req.body;

    // Ignore non message events
    if (event !== "message.received" || !data) {
      console.log("ℹ️ Ignored non-SMS event");
      return res.sendStatus(200);
    }

    const phone = normalizePhone(data.from);
    const text = data.message;

    if (!phone || !text) {
      console.error("❌ Invalid payload");
      return res.sendStatus(400);
    }

    console.log(`📞 Incoming SMS from ${phone}: ${text}`);

    await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/conversations`,
      {
        inbox_id: Number(process.env.INBOX_ID),
        source_id: `slicktext_${phone}`,
        contact: {
          phone_number: phone
        },
        message: {
          content: text
        }
      },
      {
        headers: {
          api_access_token: process.env.CHATWOOT_TOKEN,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      }
    );

    console.log("✅ Message sent to Chatwoot");
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
 * ------------------------
 * CHATWOOT → SLICKTEXT
 * Outgoing agent replies
 * ------------------------
 */
app.post("/chatwoot", async (req, res) => {
  try {
    // Only public outgoing messages
    if (req.body.message_type !== "outgoing" || req.body.private === true) {
      return res.sendStatus(200);
    }

    const text = req.body.content;
    const rawPhone = req.body.conversation?.contact?.phone_number;
    const phone = normalizePhone(rawPhone);

    if (!text || !phone) {
      return res.sendStatus(400);
    }

    console.log(`📤 Agent reply to ${phone}: ${text}`);

    /**
     * REAL SMS SEND (ENABLE IN PRODUCTION)
     */
    /*
    await axios.post(
      "https://api.slicktext.com/v1/messages/send",
      {
        to: phone,
        message: text
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SLICKTEXT_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    */

    console.log("✅ Outgoing message handled");
    res.sendStatus(200);

  } catch (err) {
    console.error(
      "❌ Chatwoot → SlickText error:",
      err.response?.data || err.message
    );
    res.sendStatus(500);
  }
});

/**
 * ------------------------
 * SERVER (Railway SAFE)
 * ------------------------
 */
const PORT = process.env.PORT;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

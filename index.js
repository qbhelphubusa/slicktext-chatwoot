import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

/**
 * Normalize phone number to +1XXXXXXXXXX
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
 * Incoming SMS webhook
 * ==============================
 */
app.post("/slicktext", async (req, res) => {
  console.log("📩 Received payload:", JSON.stringify(req.body));

  try {
    /**
     * SlickText REAL SMS webhook format:
     * {
     *   event: "message.received",
     *   data: {
     *     from: "+15551234567",
     *     message: "Hello"
     *   }
     * }
     */
    const { event, data } = req.body;

    // Ignore non-SMS / inbox / retry webhooks
    if (event !== "message.received" || !data) {
      console.log("ℹ️ Ignored non-SMS webhook");
      return res.sendStatus(200);
    }

    const phone = normalizePhone(data.from);
    const text = data.message;

    if (!phone || !text) {
      console.error("❌ Missing phone or message");
      return res.status(400).send("Invalid payload");
    }

    console.log(`📞 Incoming SMS from ${phone}: ${text}`);

    /**
     * STEP 1: Create conversation
     * Chatwoot Cloud auto-creates contact
     */
    const convoRes = await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/conversations`,
      {
        inbox_id: Number(process.env.INBOX_ID),
        source_id: phone,
        contact: {
          phone_number: phone
        }
      },
      {
        headers: {
          api_access_token: process.env.CHATWOOT_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    const conversationId = convoRes.data.id;

    /**
     * STEP 2: Add incoming message
     */
    await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/conversations/${conversationId}/messages`,
      {
        content: text,
        message_type: "incoming"
      },
      {
        headers: {
          api_access_token: process.env.CHATWOOT_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Message successfully added to Chatwoot");
    res.sendStatus(200);

  } catch (err) {
    console.error(
      "❌ SlickText → Chatwoot error:",
      err.response?.data || err.message
    );
    res.status(500).send("Processing failed");
  }
});

/**
 * ==============================
 * Chatwoot → SlickText
 * Outgoing agent reply webhook
 * ==============================
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
      return res.status(400).send("Missing phone or content");
    }

    console.log(`📤 Agent reply to ${phone}: ${text}`);

    /**
     * ⚠️ REAL SMS SEND (enable only in production)
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

    console.log("✅ Outgoing handled (SMS disabled for testing)");
    res.sendStatus(200);

  } catch (err) {
    console.error(
      "❌ Chatwoot → SlickText error:",
      err.response?.data || err.message
    );
    res.status(500).send("Send failed");
  }
});

/**
 * Server
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

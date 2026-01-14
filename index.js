import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Utility: Normalize US phone number to +1XXXXXXXXXX
function normalizePhone(phone) {
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("1")) clean = "1" + clean;
  return "+" + clean;
}

/* 🔽 SlickText → Chatwoot (Incoming SMS) */
app.post("/slicktext", async (req, res) => {
  console.log("📩 Received payload:", JSON.stringify(req.body));

  try {
    // ✅ Strictly follow SlickText's webhook format
    const { event, data } = req.body;

    if (event !== "message.received" || !data) {
      console.warn("⚠️ Invalid SlickText payload format");
      return res.status(400).send("Invalid payload");
    }

    const phoneRaw = data.from;
    const text = data.message; // ⚠️ NOT "text"

    if (!phoneRaw || !text) {
      console.error("❌ Missing 'from' or 'message' in payload");
      return res.status(400).send("Missing required fields");
    }

    const phone = normalizePhone(phoneRaw);
    console.log(`📞 Processing message from ${phone}: "${text}"`);

    // ✅ CORRECT AUTHORIZATION: Bearer token
    const convoRes = await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/conversations`,
      {
        source_id: phone,
        inbox_id: Number(process.env.INBOX_ID),
        contact: {
          phone_number: phone
        }
      },
      {
        headers: {
  Authorization: `Bearer ${CHATWOOT_TOKEN}`, // ✅ NOT process.env
  "Content-Type": "application/json"
}
      }
    );

    const conversationId = convoRes.data.id;

    // Add incoming message
    await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/conversations/${conversationId}/messages`,
      {
        content: text,
        message_type: "incoming"
      },
      {
        headers: {
  Authorization: `Bearer ${CHATWOOT_TOKEN}`, // ✅ NOT process.env
  "Content-Type": "application/json"
}
      }
    );

    console.log(`✅ Message from ${phone} added to Chatwoot`);
    res.sendStatus(200);
  } catch (e) {
    console.error("❌ SlickText → Chatwoot error:", e.response?.data || e.message);
    res.status(500).send("Processing failed");
  }
});

/* 🔼 Chatwoot → SlickText (Outgoing reply) */
app.post("/chatwoot", async (req, res) => {
  try {
    // Only handle outgoing agent messages
    if (req.body.private !== false || req.body.message_type !== "outgoing") {
      return res.sendStatus(200);
    }

    const text = req.body.content;
    const phoneRaw = req.body.conversation?.contact?.phone_number;

    if (!text || !phoneRaw) {
      return res.status(400).send("Missing content or phone");
    }

    const phone = normalizePhone(phoneRaw);
    console.log(`📤 Outgoing reply to ${phone}: "${text}"`);

    // ⚠️ COMMENTED OUT TO AVOID REAL SMS DURING TESTING
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

    console.log("✅ Outgoing handled (SMS sending disabled)");
    res.sendStatus(200);
  } catch (e) {
    console.error("❌ Chatwoot → SlickText error:", e.response?.data || e.message);
    res.status(500).send("Send failed");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

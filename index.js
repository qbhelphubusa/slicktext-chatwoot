import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

function normalizePhone(phone) {
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("1")) clean = "1" + clean;
  return "+" + clean;
}

/* 🔽 SlickText → Chatwoot */
app.post("/slicktext", async (req, res) => {
  console.log("📩 Received payload:", req.body);

  try {
    const phoneRaw =
      req.body.from ||
      req.body.data?.from;

    const text =
      req.body.text ||
      req.body.message ||
      req.body.data?.message;

    if (!phoneRaw || !text) {
      console.warn("⚠️ Missing phone or text");
      return res.status(400).send("Invalid payload");
    }

    const phone = normalizePhone(phoneRaw);

    /* 1️⃣ Create conversation (Chatwoot auto-creates contact) */
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
          api_access_token: process.env.CHATWOOT_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    const conversationId = convoRes.data.id;

    /* 2️⃣ Add incoming message */
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

    console.log(`✅ Message added for ${phone}`);
    res.sendStatus(200);
  } catch (e) {
    console.error("❌ SlickText → Chatwoot error:", e.response?.data || e.message);
    res.status(500).send("Processing failed");
  }
});

/* 🔼 Chatwoot → SlickText */
app.post("/chatwoot", async (req, res) => {
  try {
    if (req.body.private || req.body.message_type !== "outgoing") {
      return res.sendStatus(200);
    }

    const text = req.body.content;
    const phoneRaw = req.body.conversation?.contact?.phone_number;

    if (!text || !phoneRaw) return res.sendStatus(200);

    const phone = normalizePhone(phoneRaw);

    console.log(`📤 Outgoing reply to ${phone}: ${text}`);

    // SAFE MODE (SMS disabled)
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
  } catch (e) {
    console.error("❌ Chatwoot → SlickText error:", e.response?.data || e.message);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running");
});

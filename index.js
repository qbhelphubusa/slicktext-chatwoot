// index.js
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Utility: Normalize phone number (US format assumed)
function normalizePhone(phone) {
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("1")) clean = "1" + clean;
  return "+" + clean;
}

/* 🔽 SlickText → Chatwoot (Incoming SMS) */
app.post("/slicktext", async (req, res) => {
  console.log("📩 Received payload:", JSON.stringify(req.body)); // Debug log

  try {
    const { event, data } = req.body;

    // Validate SlickText webhook format
    if (event !== "message.received" || !data) {
      console.warn("⚠️ Invalid event or missing data");
      return res.status(400).send("Invalid payload");
    }

    const rawPhone = data.from;
    const text = data.message;
    if (!rawPhone || !text) {
      console.error("❌ Missing 'from' or 'message' in payload");
      return res.status(400).send("Missing required fields");
    }

    const phone = normalizePhone(rawPhone);
    console.log(`📞 Processing message from ${phone}: "${text}"`);

    // Step 1: Search contact in Chatwoot
    let contactId;
    try {
      const searchRes = await axios.get(
        `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/contacts/search`,
        {
          headers: { Authorization: `Bearer ${process.env.CHATWOOT_TOKEN}` },
          params: { q: phone }
        }
      );
      if (searchRes.data.payload.length > 0) {
        contactId = searchRes.data.payload[0].id;
      }
    } catch (e) {
      console.error("🔍 Contact search failed:", e.message);
    }

    // Step 2: Create contact if not found
    if (!contactId) {
      console.log("🆕 Creating new contact...");
      const createRes = await axios.post(
        `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/contacts`,
        {
          inbox_id: Number(process.env.INBOX_ID),
          contact: { phone_number: phone }
        },
        { headers: { Authorization: `Bearer ${process.env.CHATWOOT_TOKEN}` } }
      );
      contactId = createRes.data.id;
    }

    // Step 3: Create conversation
    console.log("💬 Creating conversation...");
    const convoRes = await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/conversations`,
      {
        source_id: phone,
        inbox_id: Number(process.env.INBOX_ID),
        contact_id: contactId
      },
      { headers: { Authorization: `Bearer ${process.env.CHATWOOT_TOKEN}` } }
    );
    const conversationId = convoRes.data.id;

    // Step 4: Add incoming message
    console.log("📥 Adding message to conversation...");
    await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/conversations/${conversationId}/messages`,
      {
        content: text,
        message_type: "incoming"
      },
      { headers: { Authorization: `Bearer ${process.env.CHATWOOT_TOKEN}` } }
    );

    console.log(`✅ Success: Message from ${phone} added to Chatwoot`);
    res.sendStatus(200);
  } catch (e) {
    console.error("❌ Full error:", e.response?.data || e.message);
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
    const rawPhone = req.body.conversation?.contact?.phone_number;
    if (!text || !rawPhone) {
      return res.status(400).send("Missing content or phone");
    }

    const phone = normalizePhone(rawPhone);
    console.log(`📤 Sending reply to ${phone}: "${text}"`);

    // ⚠️ COMMENT THIS OUT FOR SAFE TESTING (to avoid real SMS)
    /*
    await axios.post(
      "https://api.slicktext.com/v1/messages/send",
      { to: phone, message: text },
      { headers: { Authorization: `Bearer ${process.env.SLICKTEXT_API_KEY}` } }
    );
    */

    console.log("✅ Outgoing message handled (SMS sending disabled for test)");
    res.sendStatus(200);
  } catch (e) {
    console.error("❌ Outgoing error:", e.response?.data || e.message);
    res.status(500).send("Send failed");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

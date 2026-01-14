import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Utility: Normalize phone (remove non-digits, ensure starts with +)
function normalizePhone(phone) {
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("1")) clean = "1" + clean; // US assumption
  return "+" + clean;
}

/* 🔽 SlickText → Chatwoot (Incoming SMS) */
app.post("/slicktext", async (req, res) => {
  try {
    const { event, data } = req.body;

    if (event !== "message.received" || !data) {
      console.warn("⚠️ Not a message.received event:", req.body);
      return res.status(400).send("Unsupported event");
    }

    const rawPhone = data.from;
    const text = data.message;
    const phone = normalizePhone(rawPhone);

    if (!phone || !text) {
      console.error("❌ Missing phone or message:", data);
      return res.status(400).send("Invalid payload");
    }

    // Step 1: Create or find contact
    const contactRes = await axios.get(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/contacts/search`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CHATWOOT_TOKEN}`,
          "Content-Type": "application/json"
        },
        params: { q: phone }
      }
    );

    let contactId;
    if (contactRes.data.payload.length > 0) {
      contactId = contactRes.data.payload[0].id;
    } else {
      // Create new contact
      const newContact = await axios.post(
        `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/contacts`,
        {
          inbox_id: Number(process.env.INBOX_ID),
          contact: {
            phone_number: phone
          }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.CHATWOOT_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );
      contactId = newContact.data.id;
    }

    // Step 2: Find or create conversation
    const convoRes = await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/conversations`,
      {
        source_id: phone,
        inbox_id: Number(process.env.INBOX_ID),
        contact_id: contactId
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHATWOOT_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    const conversationId = convoRes.data.id;

    // Step 3: Add incoming message
    await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/conversations/${conversationId}/messages`,
      {
        content: text,
        message_type: "incoming"
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHATWOOT_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(`✅ Incoming SMS from ${phone} added to Chatwoot`);
    res.sendStatus(200);
  } catch (e) {
    console.error("❌ SlickText → Chatwoot error:", e.response?.data || e.message);
    res.status(500).send("Error processing message");
  }
});

/* 🔼 Chatwoot → SlickText (Outgoing reply) */
app.post("/chatwoot", async (req, res) => {
  try {
    // Only handle outgoing messages from agents
    if (req.body.private !== false || req.body.message_type !== "outgoing") {
      return res.sendStatus(200); // Ignore private/internal messages
    }

    const text = req.body.content;
    const rawPhone = req.body.conversation?.contact?.phone_number;

    if (!text || !rawPhone) {
      console.warn("⚠️ Missing content or phone in Chatwoot webhook");
      return res.status(400).send("Missing data");
    }

    const phone = normalizePhone(rawPhone);

    // Send via SlickText API
    const slickRes = await axios.post(
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

    console.log(`✅ Message sent to ${phone} via SlickText`, slickRes.data);
    res.sendStatus(200);
  } catch (e) {
    console.error("❌ Chatwoot → SlickText error:", e.response?.data || e.message);
    res.status(500).send("Failed to send SMS");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running on port", process.env.PORT || 3000);
});

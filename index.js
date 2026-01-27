const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();

// SlickText sends x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

/**
 * ================================
 * SlickText → Chatwoot
 * Incoming SMS webhook
 * ================================
 */
app.post("/slicktext", async (req, res) => {
  try {
    console.log("📩 SlickText Incoming:", req.body);

    // SlickText typical fields
    const from = req.body.from || req.body.phone || req.body.From;
    const text = req.body.text || req.body.message || req.body.body;

    if (!from || !text) {
      console.log("❌ Missing from/text");
      return res.sendStatus(200);
    }

    // Create / send message to Chatwoot
    await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/conversations`,
      {
        source_id: from,
        inbox_id: process.env.CHATWOOT_INBOX_ID,
        messages: [
          {
            content: text,
            message_type: "incoming"
          }
        ]
      },
      {
        headers: {
          api_access_token: process.env.CHATWOOT_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Message sent to Chatwoot");
    res.sendStatus(200);
  } catch (error) {
    console.error("🔥 SlickText → Chatwoot Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

/**
 * ================================
 * Chatwoot → SlickText
 * Outgoing agent reply webhook
 * ================================
 */
app.post("/chatwoot", async (req, res) => {
  try {
    console.log("📤 Chatwoot Event:", req.body);

    const message = req.body.message;

    // Only send outgoing agent messages
    if (!message || message.message_type !== "outgoing") {
      return res.sendStatus(200);
    }

    const phone =
      req.body.conversation?.contact?.phone_number ||
      req.body.conversation?.contact?.identifier;

    const text = message.content;

    if (!phone || !text) {
      console.log("❌ Missing phone/text");
      return res.sendStatus(200);
    }

    // Send SMS via SlickText API
    await axios.post(
      "https://api.slicktext.com/v1/messages",
      {
        to: phone,
        message: text
      },
      {
        auth: {
          username: process.env.SLICKTEXT_PUBLIC_KEY,
          password: process.env.SLICKTEXT_PRIVATE_KEY
        },
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ SMS sent via SlickText");
    res.sendStatus(200);
  } catch (error) {
    console.error("🔥 Chatwoot → SlickText Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

/**
 * ================================
 * Health check
 * ================================
 */
app.get("/", (req, res) => {
  res.send("🚀 SlickText ↔ Chatwoot webhook running");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

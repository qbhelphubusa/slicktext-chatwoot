const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();

// SlickText sends form-data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

/**
 * ================================
 * CONFIG
 * ================================
 */
const AUTO_REPLY_ENABLED = true; // 🔁 bot on/off
const OFFICE_START = 10; // 10 AM
const OFFICE_END = 19;   // 7 PM

/**
 * ================================
 * HELPERS
 * ================================
 */
function isOfficeOpen() {
  const hour = new Date().getHours();
  return hour >= OFFICE_START && hour < OFFICE_END;
}

/**
 * ================================
 * HEALTH CHECK
 * ================================
 */
app.get("/", (req, res) => {
  res.send("🚀 SlickText ↔ Chatwoot webhook running (clean pro)");
});

/**
 * ================================
 * SLICKTEXT → CHATWOOT
 * Incoming SMS
 * ================================
 */
app.post("/slicktext", async (req, res) => {
  try {
    console.log("📩 SlickText Incoming:", req.body);

    const from =
      req.body.from ||
      req.body.phone ||
      req.body.From;

    const text =
      req.body.text ||
      req.body.message ||
      req.body.body;

    if (!from || !text) {
      console.log("❌ Missing from/text");
      return res.sendStatus(200);
    }

    // 1️⃣ Push message into Chatwoot
    const convo = await axios.post(
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

    console.log("✅ SMS pushed to Chatwoot");

    // 2️⃣ Auto-reply (only if enabled & office closed)
    if (AUTO_REPLY_ENABLED && !isOfficeOpen()) {
      const reply = `👋 Thanks for reaching out!

Our office hours are:
🕙 10 AM – 7 PM

An agent will reply as soon as we’re available 🙏`;

      await axios.post(
        `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/conversations/${convo.data.id}/messages`,
        { content: reply },
        {
          headers: {
            api_access_token: process.env.CHATWOOT_API_KEY,
            "Content-Type": "application/json"
          }
        }
      );

      console.log("🤖 Auto-reply sent (office closed)");
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("🔥 SlickText → Chatwoot Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

/**
 * ================================
 * CHATWOOT → SLICKTEXT
 * Agent Reply → SMS
 * ================================
 */
app.post("/chatwoot", async (req, res) => {
  try {
    console.log("📤 Chatwoot Event");

    const message = req.body.message;

    // 🔁 Only agent outgoing messages
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

    console.log("✅ Agent reply sent via SMS");
    res.sendStatus(200);
  } catch (error) {
    console.error("🔥 Chatwoot → SlickText Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

/**
 * ================================
 * START SERVER
 * ================================
 */
app.listen(PORT, () => {
  console.log(`🚀 Server live on port ${PORT}`);
});

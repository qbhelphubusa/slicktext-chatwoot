import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// =======================
// ENV VARIABLES
// =======================
const CHATWOOT_TOKEN = process.env.CHATWOOT_TOKEN;
const CHATWOOT_BASE_URL = process.env.CHATWOOT_BASE_URL || "https://app.chatwoot.com";

// =======================
// HEALTH CHECK
// =======================
app.get("/", (req, res) => {
  res.send("Chatwoot + SlickText webhook live 🚀");
});

// =======================
// CHATWOOT WEBHOOK
// URL: /chatwoot
// =======================
app.post("/chatwoot", async (req, res) => {
  const payload = req.body;

  try {
    // 🔁 Ignore outgoing messages (loop prevention)
    if (payload.message_type !== "incoming") {
      return res.sendStatus(200);
    }

    const messageText = payload.content || "";
    const conversationId = payload.conversation.id;
    const accountId = payload.account.id;

    // ✨ Default slick reply
    let reply = `👋 *Welcome!*

Thanks for contacting us 😊  
How can we help you today?

1️⃣ Sales & Pricing  
2️⃣ Support  
3️⃣ General Question  

Reply with a number 👇`;

    const lowerMsg = messageText.toLowerCase().trim();

    if (lowerMsg.includes("price") || lowerMsg.includes("pricing")) {
      reply = `💰 *Pricing Information*

Our pricing depends on your needs.
Please share:
• Service required
• Timeline
• Budget range`;
    } else if (lowerMsg === "1") {
      reply = `📞 *Sales Team*

Great choice!
Please share:
• Company name
• Requirement summary`;
    } else if (lowerMsg === "2") {
      reply = `🛠 *Support*

Please describe your issue in detail.
Screenshots are welcome 👍`;
    } else if (lowerMsg === "3") {
      reply = `ℹ️ *General Inquiry*

Sure! Please tell us your question 😊`;
    }

    // 🚀 Send reply to Chatwoot
    await axios.post(
      `${CHATWOOT_BASE_URL}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
      { content: reply },
      {
        headers: {
          api_access_token: CHATWOOT_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    res.sendStatus(200);
  } catch (error) {
    console.error("Chatwoot webhook error:", error.message);
    res.sendStatus(500);
  }
});

// =======================
// SLICKTEXT WEBHOOK
// URL: /slicktext
// =======================
app.post("/slicktext", async (req, res) => {
  try {
    // SlickText incoming SMS payload
    const phone = req.body.from;
    const text = req.body.message;

    console.log("📩 SlickText Incoming SMS:", phone, text);

    // (Future: yahan SMS ko Chatwoot me push kar sakte ho)

    res.sendStatus(200);
  } catch (error) {
    console.error("SlickText webhook error:", error.message);
    res.sendStatus(500);
  }
});

// =======================
// START SERVER (Railway)
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

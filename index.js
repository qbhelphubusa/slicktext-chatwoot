import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// ENV variables (Railway se aayenge)
const CHATWOOT_TOKEN = process.env.CHATWOOT_TOKEN;
const CHATWOOT_BASE_URL = process.env.CHATWOOT_BASE_URL || "https://app.chatwoot.com";

// Health check
app.get("/", (req, res) => {
  res.send("Chatwoot webhook live 🚀");
});

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  const payload = req.body;

  try {
    // 🔁 Outgoing messages ignore (loop prevention)
    if (payload.message_type !== "incoming") {
      return res.sendStatus(200);
    }

    const messageText = payload.content || "";
    const conversationId = payload.conversation.id;
    const accountId = payload.account.id;

    // ✨ Slick default reply
    let reply = `👋 *Welcome!*

Thanks for contacting us 😊  
How can we help you today?

1️⃣ Sales & Pricing  
2️⃣ Support  
3️⃣ General Question  

Reply with a number 👇`;

    // 🔍 Simple keyword logic
    const lowerMsg = messageText.toLowerCase();

    if (lowerMsg.includes("price") || lowerMsg.includes("pricing")) {
      reply = `💰 *Pricing Information*

Our pricing depends on your needs.
Please tell us:
• Service required
• Timeline
• Budget range`;
    }

    if (lowerMsg === "1") {
      reply = `📞 *Sales Team*

Great! Our sales team will contact you shortly.
Meanwhile, please share:
• Company name
• Requirement summary`;
    }

    if (lowerMsg === "2") {
      reply = `🛠 *Support*

Please describe your issue in detail.
Screenshots are welcome 👍`;
    }

    if (lowerMsg === "3") {
      reply = `ℹ️ *General Inquiry*

Sure! Please tell us your question 😊`;
    }

    // 🚀 Send message back to Chatwoot
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
    console.error("Webhook error:", error.message);
    res.sendStatus(500);
  }
});

// Railway PORT support
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

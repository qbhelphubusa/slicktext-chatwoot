import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const CHATWOOT_TOKEN = process.env.CHATWOOT_TOKEN;
const CHATWOOT_BASE_URL = "https://app.chatwoot.com";

app.post("/webhook", async (req, res) => {
  const payload = req.body;

  // Prevent reply loops
  if (payload.message_type !== "incoming") {
    return res.sendStatus(200);
  }

  const message = payload.content || "";
  const conversationId = payload.conversation.id;
  const accountId = payload.account.id;

  let reply = `👋 Hey there!

Thanks for reaching out 😊  
How can we help you today?`;

  if (message.toLowerCase().includes("price")) {
    reply = `💰 *Pricing info*

Our pricing depends on your needs.
Could you tell us:
• What service you need?
• Timeline?
• Budget range?`;
  }

  try {
    await axios.post(
      `${CHATWOOT_BASE_URL}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
      { content: reply },
      {
        headers: {
          api_access_token: CHATWOOT_TOKEN
        }
      }
    );
  } catch (err) {
    console.error("Chatwoot API error:", err.message);
  }

  res.sendStatus(200);
});

app.get("/", (_, res) => {
  res.send("Chatwoot webhook live 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Webhook listening on port ${PORT}`)
);

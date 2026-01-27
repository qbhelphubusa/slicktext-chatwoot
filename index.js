import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

/**
 * SlickText → Chatwoot (API Inbox)
 */
app.post("/slicktext", async (req, res) => {
  try {
    console.log("📩 SlickText Incoming:", req.body);

    const data = req.body?.data;
    if (!data) return res.status(200).send("OK");

    // Only incoming SMS
    if (data.last_message_direction !== "incoming") {
      return res.status(200).send("OK");
    }

    const messageText = data.last_message;
    const contactId = data._contact_id;

    if (!messageText || !contactId) {
      console.log("❌ Missing message or contact");
      return res.status(200).send("OK");
    }

    // VERY IMPORTANT: unique sender
    const sourceId = `slicktext-${contactId}`;

    console.log("➡️ Sending message to Chatwoot…");

    const response = await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/inboxes/${process.env.CHATWOOT_INBOX_ID}/messages`,
      {
        content: messageText,
        source_id: sourceId
      },
      {
        headers: {
          api_access_token: process.env.CHATWOOT_API_KEY
        }
      }
    );

    console.log("✅ Chatwoot response:", response.status);
    res.status(200).send("OK");

  } catch (err) {
    console.error(
      "🔥 Chatwoot Error:",
      err?.response?.status,
      err?.response?.data || err.message
    );
    res.status(200).send("OK");
  }
});

app.get("/", (_, res) => res.send("Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on ${PORT}`)
);

import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

/**
 * SlickText → Chatwoot (API Inbox – CORRECT WAY)
 */
app.post("/slicktext", async (req, res) => {
  try {
    console.log("📩 SlickText Incoming:", JSON.stringify(req.body, null, 2));

    const data = req.body?.data;
    if (!data) {
      console.log("❌ No data object");
      return res.status(200).send("OK");
    }

    // Only incoming SMS
    if (data.last_message_direction !== "incoming") {
      console.log("↩️ Outgoing message ignored");
      return res.status(200).send("OK");
    }

    const messageText = data.last_message;
    const contactId = data._contact_id;

    if (!messageText || !contactId) {
      console.log("❌ Missing messageText or contactId");
      return res.status(200).send("OK");
    }

    // UNIQUE sender for API inbox (MOST IMPORTANT)
    const sourceId = `slicktext-${contactId}`;

    console.log("➡️ Creating conversation in Chatwoot…");

    const response = await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/conversations`,
      {
        inbox_id: Number(process.env.CHATWOOT_INBOX_ID),
        source_id: sourceId,
        messages: [
          {
            content: messageText,
            message_type: "incoming"
          }
        ]
      },
      {
        headers: {
          api_access_token: process.env.CHATWOOT_API_KEY
        }
      }
    );

    console.log("✅ Chatwoot OK:", response.status);
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});

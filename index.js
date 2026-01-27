import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

/**
 * SlickText → Chatwoot
 */
app.post("/slicktext", async (req, res) => {
  try {
    console.log("📩 SlickText Incoming:", req.body);

    const data = req.body?.data;
    if (!data) {
      console.log("❌ No data object");
      return res.status(200).send("OK");
    }

    const messageText = data.last_message;
    const direction = data.last_message_direction;
    const contactId = data._contact_id;

    // Only incoming SMS
    if (direction !== "incoming") {
      return res.status(200).send("OK");
    }

    if (!messageText || !contactId) {
      console.log("❌ Missing message or contact");
      return res.status(200).send("OK");
    }

    // Fake sender mapping (important)
    const senderIdentifier = `slicktext-${contactId}`;

    // Create message in Chatwoot
    await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/conversations`,
      {
        inbox_id: Number(process.env.CHATWOOT_INBOX_ID),
        source_id: senderIdentifier,
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

    console.log("✅ Message sent to Chatwoot");
    res.status(200).send("OK");
  } catch (err) {
    console.error("🔥 Error:", err?.response?.data || err.message);
    res.status(200).send("OK");
  }
});

app.get("/", (_, res) => res.send("Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on ${PORT}`)
);

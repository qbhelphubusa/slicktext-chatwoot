import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

/**
 * SlickText (or Talent API Tester) → Chatwoot
 */
app.post("/slicktext", async (req, res) => {
  console.log("📩 Incoming /slicktext payload:", req.body);

  try {
    // Accept multiple payload formats (Talent tester + real SlickText)
    const phone =
      req.body.from ||
      req.body.data?.from;

    const text =
      req.body.text ||
      req.body.message ||
      req.body.data?.message;

    if (!phone || !text) {
      console.error("❌ Invalid payload");
      return res.sendStatus(400);
    }

    await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/messages`,
      {
        inbox_id: Number(process.env.INBOX_ID),
        source_id: phone,
        content: text,
        message_type: "incoming"
      },
      {
        headers: {
          api_access_token: process.env.CHATWOOT_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Message sent to Chatwoot:", phone, text);
    res.sendStatus(200);
  } catch (e) {
    console.error(
      "❌ SlickText → Chatwoot error:",
      e.response?.data || e.message
    );
    res.sendStatus(500);
  }
});

/**
 * Chatwoot → SlickText
 */
app.post("/chatwoot", async (req, res) => {
  console.log("📤 Incoming /chatwoot payload:", req.body);

  try {
    // Only outgoing agent messages
    if (req.body.message_type !== "outgoing") {
      return res.sendStatus(200);
    }

    const text = req.body.content;
    const phone =
      req.body.conversation?.meta?.sender?.phone_number;

    if (!phone || !text) return res.sendStatus(200);

    // ⚠️ Uncomment ONLY when you want to send real SMS
    /*
    await axios.post(
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
    */

    console.log("📨 SMS would be sent to:", phone, text);
    res.sendStatus(200);
  } catch (e) {
    console.error(
      "❌ Chatwoot → SlickText error:",
      e.response?.data || e.message
    );
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running on port", process.env.PORT || 3000);
});

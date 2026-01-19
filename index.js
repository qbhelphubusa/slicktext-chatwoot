require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

/**
 * Chatwoot → SlickText
 */
app.post("/chatwoot/webhook", async (req, res) => {
  try {
    const event = req.body;

    // Only agent messages
    if (event.message_type !== "outgoing") {
      return res.sendStatus(200);
    }

    const phone = event.conversation?.meta?.sender?.phone_number;
    const message = event.content;

    if (!phone || !message) {
      return res.sendStatus(200);
    }

    await axios.post(
      "https://api.slicktext.com/v1/messages",
      {
        accountId: process.env.SLICKTEXT_ACCOUNT_ID,
        to: phone,
        body: message
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SLICKTEXT_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.sendStatus(500);
  }
});

/**
 * SlickText → Chatwoot (Incoming SMS)
 */
app.post("/slicktext/webhook", async (req, res) => {
  try {
    const { from, body } = req.body;

    await axios.post(
      `${process.env.CHATWOOT_BASE_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/conversations/${process.env.CHATWOOT_CONVERSATION_ID}/messages`,
      {
        content: body,
        message_type: "incoming"
      },
      {
        headers: {
          api_access_token: process.env.CHATWOOT_API_TOKEN
        }
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Middleware running");
});

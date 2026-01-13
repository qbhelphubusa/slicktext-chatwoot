import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

/* SlickText → Chatwoot */
app.post("/slicktext", async (req, res) => {
  try {
    const phone = req.body.from;
    const text = req.body.message;

    await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/conversations`,
      {
        source_id: phone,
        inbox_id: Number(process.env.INBOX_ID),
        contact: { phone_number: phone },
        messages: [{ content: text, message_type: "incoming" }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHATWOOT_TOKEN}`
        }
      }
    );

    res.sendStatus(200);
  } catch (e) {
    console.error(e.message);
    res.sendStatus(500);
  }
});

/* Chatwoot → SlickText */
app.post("/chatwoot", async (req, res) => {
  try {
    const text = req.body.content;
    const phone = req.body.conversation.contact.phone_number;

    await axios.post(
      "https://api.slicktext.com/v1/messages/send",
      { to: phone, message: text },
      {
        headers: {
          Authorization: `Bearer ${process.env.SLICKTEXT_API_KEY}`
        }
      }
    );

    res.sendStatus(200);
  } catch (e) {
    console.error(e.message);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 3000);

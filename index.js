import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

app.post("/slicktext-webhook", async (req, res) => {
  const sms = req.body;

  await fetch(
    `${process.env.CHATWOOT_URL}/api/v1/inboxes/${process.env.INBOX_ID}/contacts/${sms.phone}/conversations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_access_token: process.env.CHATWOOT_TOKEN,
      },
      body: JSON.stringify({
        source_id: sms.phone,
        messages: [
          {
            content: sms.message,
            message_type: "incoming",
          },
        ],
      }),
    }
  );

  res.status(200).send("OK");
});

app.listen(process.env.PORT || 3000);

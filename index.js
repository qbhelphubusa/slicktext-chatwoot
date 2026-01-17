import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

function normalizePhone(phone) {
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("1")) clean = "1" + clean;
  return "+" + clean;
}

app.post("/slicktext", async (req, res) => {
  console.log("📩 Received payload:", JSON.stringify(req.body));

  try {
    const { event, data } = req.body;
    if (event !== "message.received") return res.sendStatus(200);

    const phone = normalizePhone(data.from);
    const text = data.message;

    console.log(`📞 Incoming SMS from ${phone}: ${text}`);

    await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/accounts/${process.env.ACCOUNT_ID}/conversations`,
      {
        inbox_id: Number(process.env.INBOX_ID),
        source_id: `slicktext_${phone}`,
        contact: { phone_number: phone },
        message: { content: text }
      },
      {
        headers: {
          api_access_token: process.env.CHATWOOT_TOKEN,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      }
    );

    console.log("✅ Sent to Chatwoot");
    res.sendStatus(200);

  } catch (err) {
    console.error(
      "❌ SlickText → Chatwoot error:",
      err.response?.data || err.message
    );
    res.sendStatus(500);
  }
});

app.post("/chatwoot", async (req, res) => {
  try {
    if (req.body.message_type !== "outgoing" || req.body.private) {
      return res.sendStatus(200);
    }

    const phone = normalizePhone(
      req.body.conversation?.contact?.phone_number
    );
    const text = req.body.content;

    console.log(`📤 Agent reply to ${phone}: ${text}`);
    res.sendStatus(200);

  } catch (err) {
    console.error("❌ Chatwoot → SlickText error:", err.message);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("🚀 Server running");
});

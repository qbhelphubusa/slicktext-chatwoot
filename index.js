import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

function normalizePhone(phone) {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("1")) clean = "1" + clean;
  return "+" + clean;
}

app.get("/", (req, res) => {
  res.send("OK");
});

/**
 * SlickText → Chatwoot (API Inbox)
 */
app.post("/slicktext", async (req, res) => {
  console.log("📩 Received payload:", JSON.stringify(req.body));

  try {
    const { event, data } = req.body;
    if (event !== "message.received") return res.sendStatus(200);

    const phone = normalizePhone(data.from);
    const text = data.message;

    console.log(`📞 Incoming SMS from ${phone}: ${text}`);

    await axios.post(
      `${process.env.CHATWOOT_URL}/api/v1/inboxes/${process.env.INBOX_IDENTIFIER}/contacts/${phone}/messages`,
      {
        content: text,
        message_type: "incoming"
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Message sent to Chatwoot API Inbox");
    res.sendStatus(200);

  } catch (err) {
    console.error(
      "❌ SlickText → Chatwoot error:",
      err.response?.data || err.message
    );
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("🚀 Server running");
});

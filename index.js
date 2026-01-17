import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Railway health check
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

function normalizePhone(phone) {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("1")) clean = "1" + clean;
  return clean; // ❗ no +
}

app.post("/slicktext", async (req, res) => {
  console.log("📩 Received payload:", JSON.stringify(req.body));

  try {
    const { event, data } = req.body;
    if (event !== "message.received") {
      return res.sendStatus(200);
    }

    const phone = normalizePhone(data.from);
    const text = data.message;

    console.log(`📞 Incoming SMS from ${phone}: ${text}`);

    const url = `${process.env.CHATWOOT_URL}/api/v1/inboxes/${process.env.INBOX_IDENTIFIER}/contacts/${encodeURIComponent(phone)}/messages`;

    await axios.post(
      url,
      {
        content: text
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

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

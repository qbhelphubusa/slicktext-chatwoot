import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// 🔹 Health check (Railway needs this)
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

function normalizePhone(phone) {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("1")) clean = "1" + clean;
  return "+" + clean;
}

// 🔹 SlickText → Chatwoot
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

    console.log("✅ Message sent to Chatwoot");
    res.sendStatus(200);

  } catch (err) {
    console.error(
      "❌ SlickText → Chatwoot error:",
      err.response?.data || err.message
    );
    res.sendStatus(500);
  }
});

// 🔹 IMPORTANT: Railway PORT
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

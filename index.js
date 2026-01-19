import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

function normalizePhone(phone) {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("1")) clean = "1" + clean;
  return `+${clean}`;
}

app.post("/slicktext", async (req, res) => {
  console.log("📩 SlickText payload:", JSON.stringify(req.body, null, 2));

  try {
    const { event, data } = req.body;

    // SlickText sends "incoming_message"
    if (event !== "incoming_message") {
      return res.sendStatus(200);
    }

    const phone = normalizePhone(data.from);
    const text = data.body;

    if (!phone || !text) {
      console.log("⚠️ Missing phone or text");
      return res.sendStatus(200);
    }

    console.log(`📞 SMS from ${phone}: ${text}`);

    const url = `${process.env.CHATWOOT_URL}/api/v1/inboxes/${process.env.INBOX_IDENTIFIER}/messages`;

    await axios.post(
      url,
      {
        source_id: phone,   // REQUIRED
        content: text
      },
      {
        headers: {
          "Content-Type": "application/json",
          api_access_token: process.env.CHATWOOT_API_TOKEN
        }
      }
    );

    console.log("✅ Message delivered to Chatwoot");
    res.sendStatus(200);

  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

console.log("🧪 Starting test: ONLY requiring redactPdf");

try {
  const { redactPdf } = require('../redactPdf');
  console.log("✅ redactPdf loaded");
} catch (err) {
  console.error("❌ redactPdf failed to load:", err);
}

const express = require('express');
const app = express();
app.listen(5000, () => {
  console.log("📦 Test server listening");
});

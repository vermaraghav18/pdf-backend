const os = require('os');
console.log("🧪 Starting test: ONLY requiring pdfUtils");

try {
  require('../pdfUtils');
  console.log("✅ pdfUtils loaded");
} catch (err) {
  console.log("❌ pdfUtils failed:", err.message);
}

const express = require("express");
const app = express();
app.listen(5000, () => console.log("🚀 Test server listening"));

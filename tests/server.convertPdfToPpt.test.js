// server.convertPdfToPpt.test.js
console.log("🧪 Starting test: ONLY requiring convertPdfToPpt");

try {
  const { convertPdfToPpt } = require('../pdfToPpt');
  console.log("✅ convertPdfToPpt loaded");
} catch (err) {
  console.error("❌ Failed to load convertPdfToPpt");
  console.error(err);
}

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('🧪 Test server for convertPdfToPpt is running.');
});

app.listen(5000, () => {
  console.log("🚀 Test server listening");
});

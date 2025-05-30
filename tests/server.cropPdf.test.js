console.log("🧪 Starting test: ONLY requiring cropPdf");
const { cropPdf } = require('../cropPdf');
console.log("✅ cropPdf loaded");

const express = require('express');
const app = express();

app.listen(5000, () => {
  console.log("🧪 Test server listening");
});

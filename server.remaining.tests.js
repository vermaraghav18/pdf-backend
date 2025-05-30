// ✅ server.remaining.tests.js
console.log("🧪 Requiring editPdf");
try {
  const { editPdf } = require('./editPdf');
  console.log("✅ editPdf loaded");
} catch (e) {
  console.error("❌ editPdf failed", e);
}

console.log("🧪 Requiring organizePdf");
try {
  const { organizePdf } = require('./organizePdf');
  console.log("✅ organizePdf loaded");
} catch (e) {
  console.error("❌ organizePdf failed", e);
}

console.log("🧪 Requiring imageSizeHelper");
try {
  require('./utils/imageSizeHelper');
  console.log("✅ imageSizeHelper loaded");
} catch (e) {
  console.error("❌ imageSizeHelper failed", e);
}

console.log("🧪 Requiring watermarkPdf");
try {
  require('./utils/watermarkPdf');
  console.log("✅ watermarkPdf loaded");
} catch (e) {
  console.error("❌ watermarkPdf failed", e);
}

console.log("🧪 Requiring coordinateUtils");
try {
  require('./utils/coordinateUtils');
  console.log("✅ coordinateUtils loaded");
} catch (e) {
  console.error("❌ coordinateUtils failed", e);
}

// Final test server
const express = require('express');
const app = express();
app.listen(5000, () => console.log("🟢 Test server running on port 5000"));

console.log("🧪 Starting debug test: convertPdfToPpt");

try {
  const convertPdfToPpt = require('./pdfToPpt');
  console.log("✅ convertPdfToPpt required successfully");
} catch (err) {
  console.error("❌ Error requiring convertPdfToPpt");
  console.error(err.stack);
}

console.log("🧪 Debug test finished.");

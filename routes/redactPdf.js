// routes/redactPdf.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PDFDocument, rgb } = require('pdf-lib');

const router = express.Router();

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Redaction logic
async function redactPdf(inputPath, outputPath, redactions) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  for (const { pageIndex, x, y, width, height } of redactions) {
    const page = pdfDoc.getPage(pageIndex);
    const { height: pageHeight } = page.getSize();

    page.drawRectangle({
      x,
      y: pageHeight - y - height, // Convert from bottom-left to top-left origin
      width,
      height,
      color: rgb(0, 0, 0), // Black rectangle
    });
  }

  const redactedBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, redactedBytes);
}

// ✅ Route handler
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, '../outputs', `redacted_${Date.now()}.pdf`);
    const redactions = JSON.parse(req.body.redactions); // expects array

    await redactPdf(inputPath, outputPath, redactions);

    res.download(outputPath, 'redacted.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error('❌ Redact PDF Error:', err.message);
    res.status(500).json({ error: 'Redaction failed' });
  }
});

module.exports = router;

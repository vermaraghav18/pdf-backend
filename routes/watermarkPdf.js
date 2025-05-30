// routes/watermarkPdf.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const router = express.Router();

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Watermark logic
async function watermarkPdf(inputPath, outputPath, watermarkText, position = 'center') {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 36;

  for (const page of pages) {
    const { width, height } = page.getSize();

    let x = width / 2 - (watermarkText.length * fontSize) / 4;
    let y = height / 2;

    if (position === 'top-left')        { x = 50; y = height - 100; }
    else if (position === 'top-right')  { x = width - 200; y = height - 100; }
    else if (position === 'bottom-left'){ x = 50; y = 50; }
    else if (position === 'bottom-right'){ x = width - 200; y = 50; }

    page.drawText(watermarkText, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.75, 0.75, 0.75),
      opacity: 0.5,
    });
  }

  const watermarkedPdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, watermarkedPdfBytes);
}

// ✅ Route handler
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, '../outputs', `watermarked_${Date.now()}.pdf`);
    const { watermarkText, position } = req.body;

    if (!watermarkText) {
      return res.status(400).json({ error: 'Missing watermarkText' });
    }

    await watermarkPdf(inputPath, outputPath, watermarkText, position);

    res.download(outputPath, 'watermarked.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error('❌ Watermark Error:', err.message);
    res.status(500).json({ error: 'Failed to apply watermark' });
  }
});

module.exports = router;

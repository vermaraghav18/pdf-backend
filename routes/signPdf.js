// routes/signPdf.js

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

// ✅ Signature logic
async function signPdf(inputPath, outputPath, signatureText, position) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPage(0);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 18;
  const { width, height } = page.getSize();

  let x = 50, y = 50;
  if (position === 'top-left')        { x = 50; y = height - 50; }
  else if (position === 'top-right')  { x = width - 200; y = height - 50; }
  else if (position === 'bottom-right') { x = width - 200; y = 50; }

  page.drawText(signatureText, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });

  const signedBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, signedBytes);
}

// ✅ Route handler
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, '../outputs', `signed_${Date.now()}.pdf`);
    const { signatureText, position } = req.body;

    if (!signatureText || !position) {
      return res.status(400).json({ error: 'Missing signatureText or position' });
    }

    await signPdf(inputPath, outputPath, signatureText, position);

    res.download(outputPath, 'signed.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error('❌ Sign PDF Error:', err.message);
    res.status(500).json({ error: 'Signing failed' });
  }
});

module.exports = router;

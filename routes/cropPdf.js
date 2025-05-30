// routes/cropPdf.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');

const router = express.Router();

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Crop logic
async function cropPdf(inputPath, outputPath, cropData) {
  const existingPdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();

  cropData.forEach(({ pageIndex, x, y, width, height }) => {
    const page = pages[pageIndex];
    if (!page) return;

    page.setCropBox(x, y, width, height);
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

// ✅ Route
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, '../outputs', `cropped_${Date.now()}.pdf`);
    const cropData = JSON.parse(req.body.cropData); // ✅ FIXED to parse JSON

    await cropPdf(inputPath, outputPath, cropData);

    res.download(outputPath, 'cropped.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error('❌ Crop PDF Error:', err.message);
    res.status(500).json({ error: 'Cropping failed' });
  }
});

module.exports = router;

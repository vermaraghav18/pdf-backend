// routes/rotatePdf.js
const express = require('express'); // ✅ ADD THIS LINE
const fs = require('fs');
const path = require('path');
const { PDFDocument, degrees } = require('pdf-lib');
const router = express.Router();

const upload = require('../uploadMiddleware').uploadPDF; // ✅ Import proper middleware

// POST /api/rotate
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { rotations } = req.body;

    if (!file || !rotations) {
      return res.status(400).json({ error: 'File and rotations required.' });
    }

    const parsedRotations = JSON.parse(rotations);
    const inputPath = file.path;
    const outputPath = path.join('test-output', 'rotate_output.pdf');

    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    parsedRotations.forEach(({ pageIndex, angle }) => {
      const page = pages[pageIndex];
      if (page) page.setRotation(degrees(angle));
    });

    const rotatedBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, rotatedBytes);

    res.download(outputPath);
  } catch (err) {
    console.error('❌ Rotate PDF Error:', err);
    res.status(500).json({ error: 'Failed to rotate PDF' });
  }
});

module.exports = router;

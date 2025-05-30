const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const router = express.Router();

// ✅ Setup multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Accept only 'files' as the field name
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length < 2) {
      return res.status(400).json({ error: 'Please upload at least two PDF files.' });
    }

    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const fileBuffer = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(fileBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    const outputBuffer = await mergedPdf.save();
    const outputPath = path.join(__dirname, '../outputs', `merged_${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, outputBuffer);

    res.download(outputPath, 'merged.pdf', () => {
      files.forEach(f => fs.unlinkSync(f.path));
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error('❌ Merge Error:', err);
    res.status(500).json({ error: 'Failed to merge PDFs' });
  }
});

module.exports = router;

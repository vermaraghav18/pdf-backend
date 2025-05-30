const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');

const router = express.Router();

// ✅ Multer setup for JPG upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

// ✅ POST /api/jpg-to-pdf - Convert multiple JPGs to PDF
router.post('/', upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).send('No files uploaded.');

    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      const jpgBytes = fs.readFileSync(file.path);
      const jpgImage = await pdfDoc.embedJpg(jpgBytes);
      const { width, height } = jpgImage.scale(1);
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(jpgImage, { x: 0, y: 0, width, height });
    }

    const pdfBytes = await pdfDoc.save();
    const outputPath = path.join(__dirname, '../outputs', `combined_${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, pdfBytes);

    res.download(outputPath, 'combined_images.pdf', (err) => {
      if (err) console.error('Download error:', err);
      setTimeout(() => {
        try {
          files.forEach(f => fs.unlinkSync(f.path));
          fs.unlinkSync(outputPath);
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }, 2000);
    });
  } catch (err) {
    console.error('JPG to PDF Error:', err);
    res.status(500).send('Error converting JPGs to PDF.');
  }
});

module.exports = router;

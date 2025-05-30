// ✅ routes/cropPdfRoute.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cropPdf } = require('../cropPdf');


// Set up Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post('/crop-pdf', upload.single('pdfFile'), async (req, res) => {
  try {
    const cropData = JSON.parse(req.body.cropData); // Array of { pageIndex, x, y, width, height }
    const inputPath = req.file.path;
    const outputPath = path.join('outputs', `cropped-${Date.now()}.pdf`);

    // Create outputs dir if it doesn't exist
    if (!fs.existsSync('outputs')) fs.mkdirSync('outputs');

    await cropPdf(inputPath, cropData, outputPath);

    res.download(outputPath, 'cropped.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  } catch (error) {
    console.error('❌ Crop PDF error:', error);
    res.status(500).json({ error: 'Failed to crop PDF' });
  }
});

module.exports = router;

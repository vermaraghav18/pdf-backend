const express = require('express');
const fs = require('fs');
const path = require('path');
const { convert } = require('pdf-poppler');
const Tesseract = require('tesseract.js');
const multer = require('multer');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const baseOutput = path.join('uploads', `ocr_page-${Date.now()}`);
    const outputImage = `${baseOutput}.png`;

    // Convert 1st page to image
    await convert(filePath, {
      format: 'png',
      out_dir: 'uploads',
      out_prefix: path.basename(baseOutput),
      page: 1,
      resolution: 200,
    });

    // OCR recognition
    const result = await Tesseract.recognize(outputImage, 'eng');
    const extracted = result.data.text;

    // Cleanup
    fs.unlinkSync(outputImage);
    fs.unlinkSync(filePath);

    res.setHeader('Content-Type', 'text/plain');
    res.send(extracted);
  } catch (error) {
    console.error('❌ OCR Error:', error.message);
    res.status(500).send('Error during OCR process');
  }
});

module.exports = router;

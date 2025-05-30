const express = require('express');
const fs = require('fs');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const stringSimilarity = require('string-similarity');
const path = require('path');

const router = express.Router();

// Multer for multiple PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Route handler
router.post('/', upload.array('files', 2), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: 'Please upload two PDF files.' });
    }

    const filePath1 = req.files[0].path;
    const filePath2 = req.files[1].path;

    const differences = await comparePdf(filePath1, filePath2);

    // Clean up uploaded files
    fs.unlinkSync(filePath1);
    fs.unlinkSync(filePath2);

    // Send JSON with differences
    res.setHeader('Content-Type', 'application/json');
    res.json({ differences });
  } catch (err) {
    console.error('❌ PDF Compare Error:', err.message);
    res.status(500).json({ error: 'PDF comparison failed', message: err.message });
  }
});

async function comparePdf(filePath1, filePath2) {
  const data1 = await pdfParse(fs.readFileSync(filePath1));
  const data2 = await pdfParse(fs.readFileSync(filePath2));

  const text1 = data1.text.trim().split('\n').filter(line => line.trim());
  const text2 = data2.text.trim().split('\n').filter(line => line.trim());

  const results = [];

  for (let i = 0; i < Math.max(text1.length, text2.length); i++) {
    const line1 = text1[i] || '';
    const line2 = text2[i] || '';
    const similarity = stringSimilarity.compareTwoStrings(line1, line2);

    if (similarity < 0.9) {
      results.push({
        line: i + 1,
        text1: line1,
        text2: line2,
        similarity: similarity.toFixed(2),
      });
    }
  }

  return results;
}

module.exports = router;

// routes/repairPdf.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { exec } = require('child_process');

const router = express.Router();

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// ✅ Repair logic
async function repairPdf(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = `qpdf --linearize "${inputPath}" "${outputPath}"`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ Repair PDF Error:", stderr);
        return reject(err);
      }
      resolve();
    });
  });
}

// ✅ Route
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, '../outputs', `repaired_${Date.now()}.pdf`);

    await repairPdf(inputPath, outputPath);

    res.download(outputPath, 'repaired.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error('❌ Repair Route Error:', err.message);
    res.status(500).json({ error: 'Failed to repair PDF' });
  }
});

module.exports = router;

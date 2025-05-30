// routes/convertPptToPdf.js

const express = require('express');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Conversion Logic
async function convertPptToPdf(inputPath, outputPath) {
  const outputDir = path.dirname(outputPath);
  const command = `soffice --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;
  execSync(command);

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const convertedPath = path.join(outputDir, `${baseName}.pdf`);

  fs.renameSync(convertedPath, outputPath); // Rename to match desired output
}

// ✅ Route Handler
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, '../outputs', `converted_${Date.now()}.pdf`);

    await convertPptToPdf(inputPath, outputPath);

    res.download(outputPath, 'converted.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error('❌ PPT to PDF Error:', err.message);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

module.exports = router;

const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const router = express.Router();

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, 'uploads/'),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Convert .docx to .pdf using LibreOffice
router.post('/', upload.single('file'), async (req, res) => {
  const inputPath = req.file.path;
  const outputPath = path.join('outputs', path.basename(inputPath, path.extname(inputPath)) + '.pdf');

  const command = `soffice --headless --convert-to pdf "${inputPath}" --outdir outputs`;

  exec(command, (error, stdout, stderr) => {
    if (error || !fs.existsSync(outputPath)) {
      console.error('❌ Conversion Error:', error || stderr);
      return res.status(500).json({ error: 'Failed to convert Word to PDF' });
    }

    res.download(outputPath, 'converted.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  });
});

module.exports = router;

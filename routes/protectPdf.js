const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const router = express.Router();

// ✅ Ensure protected folder exists
const protectedDir = path.join(__dirname, '../protected');
if (!fs.existsSync(protectedDir)) fs.mkdirSync(protectedDir);

// ✅ Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Route to protect PDF
router.post('/', upload.single('file'), (req, res) => {
  const { password } = req.body;
  const inputPath = req.file.path;
  const outputPath = path.join(protectedDir, `protected-${Date.now()}.pdf`);

  const command = `qpdf --encrypt ${password} ${password} 256 -- "${inputPath}" "${outputPath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ QPDF Encryption Error:', stderr);
      return res.status(500).json({ error: 'Unable to protect PDF' });
    }

    res.download(outputPath, 'protected.pdf', (err) => {
      if (err) console.error('Download error:', err);
      fs.unlinkSync(inputPath);  // ✅ Cleanup uploaded file
      fs.unlinkSync(outputPath); // ✅ Cleanup output file
    });
  });
});

module.exports = router;

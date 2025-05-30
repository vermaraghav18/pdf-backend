const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const router = express.Router();

// Storage config
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, 'uploads/'),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Route: POST /api/unlock
router.post('/', upload.single('file'), (req, res) => {
  const { password } = req.body;
  const inputPath = req.file.path;
  const outputPath = path.join(__dirname, '../uploads', `unlocked-${req.file.filename}`);

  const cmd = `qpdf --password=${password} --decrypt "${inputPath}" "${outputPath}"`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('Unlock Error:', stderr);
      return res.status(500).json({ error: 'Failed to unlock PDF' });
    }

    res.download(outputPath, 'unlocked.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  });
});

module.exports = router;

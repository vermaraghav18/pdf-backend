
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const router = express.Router();
// Setup multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

router.post('/', upload.single('file'), (req, res) => {
  const inputPath = req.file.path;
  const outputPath = path.join(__dirname, '../outputs', 'compressed_' + req.file.filename);

  const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Compression Error:', stderr);
      return res.status(500).send('Failed to compress PDF');
    }

    res.download(outputPath, 'compressed.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  });
});

module.exports = router;

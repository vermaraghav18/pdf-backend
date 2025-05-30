const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const multer = require('multer');
const archiver = require('archiver');

const router = express.Router();

// ✅ Setup multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputDir = path.join(__dirname, '../outputs', `${Date.now()}`);

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const cmd = `pdftoppm -jpeg -r 150 "${inputPath}" "${path.join(outputDir, 'page')}"`;

    exec(cmd, (error) => {
      if (error) return res.status(500).json({ error: 'Conversion failed', details: error.message });

      const zipPath = `${outputDir}.zip`;
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip');

      archive.pipe(output);
      fs.readdirSync(outputDir).forEach(file => {
        archive.file(path.join(outputDir, file), { name: file });
      });
      archive.finalize();

      output.on('close', () => {
        // Optionally clean up uploaded and intermediate files after download
        res.download(zipPath, 'images.zip', () => {
          fs.unlinkSync(inputPath);
        });
      });
    });
  } catch (err) {
    console.error('❌ PDF to JPG Error:', err);
    res.status(500).send('Failed to convert PDF to JPG');
  }
});

module.exports = router;

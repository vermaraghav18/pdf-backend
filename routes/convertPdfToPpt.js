const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const PPTX = require('pptxgenjs');
const multer = require('multer');

const router = express.Router();

// Multer setup for single PDF file upload
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const upload = multer({ storage });

router.post('/', upload.single('file'), async (req, res) => {
  const inputPath = req.file.path;
  const slideDir = `temp_slides_${Date.now()}`;
  const slideOutputPattern = `${slideDir}/slide_%d.jpg`;

  // 🔐 Validate uploaded file
  if (!fs.existsSync(inputPath)) {
    return res.status(400).json({ error: 'Uploaded PDF not found.' });
  }

  fs.mkdirSync(slideDir, { recursive: true });

  // 🔴 ✅ FIXED COMMAND VARIABLES (Step 1)
  const density = 150;
  const command = `convert -density ${density} "${inputPath}" -quality 90 "${slideOutputPattern}"`;

  // 🔴 ✅ ENHANCED EXEC() WITH STDERR (Step 2)
  exec(command, async (err, stdout, stderr) => {
  console.log('📤 STDOUT:', stdout);
  console.error('🧨 STDERR:', stderr);

  if (err) {
    console.error('ImageMagick Error:', err);
    return res.status(500).json({ error: 'Failed to convert PDF to images.' });
  }

    // 🔴 ✅ MOVED FAIL-FAST CHECK OUTSIDE TRY (Step 3)
    const images = fs.readdirSync(slideDir).filter(f => f.endsWith('.jpg'));
    if (images.length === 0) {
      return res.status(500).json({ error: 'No slide images generated.' });
    }

    // 🔴 ✅ PAGE LIMIT HANDLING (Step 4)
    if (images.length > 100) {
      cleanupFiles();
      return res.status(413).json({ error: 'PDF too long to convert. Try reducing pages.' });
    }

    try {
      const pptx = new PPTX();

      for (const img of images.sort()) {
        const slide = pptx.addSlide();
        slide.addImage({
          path: path.join(slideDir, img),
          x: 0,
          y: 0,
          w: '100%',
          h: '100%'
        });
      }

      const outputPptPath = path.join('outputs', `converted_${Date.now()}.pptx`);
      await pptx.writeFile({ fileName: outputPptPath });

      res.download(outputPptPath, 'converted.pptx', (err) => {
        if (err) console.error('Download error:', err);
        cleanupFiles();
      });

      // 🔴 ✅ CLEANUP FUNCTION EXTRACTED (Step 5)
      function cleanupFiles() {
        try {
          fs.unlinkSync(inputPath);
          fs.rmSync(slideDir, { recursive: true, force: true });
          fs.unlinkSync(outputPptPath);
        } catch (cleanupErr) {
          console.error('Cleanup failed:', cleanupErr);
        }
      }

    } catch (err) {
      console.error('Slide creation error:', err);
      res.status(500).json({ error: 'Failed to build PPT from slides.' });
    }
  });
});

module.exports = router;

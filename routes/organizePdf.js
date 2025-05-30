// routes/organizePdf.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PDFDocument, degrees } = require('pdf-lib');

const router = express.Router();

// ✅ Setup multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Core organize function
async function organizePdf(inputPath, outputPath, instructions) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const newPdf = await PDFDocument.create();

  for (const instr of instructions) {
   if (instr.pageIndex < 0 || instr.pageIndex >= pdfDoc.getPageCount()) {
  continue;
}

    const copiedPages = await newPdf.copyPages(pdfDoc, [instr.pageIndex]);
    const page = copiedPages[0];

    if (instr.rotate) {
      page.setRotation(degrees(instr.rotate));
    }

    newPdf.addPage(page);
  }

  const finalPdf = await newPdf.save();
  fs.writeFileSync(outputPath, finalPdf);
}

// ✅ POST route handler
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const instructions = JSON.parse(req.body.instructions || '[]');
    const outputPath = path.join(__dirname, '../outputs', `organized_${Date.now()}.pdf`);

    if (!Array.isArray(instructions)) {
      return res.status(400).json({ error: 'Invalid instructions array.' });
    }

    await organizePdf(inputPath, outputPath, instructions);

    res.download(outputPath, 'organized.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error('❌ Organize PDF Error:', err.message);
    res.status(500).json({ error: 'Failed to organize PDF' });
  }
});

module.exports = router;

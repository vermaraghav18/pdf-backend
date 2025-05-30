// routes/convertPdfToWord.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { Document, Packer, Paragraph } = require('docx');
const multer = require('multer');

const router = express.Router();

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Conversion logic
async function convertPdfToWord(inputPath, outputPath) {
  const dataBuffer = fs.readFileSync(inputPath);
  const data = await pdfParse(dataBuffer);

  const paragraphs = data.text
    .split('\n')
    .map((line) => new Paragraph(line.trim()));

  const doc = new Document({
    creator: 'PDF Pro Tools',
    title: 'Converted from PDF',
    description: 'Auto-generated Word document',
    sections: [
      {
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}

// ✅ POST route
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, '../outputs', `converted_${Date.now()}.docx`);

    await convertPdfToWord(inputPath, outputPath);

    res.download(outputPath, 'converted.docx', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error('❌ PDF to Word Error:', err.message);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

module.exports = router;

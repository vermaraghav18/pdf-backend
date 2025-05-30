// routes/editPdf.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const router = express.Router();

// ✅ Setup multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ✅ Core function
async function editPdf(inputPath, outputPath, annotations = [], drawings = []) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const annotation of annotations) {
    const page = pdfDoc.getPage(annotation.page);
    const { height } = page.getSize();

    page.drawText(annotation.text, {
      x: annotation.x,
      y: height - annotation.y,
      size: annotation.size || 12,
      font: helveticaFont,
      color: rgb(annotation.color?.r || 0, annotation.color?.g || 0, annotation.color?.b || 0),
    });
  }

  for (const drawing of drawings) {
    const page = pdfDoc.getPage(drawing.page);
    const { height } = page.getSize();

    const imageBytes = Buffer.from(drawing.base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const pngImage = await pdfDoc.embedPng(imageBytes);

    page.drawImage(pngImage, {
      x: drawing.x,
      y: height - drawing.y - drawing.height,
      width: drawing.width,
      height: drawing.height,
    });
  }

  const editedPdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, editedPdfBytes);
}

// ✅ POST route
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, '../outputs', `edited_${Date.now()}.pdf`);
    const { annotations, drawings } = req.body;

    const parsedAnnotations = annotations ? JSON.parse(annotations) : [];
    const parsedDrawings = drawings ? JSON.parse(drawings) : [];

    await editPdf(inputPath, outputPath, parsedAnnotations, parsedDrawings);

    res.download(outputPath, 'edited.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error('❌ Edit PDF Error:', err.message);
    res.status(500).json({ error: 'Failed to edit PDF' });
  }
});

module.exports = router;

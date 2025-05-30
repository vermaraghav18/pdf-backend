const express = require('express');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { filePath } = req.body;
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const total = pdfDoc.getPageCount();

    pdfDoc.getPages().forEach((page, index) => {
      const text = `${index + 1} / ${total}`;
      page.drawText(text, {
        x: page.getWidth() / 2 - 20,
        y: 30,
        size: 12,
      });
    });

    const outputPath = `uploads/numbered_${Date.now()}.pdf`;
    fs.writeFileSync(outputPath, await pdfDoc.save());
    res.download(outputPath);
  } catch (err) {
    res.status(500).send('Failed to add page numbers');
  }
});

module.exports = router;

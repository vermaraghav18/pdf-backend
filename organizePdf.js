
const { PDFDocument, degrees } = require("pdf-lib");
const fs = require("fs");

async function organizePdf({ inputPath, outputPath, operations }) {
  const pdfBytes = fs.readFileSync(inputPath);
  const originalPdf = await PDFDocument.load(pdfBytes);
  const newPdf = await PDFDocument.create();

  for (let op of operations) {
    const [page] = await newPdf.copyPages(originalPdf, [op.pageIndex]);
    if (op.rotation) {
      page.setRotation(degrees(op.rotation));
    }
    newPdf.addPage(page);
  }

  const pdfBuffer = await newPdf.save();
  fs.writeFileSync(outputPath, pdfBuffer);
}

module.exports = { organizePdf };

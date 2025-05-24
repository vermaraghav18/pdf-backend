const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

async function redactPdf(inputPath, outputPath, redactions = []) {
  const fileBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(fileBytes);
  const pages = pdfDoc.getPages();

  const PREVIEW_WIDTH = 600; // same as iframe width

  redactions.forEach(({ pageIndex, x, y, width, height }, i) => {
    const page = pages[pageIndex];
    const { width: pdfWidth, height: pdfHeight } = page.getSize();
  
    const scale = pdfWidth / PREVIEW_WIDTH;
  
    const scaledX = x * scale;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
  
    // ✅ TEST DIFFERENT adjustedY values
    const scaledY = y * scale;
    const adjustedY = pdfHeight - scaledY - scaledHeight + (70 * scale);
  
    console.log(`🔍 Redaction ${i + 1}`);
    console.log({ x, y, width, height });
    console.log({ scaledX, scaledY, scaledWidth, scaledHeight });
    console.log({ adjustedY, pageHeight: pdfHeight });
  
    page.drawRectangle({
      x: scaledX,
      y: adjustedY,
      width: scaledWidth,
      height: scaledHeight,
      color: rgb(0, 0, 0),
    });
  });


  const redactedBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, redactedBytes);
}

module.exports = { redactPdf };

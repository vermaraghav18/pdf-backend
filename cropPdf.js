// backend/cropPdf.js
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function cropPdf(inputPath, outputPath, cropBox, previewSize) {
  const fileBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(fileBytes);
  const page = pdfDoc.getPage(0);

  const { width: pdfWidth, height: pdfHeight } = page.getSize();

  const scaleX = pdfWidth / previewSize.width;
  const scaleY = pdfHeight / previewSize.height;

  const margin = 2; // You can adjust this

const cropX = (cropBox.x - margin) * scaleX;
const cropY = (cropBox.y - margin) * scaleY;
const cropWidth = (cropBox.width + margin * 2) * scaleX;
const cropHeight = (cropBox.height + margin * 2) * scaleY;

  if (cropWidth <= 0 || cropHeight <= 0) {
    throw new Error("Invalid crop dimensions");
  }

  const adjustedY = pdfHeight - cropY - cropHeight;

  page.setCropBox(cropX, adjustedY, cropWidth, cropHeight);
  page.setMediaBox(cropX, adjustedY, cropWidth, cropHeight);
  page.setBleedBox(cropX, adjustedY, cropWidth, cropHeight);
  page.setTrimBox(cropX, adjustedY, cropWidth, cropHeight);

  const croppedBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, croppedBytes);
}


module.exports = { cropPdf };

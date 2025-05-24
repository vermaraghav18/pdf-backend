const fs = require('fs');
const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');

// 🔧 Convert HEX to RGB
function hexToRgb(hex) {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return rgb(0.5, 0.5, 0.5);
  const r = parseInt(match[1], 16) / 255;
  const g = parseInt(match[2], 16) / 255;
  const b = parseInt(match[3], 16) / 255;
  return rgb(r, g, b);
}

// 📌 Get embedded font
async function getFontByName(pdfDoc, name) {
  const fonts = {
    Helvetica: StandardFonts.Helvetica,
    Courier: StandardFonts.Courier,
    TimesRoman: StandardFonts.TimesRoman
  };
  return await pdfDoc.embedFont(fonts[name] || StandardFonts.Helvetica);
}

// 🟩 Apply Text Watermark
async function applyTextWatermark(inputPath, outputPath, options) {
  const { watermarkText, x, y, fontSize, fontColor, fontFamily, pagesToWatermark } = options;
  const inputBytes = await fs.promises.readFile(inputPath);
  const pdfDoc = await PDFDocument.load(inputBytes);
  const pages = pdfDoc.getPages();

  const font = await getFontByName(pdfDoc, fontFamily);
  const color = hexToRgb(fontColor);

  const targetPages = getTargetPageIndexes(pages.length, pagesToWatermark);

  targetPages.forEach(index => {
    const page = pages[index];
    page.drawText(watermarkText, {
      x: x || 100,
      y: y || 100,
      size: fontSize || 40,
      font,
      color,
      rotate: degrees(0),
      opacity: 0.3,
    });
  });

  const pdfBytes = await pdfDoc.save();
  await fs.promises.writeFile(outputPath, pdfBytes);
}

// 🖼️ Apply Image Watermark
async function applyImageWatermark(inputPath, outputPath, imagePath, x, y, width, height, pagesToWatermark) {
  const inputBytes = await fs.promises.readFile(inputPath);
  const pdfDoc = await PDFDocument.load(inputBytes);
  const pages = pdfDoc.getPages();

  const imageBytes = await fs.promises.readFile(imagePath);
  const image = imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')
    ? await pdfDoc.embedJpg(imageBytes)
    : await pdfDoc.embedPng(imageBytes);

  const targetPages = getTargetPageIndexes(pages.length, pagesToWatermark);

  targetPages.forEach(index => {
    const page = pages[index];
    page.drawImage(image, {
      x: x || 100,
      y: y || 100,
      width: width || 200,
      height: height || 100,
      opacity: 0.3
    });
  });

  const pdfBytes = await pdfDoc.save();
  await fs.promises.writeFile(outputPath, pdfBytes);
}

// 🔢 Determine which pages to watermark
function getTargetPageIndexes(totalPages, pagesToWatermark) {
  if (!pagesToWatermark || pagesToWatermark.toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  return pagesToWatermark
    .split(',')
    .map(p => parseInt(p.trim(), 10) - 1)
    .filter(index => index >= 0 && index < totalPages);
}

module.exports = {
  applyTextWatermark,
  applyImageWatermark,
};

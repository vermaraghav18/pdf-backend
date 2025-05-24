const fs = require('fs');
const path = require('path');
const os = require('os');
const PptxGenJS = require('pptxgenjs');
const { convert } = require('pdf-poppler');
const { getImageSizeInInches } = require('./utils/imageSizeHelper'); // ✅ use helper

async function convertPdfToPpt(inputPath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppt-temp-'));

  const options = {
    format: 'png',
    out_dir: tempDir,
    out_prefix: 'slide',
    page: null,
  };

  await convert(inputPath, options);

  const imageFiles = fs
    .readdirSync(tempDir)
    .filter(file => file.endsWith('.png'))
    .sort();

  const pptx = new PptxGenJS();

  imageFiles.forEach(file => {
    const fullPath = path.join(tempDir, file);
    const { widthInInches, heightInInches } = getImageSizeInInches(fullPath);

    pptx.addSlide().addImage({
      path: fullPath,
      x: 0,
      y: 0,
      w: widthInInches,
      h: heightInInches,
    });
  });

  let pptxBuffer;
  try {
    pptxBuffer = await pptx.write('nodebuffer');
  } finally {
    try {
      imageFiles.forEach(file => fs.unlinkSync(path.join(tempDir, file)));
      fs.rmdirSync(tempDir);
    } catch (cleanupErr) {
      console.error("⚠️ Cleanup error:", cleanupErr);
    }
  }

  return pptxBuffer;
}

module.exports = { convertPdfToPpt };

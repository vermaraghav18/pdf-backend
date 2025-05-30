// ✅ FINAL VERSION: scanPdf.js using pdf-poppler (no GM/ImageMagick)
const fs = require('fs');
const path = require('path');
const { convert } = require('pdf-poppler');
const router = express.Router();

async function scanPdf(inputPath, outputDir) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const options = {
    format: 'png',
    out_dir: outputDir,
    out_prefix: 'page',
    page: null,
    resolution: 150,
  };

  await convert(inputPath, options);

  return fs.readdirSync(outputDir).filter(file => file.endsWith('.png'));
}

module.exports = router;

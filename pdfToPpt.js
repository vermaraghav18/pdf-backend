// 🧪 Diagnostic wrapper to isolate import issues
try {
  console.log("📦 Entering pdfToPpt.js");

  const fs = require("fs");
  const path = require("path");
  const { fromPath } = require("pdf2pic");
  const PptxGenJS = require("pptxgenjs");
  const sharp = require("sharp");

  console.log("✅ All dependencies loaded successfully");

  // Core conversion logic
  const convertPdfToPpt = async (pdfPath, outputPath) => {
    console.log("🔄 Converting PDF to images...");
    const options = {
      density: 150,
      saveFilename: "slide",
      savePath: "./temp_slides",
      format: "png",
      width: 1024,
      height: 768,
    };

    await fs.promises.mkdir(options.savePath, { recursive: true });

    const storeAsImage = fromPath(pdfPath, options);
    const result = await storeAsImage.bulk(-1, true);

    console.log(`🖼️ Extracted ${result.length} slides`);

    const pptx = new PptxGenJS();

    for (const slide of result) {
      const pptSlide = pptx.addSlide();
      pptSlide.addImage({
        path: slide.path,
        x: 0,
        y: 0,
        w: 10,
        h: 5.63,
      });
    }

    await pptx.writeFile({ fileName: outputPath });
    console.log("✅ PPTX created at:", outputPath);

    // Optional: clean up temporary slide images
    result.forEach(img => fs.unlink(img.path, () => {}));
  };

  module.exports = { convertPdfToPpt };
} catch (err) {
  console.error("❌ Error in top-level of pdfToPpt.js");
  console.error(err.stack || err.message || err);
}

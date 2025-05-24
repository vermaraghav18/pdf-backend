const { exec } = require("child_process");
const path = require("path");

/**
 * Repairs a corrupted PDF using qpdf.
 * @param {string} inputPath - The path to the uploaded corrupted PDF.
 * @param {string} outputPath - The path to save the repaired PDF.
 * @returns {Promise<void>}
 */
function repairPdf(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const command = `qpdf "${inputPath}" "${outputPath}"`;

    console.log("Running command:", command);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ QPDF Repair Error:", stderr);
        return reject(new Error("QPDF failed to repair the PDF."));
      }

      console.log("✅ QPDF Repair Success");
      resolve();
    });
  });
}

module.exports = { repairPdf };
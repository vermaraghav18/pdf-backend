const fs = require('fs');
const path = require('path');
const pdf2json = require('pdf2json');
const Tesseract = require('tesseract.js');

// Function to extract text from PDF using pdf2json
const extractTextFromPdf = async (inputPdfPath, outputTextPath) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new pdf2json();
    
    // Parse the PDF
    pdfParser.loadPDF(inputPdfPath);

    pdfParser.on("pdfParser_dataError", err => reject(new Error("Failed to extract text from PDF")));
    pdfParser.on("pdfParser_dataReady", () => {
      // Extract the text from the parsed PDF data
      const text = pdfParser.getRawTextContent();

      // Ensure the output directory exists
      const outputDir = path.dirname(outputTextPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });  // Create directory if it doesn't exist
      }

      // Save the extracted text to a file
      fs.writeFileSync(outputTextPath, text);
      resolve(outputTextPath);
    });
  });
};

// OCR function (for image-based PDFs)
const ocrPdf = async (inputPdfPath, outputTextPath) => {
    return new Promise((resolve, reject) => {
      // Convert PDF to images first (one image per page) and then perform OCR (using Tesseract)
      const convert = fromPath(inputPdfPath, { density: 300, saveFilename: "output", savePath: "./temp" });
      convert(1).then(async (image) => {
        const imagePath = path.join(image.path);
        console.log(`Converting PDF to image: ${imagePath}`);
  
        // Perform OCR using Tesseract.js on the image
        try {
          const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
            logger: (m) => console.log(m), // This will show the progress in the console
          });
  
          console.log("OCR Output:", text);  // Log OCR result to check if any text is extracted
  
          // Ensure the output directory exists
          const outputDir = path.dirname(outputTextPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });  // Create directory if it doesn't exist
          }
  
          // Save the OCR text to a file
          fs.writeFileSync(outputTextPath, text);
          resolve(outputTextPath);
        } catch (error) {
          console.error("OCR error: ", error);
          reject(new Error("Failed to process OCR"));
        }
      });
    });
  };

  
// Main function to process the PDF
const processPdf = async (inputPdfPath, outputTextPath) => {
  // Try extracting text directly from the PDF first
  try {
    await extractTextFromPdf(inputPdfPath, outputTextPath);
    console.log("Text extraction complete");
  } catch (textExtractionError) {
    // If text extraction fails (probably an image-based PDF), use OCR
    console.log("Text extraction failed, attempting OCR...");
    await ocrPdf(inputPdfPath, outputTextPath);
  }
};

module.exports = { processPdf };

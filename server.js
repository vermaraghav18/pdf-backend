
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
const fs = require('fs');
const { editPdf } = require('./editPdf');
const { convert } = require('pdf-poppler'); 
const path = require('path');
const XLSX = require('xlsx');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const { cropPdf } = require('./cropPdf');
const { execSync } = require("child_process");
const ExcelJS = require('exceljs');
const PDFKitDocument = require('pdfkit'); // ✅ Give a unique alias
const stringSimilarity = require("string-similarity");
const Tesseract = require("tesseract.js");
const { repairPdf } = require('./pdfUtils');
const { redactPdf } = require('./redactPdf');
const { convertPdfToPpt } = require('./pdfToPpt'); // ✅ Add this import
const {
  upload,
  uploadPDF,
  uploadDOCX,
  uploadExcel,
  uploadJPG,
  uploadPPT,
  imageUpload,
  mixedUpload,
  uploadWatermarkPDF,
  uploadWatermarkImage, // ✅ Add this line
} = require('./uploadMiddleware');

const { organizePdf } = require('./organizePdf');

const { jsPDF } = require('jspdf');
const puppeteer = require('puppeteer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { exec } = require('child_process');
const archiver = require('archiver');


const app = express();
const port = process.env.PORT || 5000;


// ✅ Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

// ✅ Upload handler
const watermarkUpload = multer({ storage }).fields([

  { name: 'pdf', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

const { fromPath } = require("pdf2pic");
app.use(cors());
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/output', express.static(path.join(__dirname, 'output')));
app.use('/thumbnails', express.static(path.join(__dirname, 'public/thumbnails')));
app.use(express.urlencoded({ extended: true }));


// Ensure upload & protected folders exist
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('protected')) fs.mkdirSync('protected');
if (!fs.existsSync('outputs')) fs.mkdirSync('outputs');
if (!fs.existsSync('public/thumbnails')) fs.mkdirSync('public/thumbnails', { recursive: true });


// ✅ Health Check
app.get('/', (req, res) => {
  res.send('Server is running!');
});


// Ensure 'uploads' directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

function sanitizePdf(inputPath, outputPath) {
  try {
    execSync(`qpdf "${inputPath}" --linearize "${outputPath}"`);
    console.log(`Sanitized: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error("QPDF sanitization failed:", error.message);
    return inputPath; // fallback
  }
}


function compareText(text1, text2) {
  const differences = [];
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const maxLength = Math.max(lines1.length, lines2.length);

  for (let i = 0; i < maxLength; i++) {
    const line1 = (lines1[i] || '').trim();
    const line2 = (lines2[i] || '').trim();
    const similarityScore = stringSimilarity.compareTwoStrings(line1, line2);

    if (similarityScore < 1) {
      differences.push({
        line: i + 1,
        pdf1: line1,
        pdf2: line2,
        similarity: (similarityScore * 100).toFixed(1) + '%'
      });
    }
  }

  return differences;
}


// ✅ Clean up function
function cleanup(paths) {
  paths.forEach(p => {
    try { fs.existsSync(p) && fs.unlinkSync(p); }
    catch (e) { console.error('Cleanup error:', e); }
  });
}

// Helper: Convert HEX to RGB
function hexToRgb(hex) {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return rgb(0.5, 0.5, 0.5);
  const r = parseInt(match[1], 16) / 255;
  const g = parseInt(match[2], 16) / 255;
  const b = parseInt(match[3], 16) / 255;
  return rgb(r, g, b);
}
// 🛠 Helper: Convert HEX to RGB
function rgbFromHex(hex) {
  const bigint = parseInt(hex.replace('#', ''), 16);
  return rgb(
    ((bigint >> 16) & 255) / 255,
    ((bigint >> 8) & 255) / 255,
    (bigint & 255) / 255
  );
}
// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}



// Ensure upload & protected folders exist
['uploads', 'protected', 'outputs', 'public/thumbnails'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.post('/upload', upload.single('pdf'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  res.json({ 
    filePath: `/uploads/${req.file.filename}`,
    filename: req.file.filename });
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('File not found');
  }
});



// 🧠 Route: Edit PDF
// Edit PDF route
app.post('/edit-pdf', async (req, res) => {
  try {
    const { annotations, pdfPath } = req.body;
    const editedPdfBuffer = await editPdf(pdfPath, annotations);
    const outputPath = `./outputs/edited-${Date.now()}.pdf`;
    fs.writeFileSync(outputPath, editedPdfBuffer);
    res.download(outputPath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error editing PDF.');
  }
});

//-------------- Function to SCAN PDF--------//

// Endpoint to handle the image upload and convert it to a PDF
app.post('/scan-pdf', imageUpload.single('image'), (req, res) => {
  const imagePath = req.file.path; // Path to the uploaded image
  const outputPdfPath = path.join('output', `${req.file.filename}.pdf`); // Output path for the PDF

  // Log image file path to verify
  console.log(`Uploaded Image Path: ${imagePath}`);

  // Read the image as base64
  fs.readFile(imagePath, (err, data) => {
    if (err) {
      console.log("Error reading the image file", err);
      return res.status(500).send("Error processing the image.");
    } else {
      // Convert the image data to base64
      const imageBase64 = data.toString('base64');
      const imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;

      // Create a new jsPDF instance
      const doc = new jsPDF();

      // Add the image to the PDF
      doc.addImage(imageDataUrl, 'JPEG', 10, 10, 180, 160); // Adjust width and height as needed

      // Ensure the output directory exists
      const outputDir = path.dirname(outputPdfPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });  // Create directory if it doesn't exist
      }

      // Save the generated PDF
      doc.save(outputPdfPath);

      // Send the generated PDF back to the user
      res.download(outputPdfPath, 'scanned_document.pdf', () => {
        // Clean up the uploaded image after the PDF is generated
        fs.unlinkSync(imagePath);  // Delete the image file after use
      });
    }
  });
});

//-------------- UNLOCK PDF------------// 
// 🧩 UNLOCK PDF ROUTE
app.post('/unlock-pdf', upload.single('pdf'), async (req, res) => {
  const { password } = req.body;
  const inputPdfPath = req.file.path;
  const outputPdfPath = path.join(__dirname, 'uploads', `unlocked-${req.file.filename}.pdf`);

  const command = `qpdf --password=${password} --decrypt "${inputPdfPath}" "${outputPdfPath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Unlock Error:', stderr);
      return res.status(500).send('Error unlocking PDF. Password may be incorrect.');
    }

    res.download(outputPdfPath, 'unlocked.pdf', (err) => {
      if (err) console.error('Download error:', err);
      fs.unlinkSync(inputPdfPath);
      fs.unlinkSync(outputPdfPath);
    });
  });
});
//-------------- PROTECT PDF------------// 
// 🔐 PROTECT PDF
app.post('/protect-pdf', upload.single('pdf'), async (req, res) => {
  const { password } = req.body;
  const inputPdfPath = req.file.path;
  const outputPdfPath = path.join(__dirname, 'protected', `protected-${req.file.filename}`);

  const command = `qpdf --encrypt ${password} ${password} 256 -- "${inputPdfPath}" "${outputPdfPath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Encryption Error:', stderr);
      return res.status(500).send('Error protecting PDF.');
    }

    res.download(outputPdfPath, 'protected.pdf', (err) => {
      if (err) console.error('Download error:', err);
      fs.unlinkSync(inputPdfPath);
      fs.unlinkSync(outputPdfPath);
    });
  });
});


  //-------------- REPAIR PDF------------// 
  // Function to repair PDF
  // Function to repair PDF
app.post('/repair-pdf', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) {
      return res.status(400).send('No file uploaded.');
    }

    const inputPdfPath = path.join(__dirname, 'uploads', file.filename);
    const outputPdfPath = path.join(__dirname, 'uploads', 'repaired_output.pdf');

    console.log('Input PDF Path:', inputPdfPath);
    console.log('Output PDF Path:', outputPdfPath);

    // Your repair function using qpdf or fallback logic
    await repairPdf(inputPdfPath, outputPdfPath);

    res.download(outputPdfPath, 'repaired_output.pdf', (err) => {
      fs.unlinkSync(inputPdfPath);
      fs.unlinkSync(outputPdfPath);
      if (err) console.error('Error sending file:', err);
    });
  } catch (err) {
    console.error('Error during PDF repair:', err);
    res.status(500).send('Error repairing the PDF.');
  }
});


// Convert PDF to Word
app.post('/convert-pdf-to-word', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) {
      return res.status(400).send('❌ Please upload a PDF file.');
    }

    const pdfBytes = fs.readFileSync(file.path);
    const pdfData = await pdfParse(pdfBytes);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.trim() === '') {
      throw new Error('No text found in PDF (might be scanned or image-based)');
    }

    // ✅ Create Word Document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: extractedText.split('\n').map(line =>
            new Paragraph({
              children: [new TextRun(line)],
            })
          ),
        },
      ],
    });

    const docxPath = path.join(__dirname, 'uploads', 'converted.docx');
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(docxPath, buffer);

    res.download(docxPath, 'converted.docx', () => {
      cleanup([file.path, docxPath]);
    });
  } catch (err) {
    console.error('❌ Error converting PDF to Word:', err.message);
    res.status(500).send('Something went wrong while converting the PDF to Word.');
  }
});


// Crop PDF endpoint
app.post('/crop-pdf', upload.single('pdf'), async (req, res) => {
  try {
    const cropBox = JSON.parse(req.body.cropBox);
    const previewSize = JSON.parse(req.body.previewSize);
    const inputPath = req.file.path;
    const outputPath = path.join(__dirname, 'outputs', `cropped-${Date.now()}.pdf`);

    await cropPdf(inputPath, outputPath, cropBox, previewSize);

    const resultBuffer = fs.readFileSync(outputPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(resultBuffer);

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
  } catch (err) {
    console.error('Crop PDF Error:', err);
    res.status(500).send('Cropping failed.');
  }
});

// Redact PDF endpoint
app.post('/api/redact', upload.single('file'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = `uploads/redacted-${Date.now()}.pdf`;
    const redactions = JSON.parse(req.body.redactions);

    await redactPdf(inputPath, outputPath, redactions);

    res.download(outputPath);
  } catch (err) {
    console.error('Redact Error:', err);
    res.status(500).send('Redaction failed.');
  }
});


// Compare PDFs endpoint
app.post('/compare-pdfs', upload.array('pdfs', 2), async (req, res) => {
  try {
    const { files } = req;
    if (!files || files.length !== 2) {
      return res.status(400).send('Please upload exactly two PDF files.');
    }

    const pdf1Path = files[0].path;
    const pdf2Path = files[1].path;

    const safePdf1 = sanitizePdf(pdf1Path, `${pdf1Path}_safe.pdf`);
    const safePdf2 = sanitizePdf(pdf2Path, `${pdf2Path}_safe.pdf`);

    const pdf1Text = await pdfParse(fs.readFileSync(safePdf1));
    const pdf2Text = await pdfParse(fs.readFileSync(safePdf2));

    const differences = compareText(pdf1Text.text, pdf2Text.text);

    const totalScore = differences.reduce((sum, diff) => {
      return sum + parseFloat(diff.similarity.replace('%', ''));
    }, 0);

    const averageSimilarity = (differences.length > 0)
      ? (totalScore / differences.length).toFixed(1)
      : 100.0;

    cleanup([pdf1Path, pdf2Path, safePdf1, safePdf2]);

    res.json({ differences, similarity: averageSimilarity });
  } catch (err) {
    console.error('Error comparing PDFs:', err);
    res.status(500).send('Something went wrong while comparing the PDFs.');
  }
});


// OCR PDF endpoint
// OCR PDF Route
app.post('/ocr-pdf', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) {
      return res.status(400).send("No file uploaded.");
    }

    const pdfPath = file.path;
    const outputDir = path.dirname(pdfPath);
    const outputImagePath = path.join(outputDir, "ocr_page-1.png"); // ✅ pdf-poppler creates -1 suffix

    // Convert first page of PDF to PNG image
    const options = {
      format: "png",
      out_dir: outputDir,
      out_prefix: "ocr_page",
      page: 1,
      resolution: 200
    };

    await convert(pdfPath, options);

    // Perform OCR using Tesseract.js
    const result = await Tesseract.recognize(outputImagePath, "eng", {
      logger: (m) => console.log(m), // Logs OCR progress
    });

    const extractedText = result.data.text;

    // Clean up uploaded PDF and generated image
    fs.unlinkSync(pdfPath);
    fs.unlinkSync(outputImagePath);

    // Respond with extracted text as downloadable .txt
    res.setHeader("Content-Disposition", "attachment; filename=ocr_output.txt");
    res.setHeader("Content-Type", "text/plain");
    res.send(extractedText);

  } catch (error) {
    console.error("❌ OCR Error:", error);
    res.status(500).send("Error during OCR process.");
  }
});


// Scan to PDF endpoint
app.post('/scan-to-pdf', upload.array('images'), async (req, res) => {
  try {
    const { files } = req;
    if (files.length === 0) {
      return res.status(400).send('No images uploaded.');
    }

    const imagePaths = files.map(file => file.path); // Get file paths
    const outputPdfPath = path.join(__dirname, 'uploads', 'scanned_document.pdf');

    // Use imageToPdf to create the PDF from images
    imageToPdf(imagePaths)
      .pipe(fs.createWriteStream(outputPdfPath))
      .on('finish', () => {
        // Send the generated PDF to the user
        res.download(outputPdfPath, 'scanned_document.pdf', () => {
          // Cleanup files after sending the PDF
          cleanup(imagePaths);
          cleanup([outputPdfPath]);
        });
      });
  } catch (error) {
    console.error('Error scanning images to PDF:', error);
    res.status(500).send('Error scanning images to PDF.');
  }
});

/// ---------------------------- ADD PAGE NUMBERS ---------------------------
app.post('/add-page-numbers', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) {
      return res.status(400).send('Please upload a PDF file.');
    }

    const pdfBytes = fs.readFileSync(file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const totalPages = pdfDoc.getPageCount();
    const fontSize = 12;

    // Create a new PDF document
    const newPdf = await PDFDocument.create();

    // Copy pages from the original PDF to the new PDF
    const pages = await newPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());

    // Add each copied page and add page numbers
    pages.forEach((page, index) => {
      const newPage = newPdf.addPage(page);

      // Add page number at the bottom center
      const text = `${index + 1} / ${totalPages}`;
      newPage.drawText(text, {
        x: newPage.getWidth() / 2 - fontSize * text.length / 2, // Adjust page number to be center-aligned
        y: 30, // Position the text at the bottom
        size: fontSize,
      });
    });

    const modifiedPdfBytes = await newPdf.save();
    const outputPath = path.join(__dirname, 'uploads', 'pdf_with_page_numbers.pdf');
    fs.writeFileSync(outputPath, modifiedPdfBytes);

    // Send the modified PDF to the user
    res.download(outputPath, 'pdf_with_page_numbers.pdf', () => {
      cleanup([file.path, outputPath]);
    });
  } catch (err) {
    console.error('Error adding page numbers to PDF:', err);
    res.status(500).send('Error adding page numbers to PDF.');
  }
});

// ---------------------------- REARRANGE PDF ---------------------------
// ---------------------------- REARRANGE PDF ---------------------------
app.post('/rearrange-pdf', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const { order } = req.body;  // Rearrangement order input (comma-separated)

    if (!file || !order) {
      return res.status(400).send('Please upload a PDF file and provide the rearrange order.');
    }

    const pdfBytes = fs.readFileSync(file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const pageCount = pdfDoc.getPageCount();
    const rearrangedPages = order.split(',').map(Number);  // Convert order to an array of page indices

    if (rearrangedPages.some(page => page >= pageCount)) {
      return res.status(400).send('Invalid page order specified.');
    }

    const newPdf = await PDFDocument.create();

    // Copy pages in the specified order
    for (let pageIndex of rearrangedPages) {
      const page = pdfDoc.getPage(pageIndex);
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
      newPdf.addPage(copiedPage);
    }

    const rearrangedPdfBytes = await newPdf.save();
    const outputPath = path.join(__dirname, 'uploads', 'rearranged.pdf');
    fs.writeFileSync(outputPath, rearrangedPdfBytes);

    res.download(outputPath, 'rearranged.pdf', () => {
      cleanup([file.path, outputPath]);
    });
  } catch (err) {
    console.error('Error rearranging PDF:', err);
    res.status(500).send('Error rearranging PDF.');
  }
});


// ---------------------------- REMOVE PAGES ---------------------------
app.post('/remove-pages', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const { pagesToRemove } = req.body;  // Pages to remove (comma-separated)

    if (!file || !pagesToRemove) {
      return res.status(400).send('Please upload a PDF file and provide pages to remove.');
    }

    const pdfBytes = fs.readFileSync(file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Convert pagesToRemove to an array of page numbers
    const pagesToRemoveArr = pagesToRemove.split(',').map(Number);
    const pages = pdfDoc.getPages();

    // Create a new PDF document
    const newPdf = await PDFDocument.create();

    // Copy the pages that are not removed into the new PDF document
    for (let i = 0; i < pages.length; i++) {
      if (!pagesToRemoveArr.includes(i)) {
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(copiedPage);
      }
    }

    // Save the modified PDF
    const modifiedPdfBytes = await newPdf.save();
    const outputPath = path.join(__dirname, 'uploads', 'modified.pdf');
    fs.writeFileSync(outputPath, modifiedPdfBytes);

    // Send the modified PDF to the user
    res.download(outputPath, 'modified.pdf', () => {
      cleanup([file.path, outputPath]);
    });
  } catch (err) {
    console.error('Error removing pages from PDF:', err);
    res.status(500).send('Error removing pages from PDF.');
  }
});

// Route to convert HTML to PDF
app.post('/convert-html-to-pdf', async (req, res) => {
  const { html } = req.body;

  if (!html || typeof html !== 'string') {
    return res.status(400).send('Invalid HTML or URL input.');
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new', // Fix for some Puppeteer issues on newer Node.js
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // ✅ If it's a valid URL, treat as link
    if (/^https?:\/\//i.test(html.trim())) {
      await page.goto(html, { waitUntil: 'networkidle2' });
    } else {
      await page.setContent(html);
    }

    const pdfBuffer = await page.pdf({ format: 'A4' });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=converted.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error during HTML to PDF conversion:', error);
    res.status(500).send('Failed to convert HTML to PDF');
  }
});


// =========================
// 📌 Rotate PDF Endpoint
// =========================
/* ✅ PDF ROTATION HANDLER */
// ✅ EXAMPLE 3: Rotate PDF
app.post('/rotate-pdf', uploadPDF.single('file'), async (req, res) => {
  try {
    let angle = 0;
    if (req.body.direction === 'left') angle = -90;
    if (req.body.direction === 'right') angle = 90;

    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    pages.forEach((page) => {
      page.setRotation(degrees(angle));
    });

    const rotatedPdf = await pdfDoc.save();
    const outputPath = path.join(__dirname, 'uploads', 'rotated.pdf');
    fs.writeFileSync(outputPath, rotatedPdf);

    res.download(outputPath, 'rotated.pdf', () => {
      fs.unlinkSync(req.file.path);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error('Rotate error:', err);
    res.status(500).send('Failed to rotate PDF');
  }
});

//sign pdf ///
app.post('/sign-pdf', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'imageSignature', maxCount: 1 }
]), async (req, res) => {
  try {
    const pdfPath = req.files?.pdf?.[0]?.path;
    const imageUploadPath = req.files?.imageSignature?.[0]?.path;
    const signatureText = req.body.signatureText;
    const signatureImage = req.body.signatureImage; // base64 if using canvas
    const fontChoice = req.body.font || 'Helvetica';

    const x = parseInt(req.body.x) || 50;
    const y = parseInt(req.body.y) || 50;

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];

    if (imageUploadPath) {
      const imgBuffer = fs.readFileSync(imageUploadPath);
      const embeddedImage = await pdfDoc.embedPng(imgBuffer);
      page.drawImage(embeddedImage, { x, y, width: 150, height: 50 });
    } else if (signatureImage) {
      const base64Data = signatureImage.replace(/^data:image\/png;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const image = await pdfDoc.embedPng(imageBuffer);
      page.drawImage(image, { x, y, width: 150, height: 50 });
    } else if (signatureText) {
      const font = await pdfDoc.embedFont(StandardFonts[fontChoice] || StandardFonts.Helvetica);
      page.drawText(signatureText, {
        x,
        y,
        size: 20,
        font,
        color: rgb(0, 0, 0),
      });
    }

    const finalPdf = await pdfDoc.save();
    const outputPath = path.join('uploads', `signed_${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, finalPdf);

    res.download(outputPath, 'signed.pdf', () => {
      fs.unlinkSync(pdfPath);
      if (imageUploadPath) fs.unlinkSync(imageUploadPath);
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error('❌ Sign PDF Error:', err);
    res.status(500).send('Signing failed.');
  }
});

// ---------------------------- JPG TO PDF ---------------------------//
async function convertJpgToPdf(jpgPath, outputPdfPath) {
  const jpgBytes = fs.readFileSync(jpgPath);
  const pdfDoc = await PDFDocument.create();
  const jpgImage = await pdfDoc.embedJpg(jpgBytes);
  const { width, height } = jpgImage.scale(1);

  const page = pdfDoc.addPage([width, height]);
  page.drawImage(jpgImage, { x: 0, y: 0, width, height });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, pdfBytes);
}
app.post('/convert-multiple-jpg-to-pdf', uploadJPG.array('files'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).send('No files uploaded.');

    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      const jpgBytes = fs.readFileSync(file.path);
      const jpgImage = await pdfDoc.embedJpg(jpgBytes);
      const { width, height } = jpgImage.scale(1);

      const page = pdfDoc.addPage([width, height]);
      page.drawImage(jpgImage, { x: 0, y: 0, width, height });
    }

    const pdfBytes = await pdfDoc.save();
    const outputPath = path.join('uploads', `combined_${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, pdfBytes);

    res.download(outputPath, 'combined_images.pdf', (err) => {
      if (err) console.error('Download error:', err);
      setTimeout(() => {
        try {
          files.forEach(f => fs.unlinkSync(f.path));
          fs.unlinkSync(outputPath);
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }, 2000);
    });
  } catch (err) {
    console.error('Multi-image JPG to PDF Error:', err);
    res.status(500).send('Error converting images to PDF.');
  }
});


// ---------------------------- PDF TO JPG ---------------------------
// ✅ Set this line to force 'magick' CLI instead of gm/convert

app.post("/convert-pdf-to-jpg", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const outputDir = path.join(__dirname, "outputs", path.parse(filePath).name);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const cmd = `pdftoppm -jpeg -r 150 "${filePath}" "${path.join(outputDir, "page")}"`;
    console.log("⚙️ Running Poppler CLI command:\n", cmd);

    exec(cmd, (error) => {
      if (error) {
        console.error("❌ Exec error:", error);
        return res.status(500).send("Failed to convert PDF to images.");
      }

      const imageFiles = fs.readdirSync(outputDir)
        .filter((f) => f.endsWith(".jpg"))
        .map((f) => path.join(outputDir, f));

      if (imageFiles.length === 0) {
        return res.status(500).send("❌ No images were generated.");
      }

      const zipPath = path.join(outputDir, "converted_images.zip");
      const zipStream = fs.createWriteStream(zipPath);
      const archive = archiver("zip");

      zipStream.on("close", () => {
        console.log("✅ ZIP file ready. Sending to client...");

        res.download(zipPath, "converted_images.zip", (err) => {
          if (err) {
            console.error("❌ Download error:", err);
          } else {
            console.log("✅ Download completed.");
          }

          // 🔁 Delayed cleanup to prevent EPERM
          setTimeout(() => {
            console.log("🧹 Cleaning up files...");
            try {
              cleanup([filePath, zipPath, ...imageFiles]);
              fs.rmSync(outputDir, { recursive: true, force: true });
            } catch (cleanupErr) {
              console.error("⚠️ Cleanup error:", cleanupErr);
            }
          }, 2000);
        });
      });

      archive.on("error", (err) => {
        console.error("❌ ZIP creation error:", err);
        res.status(500).send("Error creating zip file.");
      });

      archive.pipe(zipStream);
      imageFiles.forEach((img) => {
        archive.file(img, { name: path.basename(img) });
      });
      archive.finalize();
    });
  } catch (err) {
    console.error("❌ Fatal error in route:", err);
    res.status(500).send("Unexpected server error.");
  }
});

// ---------------------------- PDF TO EXCEL ---------------------------
// ✅ PDF to Excel Route (with accurate formatting)
// ✅ PDF to Excel Route
app.post('/convert-pdf-to-excel', upload.single('pdf'), async (req, res) => {
  try {
    const inputPdf = path.resolve(req.file.path).replace(/\\/g, '/');
    const outputDir = path.dirname(inputPdf);
    const baseName = path.basename(inputPdf, '.pdf');

    // Run pdf2json
    const cmd = `pdf2json -f "${inputPdf}" -o "${outputDir}"`;
    console.log('📄 Running:', cmd);
    execSync(cmd);

    // Try to find the output JSON file
    let jsonFile = '';
    const files = fs.readdirSync(outputDir);
    for (const file of files) {
      if (file.includes(baseName) && file.endsWith('.json')) {
        jsonFile = path.join(outputDir, file);
        break;
      }
    }

    if (!jsonFile || !fs.existsSync(jsonFile)) {
      throw new Error('PDF to JSON failed. File not found.');
    }

    const json = fs.readFileSync(jsonFile);
    const parsed = JSON.parse(json);

    // ✅ Support both possible structures
    const pages = parsed.Pages || (parsed.formImage && parsed.formImage.Pages);
    if (!pages) {
      throw new Error('❌ Could not find Pages in parsed PDF JSON.');
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet 1');

      let row = 1;
    for (const page of pages) {
      const lines = new Map();
      for (const block of page.Texts) {
        const y = block.y.toFixed(1);
        const x = block.x;
        const text = decodeURIComponent(block.R.map(r => r.T).join(''));

        if (!lines.has(y)) lines.set(y, []);
        lines.get(y).push({ x, text, TS: block.R[0].TS });
      }

      const sortedLines = [...lines.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));

      for (const [, line] of sortedLines) {
        line.sort((a, b) => a.x - b.x);

        const fullLine = line.map(t => t.text).join('').trim();
        const fontSize = line[0].TS?.[1] || 11;
        const isBold = line[0].TS?.[2] === 1;

        const cell = sheet.getCell(`A${row}`);
        cell.value = fullLine;
        cell.font = {
          size: fontSize,
          bold: isBold,
          color: { argb: 'FF000000' }
        };
        row++;
      }
    }


    const outputExcel = path.join(outputDir, `${baseName}.xlsx`);
    await workbook.xlsx.writeFile(outputExcel);

    res.download(outputExcel, 'converted.xlsx', (err) => {
      if (err) {
        console.error('❌ Download failed:', err);
        return res.status(500).send('Download failed.');
      }

      // Cleanup
      [inputPdf, jsonFile, outputExcel].forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });
    });

  } catch (err) {
    console.error('❌ Conversion Error:', err.message);
    res.status(500).send(`Conversion failed: ${err.message}`);
  }
});

// ---------------------------- EXCEL TO PDF ---------------------------
app.post('/convert-excel-to-pdf', uploadExcel.single('excel'), async (req, res) => {
  try {
    const excelPath = req.file.path;
    const pdfPath = path.join(__dirname, 'outputs', 'converted.pdf');

    // 🧠 Read Excel File
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    // 📄 Create PDF with PDFKit
    const doc = new PDFKitDocument({ margin: 30 });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.fontSize(14).font('Times-Roman');

    // 📊 Write rows from Excel
    sheet.forEach((row, index) => {
      const line = row.map(cell => (cell !== undefined ? String(cell) : '')).join('    ');
      doc.text(line);
    });

    doc.end();

    writeStream.on('finish', () => {
      res.download(pdfPath, 'converted.pdf', (err) => {
        if (err) return res.status(500).send('❌ Download failed.');
        fs.unlinkSync(pdfPath);
        fs.unlinkSync(excelPath);
      });
    });

  } catch (err) {
    console.error('❌ Excel to PDF Error:', err);
    res.status(500).send('Conversion failed.');
  }
});


// ---------------------------- PDF MERGE ---------------------------
app.post('/merge', upload.array('files', 10), async (req, res) => {
  try {
    const pdfDocs = await Promise.all(
      req.files.map((file) => PDFDocument.load(fs.readFileSync(file.path)))
    );

    const mergedPdf = await PDFDocument.create();
    for (const pdfDoc of pdfDocs) {
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const finalPdf = await mergedPdf.save();
    const outputPath = path.join(__dirname, 'uploads', 'merged.pdf');
    fs.writeFileSync(outputPath, finalPdf);

    res.download(outputPath, 'merged.pdf', () => {
      // Clean up
      req.files.forEach((f) => fs.unlinkSync(f.path));
      fs.unlinkSync(outputPath);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to merge PDFs');
  }
});


// ---------------------------- WORD TO PDF ---------------------------
app.post('/convert-word-to-pdf', uploadDOCX.single('file'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) return res.status(400).send('No file uploaded');

    const docxPath = file.path;  // Get the uploaded DOCX file path
    const outputDir = path.dirname(docxPath);
    const outputPdfPath = path.join(outputDir, 'converted.pdf'); // Path for saving PDF

    // Step 1: Extract text from DOCX using mammoth
    const docxBuffer = fs.readFileSync(docxPath);
    const { value: htmlContent } = await mammoth.convertToHtml({ buffer: docxBuffer });

    // Step 2: Use puppeteer to convert the HTML content to a PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set the HTML content to be rendered in Puppeteer
    await page.setContent(htmlContent);

    // Generate PDF from the HTML content
    await page.pdf({ path: outputPdfPath, format: 'A4' });

    await browser.close();

    // Send the generated PDF to the client
    res.download(outputPdfPath, 'converted.pdf', () => {
      cleanup([file.path, outputPdfPath]);
    });
  } catch (err) {
    console.error('Error during Word to PDF conversion:', err);
    res.status(500).send('Something went wrong while converting the Word to PDF.');
  }
});

// ---------------------------- PDF TO POWERPOINT---------------------------
// 📤 Route: PDF to PowerPoint
app.post('/api/convert-pdf-to-ppt', upload.single('file'), async (req, res) => {
  try {
    const pptBuffer = await convertPdfToPpt(req.file.path);
    res.setHeader('Content-Disposition', 'attachment; filename=converted.pptx');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    res.send(pptBuffer);
  } catch (err) {
    console.error('❌ PDF to PPT error:', err);
    res.status(500).send('Failed to convert PDF to PowerPoint');
  }
});
// ---------------------------- POWERPOINT TO PDF ---------------------------
app.post('/convert-powerpoint-to-pdf', uploadPPT.single('file'), async (req, res) => {

  try {
    const { file } = req;
    if (!file) return res.status(400).send('No PowerPoint file uploaded');

    const pptxPath = file.path;
    const outputDir = path.dirname(pptxPath);
    const outputPdfPath = path.join(outputDir, 'converted.pdf');

    await pptx2pdf(pptxPath, outputPdfPath); // ✅ Await instead of .then()
    res.download(outputPdfPath, 'converted.pdf', () => {
      cleanup([file.path, outputPdfPath]);
    });
  } catch (err) {
    console.error('Error during PowerPoint to PDF conversion:', err);
    res.status(500).send('Something went wrong while converting the PowerPoint to PDF.');
  }
});

// ---------------------------- COMPRESS PDF ---------------------------



// ---------------------------- SPLIT PDF ---------------------------
// Ensure directories exist
['uploads', 'outputs', 'protected', 'public/thumbnails'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 🟢 Write pages to PDFs
async function writePagesToZip(pdfDoc, pageIndices, outputPrefix) {
  const outputDir = path.join(__dirname, 'outputs');
  const tempFiles = [];

  for (let i = 0; i < pageIndices.length; i++) {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndices[i]]);
    newPdf.addPage(copiedPage);

    const pdfBytes = await newPdf.save();
    const outputPath = path.join(outputDir, `${outputPrefix}_page${pageIndices[i] + 1}.pdf`);
    fs.writeFileSync(outputPath, pdfBytes);
    tempFiles.push(outputPath);
  }

  return tempFiles;
}

// 🟢 ZIP and stream to response
function zipAndSend(filePaths, res) {
  const archive = archiver('zip');
  res.setHeader('Content-Disposition', 'attachment; filename=split_pages.zip');
  res.setHeader('Content-Type', 'application/zip');

  archive.pipe(res);
  filePaths.forEach(file => {
    const filename = path.basename(file);
    archive.file(file, { name: filename });
  });

  archive.finalize();

  // Cleanup after stream is done
  res.on('finish', () => cleanup(filePaths));
}

// 🟢 Split: By Range
async function splitByRange(inputPath, start, end, res) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();

  if (start < 1 || end > totalPages || start > end) {
    throw new Error(`Invalid range. PDF has ${totalPages} pages.`);
  }

  const indices = [];
  for (let i = start - 1; i < end; i++) indices.push(i);
  const files = await writePagesToZip(pdfDoc, indices, 'split_range');
  return zipAndSend(files, res);
}

// 🟢 Split: By Specific Pages
async function splitByPages(inputPath, pageArray, res) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();

  const validPages = pageArray.filter(p => p >= 1 && p <= totalPages);
  if (validPages.length === 0) throw new Error('No valid pages to split.');

  const zeroIndexed = validPages.map(p => p - 1);
  const files = await writePagesToZip(pdfDoc, zeroIndexed, 'split_pages');
  return zipAndSend(files, res);
}

// 🟢 Split: All Pages
async function splitAllPages(inputPath, res) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();

  const indices = Array.from({ length: totalPages }, (_, i) => i);
  const files = await writePagesToZip(pdfDoc, indices, 'split_all');
  return zipAndSend(files, res);
}

// 🟢 Split Route
app.post('/split', upload.single('file'), async (req, res) => {
  const { mode, range, pages } = req.body;
  const inputPath = req.file.path;

  console.log('📥 PDF Split Request Received');
  console.log('➡ File:', req.file.originalname);
  console.log('➡ Mode:', mode);
  console.log('➡ Range:', range);
  console.log('➡ Pages:', pages);

  try {
    if (mode === 'range' && range) {
      const [start, end] = range.split('-').map(Number);
      await splitByRange(inputPath, start, end, res);
    } else if (mode === 'pages' && pages) {
      const pageArray = pages.split(',').map(p => parseInt(p.trim()));
      await splitByPages(inputPath, pageArray, res);
    } else {
      await splitAllPages(inputPath, res);
    }
  } catch (err) {
    console.error('🔥 Split PDF Error:', err.message);
    res.status(500).send('Error splitting PDF');
  }
});

// ✅ Health check
app.get('/', (req, res) => res.send('✅ Server is running!'));


//ORGANIZE PDF //
app.post("/organize", upload.single("pdf"), async (req, res) => {
  try {
    const operations = JSON.parse(req.body.operations);
    const inputPath = req.file.path;
    const outputPath = path.join("outputs", `organized-${Date.now()}.pdf`);

    await organizePdf({ inputPath, outputPath, operations });
    res.download(outputPath);
  } catch (err) {
    console.error("Organize error:", err);
    res.status(500).send("Failed to process PDF.");
  }
});


// ✅ Watermark PDF
app.post('/api/add-watermark', watermarkUpload, async (req, res) => {
  try {
    const { watermarkText, fontSize, opacity, customX, customY } = req.body;
    const rotation = parseFloat(req.body.rotation) || 0; // ✅ Rotation in degrees

    const pdfFile = req.files?.['pdf']?.[0];
    const imageFile = req.files?.['image']?.[0];
    if (!pdfFile) throw new Error('No PDF uploaded');

    // ✅ Load and parse PDF
    const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfFile.path));
    const page = pdfDoc.getPages()[0];
    const { width: pdfWidth, height: pdfHeight } = page.getSize();

    // ✅ Coordinates from frontend are already scaled to real PDF size
    const x = parseFloat(customX) || 0;
    const y = pdfHeight - (parseFloat(customY) || 0); // ✅ Flip Y

    if (imageFile) {
      // ✅ Embed watermark image
      const imageBytes = fs.readFileSync(imageFile.path);
      const extension = path.extname(imageFile.originalname).toLowerCase();
      let imageEmbed;

      if (extension === '.jpg' || extension === '.jpeg') {
        imageEmbed = await pdfDoc.embedJpg(imageBytes);
      } else if (extension === '.png') {
        imageEmbed = await pdfDoc.embedPng(imageBytes);
      } else {
        throw new Error('Unsupported image format');
      }

      // ✅ Match preview size of ~120px width from frontend (normalized already)
      const desiredWidthPx = 120;
      const scaleRatio = desiredWidthPx / imageEmbed.width;
      const scaledImage = imageEmbed.scale(scaleRatio);

        page.drawImage(imageEmbed, {
         x: x - scaledImage.width / 2,      // ✅ Fix center alignment
        y: y - scaledImage.height / 2,     // ✅ Fix center alignment
        width: scaledImage.width,
        height: scaledImage.height,
        opacity: parseFloat(opacity),
        rotate: degrees(-rotation),// ✅ Image rotation

      });

    } else {
      // ✅ Text fallback watermark
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const textWidth = font.widthOfTextAtSize(watermarkText, parseInt(fontSize));
        const textHeight = font.heightAtSize(parseInt(fontSize));
      page.drawText(watermarkText, {
         x: x - textWidth / 2, // ✅ center text
          y: y - textHeight / 2,   // ✅ Fix center alignment
        size: parseInt(fontSize),
        font,
        color: rgb(0, 0, 0),
        opacity: parseFloat(opacity),
        rotate:degrees(-rotation), // ✅ Text rotation
        
      });
    }

    // ✅ Save and return file
    const outputPath = path.join(__dirname, 'output', `${Date.now()}-watermarked.pdf`);
    fs.writeFileSync(outputPath, await pdfDoc.save());
    res.json({ url: '/output/' + path.basename(outputPath) });

  } catch (err) {
    console.error('Error applying watermark:', err);
    res.status(500).send('Failed to add watermark');
  }
});

app.listen(port,'0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});


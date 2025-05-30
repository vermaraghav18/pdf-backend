const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");  // <-- ADD THIS

// 🔴 RUNTIME FOLDER SAFETY START 🔴
const fs = require('fs');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

ensureDir('./outputs');
ensureDir('./test-output');
ensureDir('./temp_slides_1748496268054');
// 🔴 RUNTIME FOLDER SAFETY END 🔴

// Middleware & Helpers
const { upload } = require('./uploadMiddleware');
const logRequest = require('./routes/logRequest');
const errorHandler = require('./routes/errorHandler');

// Feature Routes
const rotatePdf = require('./routes/rotatePdf');     // ✅ NEW
const compressPdf = require('./routes/compressPdf');
const convertHtmlToPdf = require('./routes/convertHtmlToPdf');
const convertPdfToJpg = require('./routes/convertPdfToJpg');
const addPageNumbers = require('./routes/addPageNumbers');
const statusCheck = require('./routes/statusCheck');
const mergePdf = require('./routes/mergePdf');
const splitPdf = require('./routes/splitPdf');
const protectPdf = require('./routes/protectPdf');
const unlockPdf = require('./routes/unlockPdf');
const repairPdf = require('./routes/repairPdf');
const convertPdfToExcel = require('./routes/convertPdfToExcel');
const convertExcelToPdf = require('./routes/convertExcelToPdf');
const convertPdfToWord = require('./routes/convertPdfToWord');
const convertWordToPdf = require('./routes/convertWordToPdf');
const convertPdfToPpt = require('./routes/convertPdfToPpt');
const convertPptToPdf = require('./routes/convertPptToPdf');
const jpgToPdf = require('./routes/jpgToPdf');
const cropPdf = require('./routes/cropPdf');
const redactPdf = require('./routes/redactPdf');
const signPdf = require('./routes/signPdf');
const watermarkPdf = require('./routes/watermarkPdf');
const comparePdf = require('./routes/comparePdf');
const organizePdf = require('./routes/organizePdf');
const editPdf = require('./routes/editPdf');
const downloadRouter = require('./routes/downloadRouter');
const deleteTempFiles = require('./routes/deleteTempFiles');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "⚠️ Too many requests from this IP. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);


// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(logRequest); // Request logging

// Health Check
app.get('/', (req, res) => res.send('✅ Server is running'));

// Upload route (used for testing uploads)
app.post('/upload', upload.single('pdf'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  res.json({ filePath: `/uploads/${req.file.filename}`, filename: req.file.filename });
});

// Feature Routes 
app.use('/api/rotate', rotatePdf);       // ✅ NEW
app.use('/api/convert-html-to-pdf', convertHtmlToPdf);
app.use('/api/convert-pdf-to-jpg', convertPdfToJpg);
app.use('/api/add-page-numbers', addPageNumbers);
app.use('/api/merge', mergePdf);
app.use('/api/split', splitPdf);
app.use('/api/compress', compressPdf);
app.use('/api/protect', protectPdf);
app.use('/api/unlock', unlockPdf);
app.use('/api/repair', repairPdf);
app.use('/api/convert-pdf-to-excel', convertPdfToExcel);
app.use('/api/convert-excel-to-pdf', convertExcelToPdf);
app.use('/api/convert-pdf-to-word', convertPdfToWord);
app.use('/api/convert-word-to-pdf', convertWordToPdf);
app.use('/api/pdf-to-ppt', convertPdfToPpt);
app.use('/api/ppt-to-pdf', convertPptToPdf);
app.use('/api/jpg-to-pdf', jpgToPdf);
app.use('/api/crop', cropPdf);
app.use('/api/redact', redactPdf);
app.use('/api/sign', signPdf);
app.use('/api/watermark', watermarkPdf);
app.use('/api/compare', comparePdf);
app.use('/api/organize', organizePdf);
app.use('/api/edit', editPdf);
app.use('/api/download', downloadRouter);
app.use('/api/delete-temp', deleteTempFiles);
app.use('/api/status', statusCheck);

app.use(helmet());



// Error Handler
app.use(errorHandler);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});


// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

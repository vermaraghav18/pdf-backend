const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { PDFDocument } = require('pdf-lib');

const router = express.Router();

// 🧩 Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// 🧹 Utility: Clean up temp files
function cleanup(paths) {
  paths.forEach(p => {
    try {
      fs.existsSync(p) && fs.unlinkSync(p);
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });
}

// 📦 Utility: Write specific pages to new PDFs
async function writePagesToZip(pdfDoc, pageIndices, prefix) {
  const outputDir = path.join(__dirname, '../outputs');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputFiles = [];

  for (let i = 0; i < pageIndices.length; i++) {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndices[i]]);
    newPdf.addPage(copiedPage);

    const pdfBytes = await newPdf.save();
    const outPath = path.join(outputDir, `${prefix}_page${pageIndices[i] + 1}.pdf`);
    fs.writeFileSync(outPath, pdfBytes);
    outputFiles.push(outPath);
  }

  return outputFiles;
}

// 🎯 /api/split (POST)
router.post('/', upload.single('file'), async (req, res) => {
  const { mode, range, pages } = req.body;
  const inputPath = req.file.path;

  try {
    const pdfDoc = await PDFDocument.load(fs.readFileSync(inputPath));
    const totalPages = pdfDoc.getPageCount();

    let pageIndices = [];

    if (mode === 'range') {
      if (!range || !range.includes('-')) throw new Error('Invalid range input');
      const [start, end] = range.split('-').map(n => parseInt(n.trim()));
      if (start < 1 || end > totalPages || start > end) throw new Error('Invalid range values');
      pageIndices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
    } else if (mode === 'pages') {
      if (!pages) throw new Error('No pages provided');
      pageIndices = pages.split(',').map(p => parseInt(p.trim()) - 1).filter(p => p >= 0 && p < totalPages);
      if (pageIndices.length === 0) throw new Error('No valid pages selected');
    } else {
      pageIndices = Array.from({ length: totalPages }, (_, i) => i); // All pages
    }

    const splitFiles = await writePagesToZip(pdfDoc, pageIndices, 'split');
    const zipPath = path.join(__dirname, '../outputs/split_result.zip');
    const zip = fs.createWriteStream(zipPath);
    const archive = archiver('zip');

    archive.pipe(zip);
    splitFiles.forEach(f => archive.file(f, { name: path.basename(f) }));
    archive.finalize();

    zip.on('close', () => {
      res.download(zipPath, 'split_result.zip', () => {
        cleanup([inputPath, zipPath, ...splitFiles]);
      });
    });

  } catch (err) {
    console.error('❌ Split PDF Error:', err);
    res.status(500).send('Error splitting PDF');
  }
});

module.exports = router;

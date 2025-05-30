// routes/convertPdfToExcel.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ExcelJS = require('exceljs');
const multer = require('multer');

const router = express.Router();

// Setup multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// 📥 POST route
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const inputPdf = path.resolve(req.file.path).replace(/\\/g, '/');
    const outputDir = path.dirname(inputPdf);
    const baseName = path.basename(inputPdf, '.pdf');

    console.log('📄 Input PDF:', inputPdf);
    console.log('📂 Output directory:', outputDir);

    // Step 1: Run pdf2json
    const cmd = `pdf2json -f "${inputPdf}" -o "${outputDir}"`;
    console.log('🛠️ Running command:', cmd);
    execSync(cmd, { stdio: 'inherit' });

    // Step 2: Read generated JSON
    const files = fs.readdirSync(outputDir);
    console.log('📁 Files in outputDir:', files);

    const jsonFile = files.find(f => f.includes(baseName) && f.endsWith('.json'));
    if (!jsonFile) throw new Error('❌ No JSON output found from pdf2json');

    const jsonPath = path.join(outputDir, jsonFile);
    console.log('📄 Found JSON file:', jsonPath);

    const json = fs.readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(json);

    const pages = parsed.Pages || (parsed.formImage && parsed.formImage.Pages);
    if (!pages) throw new Error('❌ No Pages array found in JSON');

    console.log(`📄 Pages detected: ${pages.length}`);

    // Step 3: Create Excel
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
        lines.get(y).push({ x, text });
      }

      const sortedLines = [...lines.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
      for (const [, line] of sortedLines) {
        line.sort((a, b) => a.x - b.x);
        const fullLine = line.map(t => t.text).join('').trim();
        sheet.getCell(`A${row++}`).value = fullLine;
      }
    }

    const outputExcel = path.join(outputDir, `${baseName}.xlsx`);
    await workbook.xlsx.writeFile(outputExcel);
    console.log('✅ Excel written:', outputExcel);

    res.download(outputExcel, 'converted.xlsx', () => {
      [inputPdf, jsonPath, outputExcel].forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });
    });
  } catch (err) {
    console.error('❌ PDF to Excel Error:', err);
    res.status(500).send(err.message || 'Conversion failed');
  }
});

module.exports = router;

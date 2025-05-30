const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');
const multer = require('multer');
const express = require('express');

const router = express.Router();

// Configure storage with better filename handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Add file type validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (XLS, XLSX, ODS) are allowed'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Configure LibreOffice path
const libreOfficePath = process.env.LIBREOFFICE_PATH || 'soffice';

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputPath = path.resolve(req.file.path);
    const outputDir = path.dirname(inputPath);
    const fileNameWithoutExt = path.basename(
      req.file.filename, 
      path.extname(req.file.filename)
    );
    const expectedOutput = path.join(outputDir, fileNameWithoutExt + '.pdf');

    // Execute conversion with error handling
    try {
      execSync(
        `"${libreOfficePath}" --headless --convert-to pdf "${inputPath}" --outdir "${outputDir}"`,
        { stdio: 'pipe', timeout: 60000 } // 60 second timeout
      );
    } catch (execError) {
      console.error('LibreOffice conversion error:', execError.stderr?.toString());
      throw new Error('Failed to convert file');
    }

    // Wait for file to be created
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify output
    if (!fs.existsSync(expectedOutput)) {
      throw new Error('Conversion succeeded but output file not found');
    }

    // Set proper headers for download
    res.download(
      expectedOutput,
      `${fileNameWithoutExt}.pdf`,
      (err) => {
        // Cleanup files whether download succeeded or failed
        [inputPath, expectedOutput].forEach(file => {
          try {
            if (fs.existsSync(file)) fs.unlinkSync(file);
          } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
          }
        });
        
        if (err) {
          console.error('Download error:', err);
        }
      }
    );

  } catch (err) {
    console.error('❌ Excel to PDF conversion error:', err);
    res.status(500).json({ 
      error: 'Failed to convert Excel to PDF',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
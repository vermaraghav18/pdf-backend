// backend/uploadMiddleware.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});




// ---- File Type Filters ----

// PDF files only
const pdfFileFilter = (req, file, cb) => {
  file.mimetype === 'application/pdf'
    ? cb(null, true)
    : cb(new Error('Only PDF files are allowed'), false);
};


const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// DOCX files only
const docxFileFilter = (req, file, cb) => {
  file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ? cb(null, true)
    : cb(new Error('Only Word files are allowed'), false);
};

// Excel files only
const excelFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  allowedTypes.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Only Excel files are allowed'), false);
};

// Image files only (PNG, JPG, JPEG, etc.)
const imageFileFilter = (req, file, cb) => {
  file.mimetype.startsWith('image/')
    ? cb(null, true)
    : cb(new Error('Only image files are allowed'), false);
};

// ✅ PowerPoint files only
const pptFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  allowedTypes.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Only PowerPoint files are allowed'), false);
};



// ---- Named Uploaders ----
const upload = multer({ storage, fileFilter: pdfFileFilter }); // Default PDF upload
const uploadPDF = multer({ storage, fileFilter: pdfFileFilter });
const uploadDOCX = multer({ storage, fileFilter: docxFileFilter });
const uploadExcel = multer({ storage, fileFilter: excelFileFilter });
const uploadJPG = multer({ storage, fileFilter: imageFileFilter });
const imageUpload = multer({ storage, fileFilter: imageFileFilter });
const uploadPPT = multer({ storage, fileFilter: pptFileFilter }); // ✅ NEW
const uploadWatermarkPDF = multer({ storage, fileFilter: pdfFileFilter });
const uploadWatermarkImage = multer({ storage, fileFilter: imageFileFilter }); 

// ✅ New: Allows BOTH PDF and Image (for watermarking)
const mixedUpload = multer({ storage }).fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);


// ---- Exports ----
module.exports = {
  upload,
  uploadPDF,
  uploadDOCX,
  uploadExcel,
  uploadJPG,
  imageUpload,
  uploadPPT, // ✅ Exported here
  uploadWatermarkPDF,
  uploadWatermarkImage,// ✅ ✅ Export this for watermark API
  mixedUpload, // ✅ NEW
};



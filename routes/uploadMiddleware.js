const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ Allowed mimetypes
const allowedTypes = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'        // .xlsx
];

// ✅ Dynamic folder setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const feature = req.body.feature || 'general';
    const folder = path.join(__dirname, `../uploads/${feature}`);
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + '-' + file.originalname;
    cb(null, filename);
  }
});

// ✅ Multer upload instance
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    console.log(`🔄 Uploading: ${file.originalname} (${file.mimetype})`);
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('❌ Unsupported file type'));
  }
});

// ✅ Optional helper: auto-cleanup old files (run manually or daily)
function autoCleanUploads(dirPath, maxAgeMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  fs.readdirSync(dirPath).forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (now - stat.mtimeMs > maxAgeMs) {
      fs.unlinkSync(fullPath);
      console.log(`🧹 Deleted old file: ${file}`);
    }
  });
}

// ✅ Hook: attach upload metadata (optional middleware)
function logUploadMetadata(req, res, next) {
  if (req.file) {
    const folder = path.dirname(req.file.path);
    const metaPath = path.join(folder, `${Date.now()}-meta.json`);
    const metadata = {
      originalName: req.file.originalname,
      savedAs: req.file.filename,
      time: new Date().toISOString(),
      type: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    };
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
    console.log(`📝 Metadata saved to: ${metaPath}`);
  }
  next();
}

// ✅ Middleware to validate presence of uploaded files
function validateUploads(requiredFields = []) {
  return function (req, res, next) {
    if (!req.files) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    for (let field of requiredFields) {
      const isMissing =
        !req.files[field] || req.files[field].length === 0;

      if (isMissing) {
        return res.status(400).json({ error: `Missing file: ${field}` });
      }
    }

    next();
  };
}

module.exports = {
  upload,
  autoCleanUploads,
  logUploadMetadata,
  validateUploads, // ⬅️ Export it
};

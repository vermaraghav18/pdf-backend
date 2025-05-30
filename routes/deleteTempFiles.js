const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.post('/', (req, res) => {
  const { filePath } = req.body;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ success: true, deleted: filePath });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;


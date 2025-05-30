const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

router.get('/:filename', (req, res) => {
  const file = path.join(__dirname, '../uploads', req.params.filename);

  if (fs.existsSync(file)) {
    res.download(file);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

module.exports = router;

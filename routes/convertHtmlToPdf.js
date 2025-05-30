const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.post('/', async (req, res) => {
  const { html } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content is required.' });
  }

  try {
    const apiKey = process.env.PDFSHIFT_API_KEY;

    const response = await axios.post(
      'https://api.pdfshift.io/v3/convert/html',
      html,
      {
        headers: {
          'Content-Type': 'text/plain',
        },
        auth: {
          username: apiKey,
          password: '', // no password needed
        },
        responseType: 'arraybuffer',
      }
    );

    const outputPath = path.join('/tmp', `html-output-${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, response.data);

    res.download(outputPath);
  } catch (error) {
    console.error('PDFShift API Error:', error.message);
    res.status(500).json({ error: 'Failed to convert HTML to PDF.' });
  }
});

module.exports = router;

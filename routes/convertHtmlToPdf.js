const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const validator = require('validator');
const sanitizeHtml = require('sanitize-html');

const router = express.Router();

router.post('/', async (req, res) => {
  const { html } = req.body;

  // ✅ Basic validation
  if (!html || typeof html !== 'string' || (!validator.isURL(html) && !html.trim().startsWith('<'))) {
    return res.status(400).send('Invalid input. Must be a valid URL or HTML.');
  }

  try {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();

    if (validator.isURL(html.trim())) {
      // ✅ Trusted external URL
      await page.goto(html, { waitUntil: 'networkidle2' });
    } else {
      // ✅ Sanitize HTML
      const cleanHtml = sanitizeHtml(html, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'style']),
        allowedAttributes: {
          '*': ['href', 'align', 'alt', 'center', 'bgcolor', 'src', 'title', 'width', 'height', 'style'],
        }
      });

      await page.setContent(cleanHtml);
    }

    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    // 📁 Output path
    const outputDir = process.env.OUTPUT_DIR || path.join(__dirname, '../uploads');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `html_${Date.now()}.pdf`);
    await fs.promises.writeFile(outputPath, pdfBuffer);

    // 🧹 Cleanup after sending
    res.download(outputPath, () => {
      fs.unlink(outputPath, err => {
        if (err) console.error("Failed to delete temp file:", err);
      });
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send('Failed to convert HTML to PDF');
  }
});

module.exports = router;

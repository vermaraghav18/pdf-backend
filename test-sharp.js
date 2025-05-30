const sharp = require('sharp');

(async () => {
  try {
    // Create a blank 300x200 PNG image
    await sharp({
      create: {
        width: 300,
        height: 200,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 } // Semi-transparent red
      }
    })
    .png()
    .toFile('test-output.png');

    console.log('✅ sharp is working! Check test-output.png');
  } catch (err) {
    console.error('❌ sharp failed:', err);
  }
})();

const fs = require('fs');
const path = require('path');
const imageSize = require('image-size'); // Ensure installed via: npm install image-size

function getImageSizeInInches(imagePath) {
  try {
    const buffer = fs.readFileSync(imagePath);
    const { width, height } = imageSize(buffer);

    // Convert from px to inches (assuming 96 DPI)
    return {
      widthInInches: width / 96,
      heightInInches: height / 96,
    };
  } catch (error) {
    console.error(`❌ Failed to get image size for ${imagePath}:`, error);
    return { widthInInches: 10, heightInInches: 7.5 }; // fallback
  }
}

module.exports = { getImageSizeInInches };

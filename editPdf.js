const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { projectToPdfCoordinates } = require('./utils/coordinateUtils');

async function editPdf(pdfPath, annotations) {
  const pdfBytes = fs.readFileSync(path.resolve(__dirname, pdfPath));
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const hexToRgb = (hex) => {
    const parsed = hex.replace('#', '');
    const bigint = parseInt(parsed, 16);
    return {
      r: ((bigint >> 16) & 255) / 255,
      g: ((bigint >> 8) & 255) / 255,
      b: (bigint & 255) / 255,
    };
  };

  for (const annotation of annotations) {
    const page = pdfDoc.getPage(annotation.page - 1);
    const { width: pdfWidth, height: pdfHeight } = page.getSize();

    if (annotation.type === 'text') {
      const { x, y } = projectToPdfCoordinates(
        {
          xPercent: annotation.xPercent,
          yPercent: annotation.yPercent,
          textHeightPercent: annotation.textHeightPercent || 0.02,
        },
        pdfWidth,
        pdfHeight
      );

      page.drawText(annotation.content, {
        x,
        y,
        size: annotation.styles?.fontSize || 16,
        font,
        color: rgb(0, 0, 0),
      });

    } else if (annotation.type === 'shape') {
      const {
        xPercent,
        yPercent,
        width: shapeWidth,
        height: shapeHeight,
        shape,
        styles = {},
      } = annotation;

      const color = styles.color || '#FF0000';
      const borderWidth = styles.borderWidth || 2;
      const rgbColor = rgb(...Object.values(hexToRgb(color)));

      // Project top-left corner of shape
      const { x, y } = projectToPdfCoordinates(
        {
          xPercent,
          yPercent,
          textHeightPercent: shapeHeight / pdfHeight,
        },
        pdfWidth,
        pdfHeight
      );

      if (shape === 'rectangle') {
        page.drawRectangle({
          x,
          y,
          width: shapeWidth,
          height: shapeHeight,
          borderColor: rgbColor,
          borderWidth: borderWidth,
        });

      } else if (shape === 'circle') {
        const radiusX = shapeWidth / 2;
        const radiusY = shapeHeight / 2;

        page.drawEllipse({
          x: x + radiusX,
          y: y + radiusY,
          xScale: radiusX,
          yScale: radiusY,
          borderColor: rgbColor,
          borderWidth: borderWidth,
        });

      } else if (shape === 'line') {
        page.drawLine({
          start: { x, y: y + shapeHeight / 2 },
          end: { x: x + shapeWidth, y: y + shapeHeight / 2 },
          color: rgbColor,
          thickness: borderWidth,
        });
      }
    }
  }

  return await pdfDoc.save();
}

module.exports = { editPdf };

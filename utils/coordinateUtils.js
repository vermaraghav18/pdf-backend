function projectToPdfCoordinates(
  { xPercent, yPercent, textHeightPercent },
  pdfWidth,
  pdfHeight
) {
    const offsetX = 260; // Try 20pt, adjust by observing

  const x = (xPercent * pdfWidth)+offsetX;
  const y = pdfHeight - (yPercent * pdfHeight) - (textHeightPercent * pdfHeight);

  return { x, y };
}

module.exports = { projectToPdfCoordinates };

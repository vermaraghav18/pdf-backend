# ✅ 1. Use slim base image
FROM node:18-slim

# ✅ 2. Set Puppeteer env to skip Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# ✅ 3. Set working directory
WORKDIR /app

# ✅ 4. Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ghostscript \
    poppler-utils \
    qpdf \
    libreoffice \
    unoconv \
    imagemagick \
    graphicsmagick \
    fonts-liberation \
    fonts-dejavu \
    libvips-dev \
    curl && \
    sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml || true && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ✅ 5. Copy package files separately for layer caching
COPY package*.json ./

# ✅ 6. Install production dependencies (puppeteer skipped Chromium)
RUN npm install --omit=dev

# ✅ 7. Copy rest of backend code (after dependencies)
COPY . .

# ✅ 8. Expose backend port
EXPOSE 5000

# ✅ 9. Start the server
CMD ["node", "server.js"]

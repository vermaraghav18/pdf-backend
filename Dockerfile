FROM node:20-bullseye

# Install required Linux tools
RUN apt-get update && apt-get install -y \
    ghostscript \
    qpdf \
    poppler-utils \
    tesseract-ocr \
    libreoffice \
    imagemagick \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set sharp environment to avoid broken binary download
ENV npm_config_sharp_binary_host="" \
    npm_config_sharp_libvips_binary_host=""

# Copy package files first for layer caching
COPY package*.json ./

# Install dependencies (build sharp from source here)
RUN npm install --build-from-source=sharp

# Copy all remaining source files
COPY . .

EXPOSE 5000
CMD ["node", "server.js"]

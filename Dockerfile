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

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000
CMD ["node", "server.js"]
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const TEST_FILES_DIR = path.join(__dirname, 'test-files');
const OUTPUT_DIR = path.join(__dirname, 'test-output');

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// 🧪 All routes
const testEndpoints = [
  
  { route: '/api/merge', files: ['version1.pdf', 'version2.pdf'] },
  { route: '/api/split', file: 'sample1.pdf', extraFields: { mode: 'pages', pages: '1' } },
  { route: '/api/convert-pdf-to-word', file: 'sample1.pdf' },
  { route: '/api/convert-word-to-pdf', file: 'sample1.docx' },
  { route: '/api/convert-pdf-to-excel', file: 'sample1.pdf' },
  { route: '/api/convert-excel-to-pdf', file: 'sample1.xlsx' },
  { route: '/api/compress', file: 'sample1.pdf' },
  { route: '/api/repair', file: 'sample1.pdf' },
  { route: '/api/unlock', file: 'locked.pdf', extraFields: { password: 'mypassword123' } },
  { route: '/api/protect', file: 'sample1.pdf', extraFields: { password: '123456' } },
  { route: '/api/crop', file: 'sample1.pdf', extraFields: { cropData: JSON.stringify([{ pageIndex: 0, x: 50, y: 50, width: 300, height: 400 }]) } },
  { route: '/api/rotate', file: 'sample1.pdf', extraFields: { rotations: JSON.stringify([{ pageIndex: 0, angle: 90 }]) } },
  { route: '/api/watermark', file: 'sample1.pdf', extraFields: { watermarkText: 'CONFIDENTIAL', position: 'center' } },
  { route: '/api/sign', file: 'sample1.pdf', extraFields: { signatureText: 'John Doe', position: 'bottom-right' } },
{
  route: '/api/organize',
  file: 'sample1.pdf',
  extraFields: {
    instructions: JSON.stringify([
      { action: 'keep', pageIndex: 0, rotate: 90 }
    ])
  }
},


  { route: '/api/compare', files: ['version1.pdf', 'version2.pdf'] },
  { route: '/api/pdf-to-ppt', file: 'sample1.pdf' },
  { route: '/api/ppt-to-pdf', file: 'sample1.pptx' },
  { route: '/api/convert-excel-to-pdf', file: 'sample1.xlsx' },
  { route: '/api/convert-pdf-to-jpg', file: 'sample1.pdf' },

];

async function runTest(endpoint) {
  const url = `${BASE_URL}${endpoint.route}`;
  const form = new FormData();

  if (endpoint.files) {
    endpoint.files.forEach(file => {
      form.append('files', fs.createReadStream(path.join(TEST_FILES_DIR, file)));
    });
  } else {
    form.append('file', fs.createReadStream(path.join(TEST_FILES_DIR, endpoint.file)));
  }

  if (endpoint.extraFields) {
    for (const key in endpoint.extraFields) {
      form.append(key, endpoint.extraFields[key]);
    }
  }

  try {
    const response = await axios.post(url, form, {
      headers: form.getHeaders(),
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    const contentType = response.headers['content-type'];
    const routeName = endpoint.route.replace('/api/', '');
    let extension = '';
      if (contentType.includes('application/pdf')) {
        extension = '.pdf';
      } else if (contentType.includes('application/json')) {
        extension = '.json';
      } else if (contentType.includes('application/zip')) {
        extension = '.zip';
      } else if (contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        extension = '.docx';
      } else if (contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        extension = '.xlsx';
      } else if (contentType.includes('application/vnd.openxmlformats-officedocument.presentationml.presentation')) {
        extension = '.pptx';
      } else if (contentType.includes('image/jpeg')) {
        extension = '.jpg';
      } else if (contentType.includes('image/png')) {
        extension = '.png';
      } else {
        console.log(`⚠️ Unexpected content type from ${endpoint.route}: ${contentType}`);
        return;
      }



   const outputPath = path.join(__dirname, 'test-output', `${routeName}_output${extension}`);

      if (extension === '.json') {
        const jsonData = JSON.parse(response.data.toString());
        fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
      } else {
        fs.writeFileSync(outputPath, response.data);
      }

      console.log(`✅ Success: ${endpoint.route} (${extension.toUpperCase()} file saved)`);


  } catch (err) {
    console.error(`❌ Fail: ${endpoint.route} →`, err.message);
  }
}

async function runAllTests() {
  console.log(`🧪 Running tests for ${testEndpoints.length} endpoints...`);
  for (const endpoint of testEndpoints) {
    await runTest(endpoint);
  }
  console.log('✅ All tests completed.');
}

runAllTests();

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
  try {
    // Create a dummy image file
    const dummyPath = path.join(__dirname, 'test_image.png');
    fs.writeFileSync(dummyPath, 'fake image content');

    const formData = new FormData();
    formData.append('image', fs.createReadStream(dummyPath));

    console.log('Sending request to http://localhost:3001/process-syllabus...');
    const response = await axios.post('http://localhost:3001/process-syllabus', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testUpload();

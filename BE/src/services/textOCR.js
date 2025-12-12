const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const { processWithAI } = require("../services/clovaStudio");

async function processOCR(filePath, originalName) {
  const SECRET_KEY_OCR = process.env.SECRET_KEY_OCR;
  const CLOVA_OCR_URL = process.env.CLOVA_OCR_URL;

  if (!CLOVA_OCR_URL || CLOVA_OCR_URL.includes('your_ocr_url')) {
    throw new Error("Invalid CLOVA_OCR_URL configuration. Please check your .env file.");
  }

  const imageFile = fs.readFileSync(filePath);
  const fileExtension = originalName.split('.').pop().toLowerCase();
  
  const formData = new FormData();
  formData.append('message', JSON.stringify({
    version: "V2",
    requestId: `req-${Date.now()}`,
    timestamp: Date.now(),
    images: [{ format: fileExtension, name: "image" }]
  }));
  formData.append('file', imageFile, {
    filename: originalName,
    contentType: `image/${fileExtension}`
  });

  try {
    const response = await axios.post(CLOVA_OCR_URL, formData, {
      headers: {
        "X-OCR-SECRET": SECRET_KEY_OCR,
        ...formData.getHeaders()
      },
      timeout: 60000
    });

    return response.data;
  } catch (error) {
    console.error("Clova OCR Error:");
    if (error.response) {
      console.error("- Status:", error.response.status);
      console.error("- Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("- Message:", error.message);
    }
    throw error;
  }
}

async function processOCRWithAI(filePath, originalName, systemPrompt) {
  const ocrResult = await processOCR(filePath, originalName);
  
  const extractedText = ocrResult.images[0].fields
    .map(field => field.inferText)
    .join(' ');
  
  return extractedText;
}

module.exports = { processOCR, processOCRWithAI };

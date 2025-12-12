require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { processOCRWithAI } = require("./src/services/textOCR");
const { extractSyllabusData } = require("./src/services/clovaStudio");
const { normalizeSyllabusResult } = require("./src/utils/resultNormalizer");
const chatRoutes = require("./src/routes/chatRoutes");

const app = express();
const PORT = process.env.PORT || 3001;

// Validate required environment variables
const requiredEnvVars = [
  'SECRET_KEY_OCR',
  'CLOVA_OCR_URL',
  'CLOVA_STUDIO_API_KEY',
  'CLOVA_STUDIO_URL'
];

const missingVars = requiredEnvVars.filter(key => !process.env[key]);
const invalidVars = requiredEnvVars.filter(key => {
  const value = process.env[key];
  return value && (value.includes('your_') || value.length < 10);
});

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

if (invalidVars.length > 0) {
  console.error('❌ Invalid environment variables (likely placeholders):', invalidVars.join(', '));
  console.error('Please update .env with actual values.');
  process.exit(1);
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExt = /\.(jpe?g|png|pdf)$/i;
    const hasAllowedExt = allowedExt.test(file.originalname || "");
    const mimetypeOk =
      !file.mimetype ||
      file.mimetype === "application/pdf" ||
      file.mimetype.startsWith("image/");

    if (hasAllowedExt || mimetypeOk) {
      return cb(null, true);
    }

    return cb(new Error("Only JPEG, PNG, PDF allowed"));
  },
});

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Syllabus to Calendar</title>
      <style>
        body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
        input[type="file"] { margin: 20px 0; }
        button { padding: 10px 20px; cursor: pointer; background: #0066cc; color: white; border: none; border-radius: 4px; }
        button:hover { background: #0052a3; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        #result { margin-top: 20px; padding: 15px; background: #f5f5f5; white-space: pre-wrap; border-radius: 4px; min-height: 50px; }
        .progress { color: #0066cc; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Syllabus to Calendar</h1>
      <input type="file" id="imageInput" accept="image/*">
      <button id="processBtn" onclick="processImage()">Process Syllabus</button>
      <div id="result"></div>

      <script>
        async function processImage() {
          const file = document.getElementById('imageInput').files[0];
          if (!file) return alert('Please select an image');

          const formData = new FormData();
          formData.append('image', file);

          const resultDiv = document.getElementById('result');
          const btn = document.getElementById('processBtn');
          
          btn.disabled = true;
          resultDiv.className = 'progress';
          resultDiv.textContent = 'Đang tải lên...';

          try {
            const response = await fetch('/process-syllabus-stream', { method: 'POST', body: formData });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\\n').filter(line => line.startsWith('data: '));
              
              for (const line of lines) {
                const data = JSON.parse(line.substring(6));
                
                if (data.error) {
                  resultDiv.className = '';
                  resultDiv.textContent = 'Error: ' + data.error;
                } else if (data.done) {
                  resultDiv.className = '';
                  resultDiv.textContent = JSON.stringify(data.result, null, 2);
                } else if (data.message) {
                  resultDiv.textContent = data.message;
                }
              }
            }
          } catch (error) {
            resultDiv.className = '';
            resultDiv.textContent = 'Error: ' + error.message;
          } finally {
            btn.disabled = false;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// SSE endpoint for real-time progress
app.post(
  "/process-syllabus-stream",
  upload.single("image"),
  async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const sendProgress = (step, message) => {
      sendEvent({ type: "progress", step, message });
    };

    try {
      if (!req.file) {
        sendEvent({
          type: "error",
          error: { message: "Image file is required" },
        });
        return res.end();
      }

      sendProgress(1, "Đang xử lý OCR...");
      const extractedText = await processOCRWithAI(
        req.file.path,
        req.file.originalname
      );
      fs.unlinkSync(req.file.path);

      sendProgress(2, "Đang phân tích với AI...");
      const aiResult = await extractSyllabusData(extractedText);
      const normalizedResult = normalizeSyllabusResult(aiResult);

      sendProgress(3, "Hoàn thành!");
      sendEvent({ type: "result", done: true, result: normalizedResult });
      res.end();
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      sendEvent({ type: "error", error: error.message || "Unknown error" });
      res.end();
    }
  }
);

// Original JSON endpoint (keep for backward compatibility)
app.post("/process-syllabus", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const extractedText = await processOCRWithAI(
      req.file.path,
      req.file.originalname
    );
    fs.unlinkSync(req.file.path);

    const aiResult = await extractSyllabusData(extractedText);
    const normalizedResult = normalizeSyllabusResult(aiResult);

    res.json(normalizedResult);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: "Failed to process syllabus",
      details: error.message,
    });
  }
});

app.use('/api/chat', chatRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

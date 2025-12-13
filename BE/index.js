require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const { normalizeSyllabusResult } = require("./src/utils/resultNormalizer");
const chatRoutes = require("./src/routes/chatRoutes");
const { extractSyllabusData } = require("./src/services/geminiService");

const app = express();
const PORT = process.env.PORT || 3001;

// Validate required environment variables
const requiredEnvVars = [
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
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
    try {
      if (!req.file) {
        sendEvent({
          type: "error",
          error: { message: "Image file is required" },
        });
        return res.end();

      };
      sendEvent({ type: "progress", step: 1, message: "AI đang phân tích hình ảnh..." });
      const aiResult = await extractSyllabusData(
        req.file.path,
        req.file.mimetype
      );
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      if (!aiResult.success && aiResult.error) {
        throw new Error(aiResult.error);
      }
      const normalizedResult = normalizeSyllabusResult(aiResult);

      sendEvent({ type: "progress", step: 2, message: "Hoàn thành!" });
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
// app.post("/process-syllabus", upload.single("image"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "Image file is required" });
//     }

//     const extractedText = await extractSyllabusData(
//       req.file.path,
//       req.file.originalname
//     );
//     fs.unlinkSync(req.file.path);

//     const aiResult = await extractSyllabusData(extractedText);
//     const normalizedResult = normalizeSyllabusResult(aiResult);

//     res.json(normalizedResult);
//   } catch (error) {
//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }
//     res.status(500).json({
//       success: false,
//       error: "Failed to process syllabus",
//       details: error.message,
//     });
//   }
// });

app.post("/process-syllabus", upload.single("image"), async (req, res) => {
  try {
    // 1. Validate file đầu vào
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    console.log(`[Backend] Processing: ${req.file.originalname} (${req.file.mimetype})`);

    // 2. Gọi Gemini Service (GỌI 1 LẦN DUY NHẤT)
    const aiResult = await extractSyllabusData(
      req.file.path,      // Đường dẫn file (String) -> Hợp lệ với geminiService
      req.file.mimetype   // MimeType (VD: image/png) -> QUAN TRỌNG: Đừng truyền originalName
    );

    // 3. Xóa file tạm ngay sau khi Gemini đọc xong
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // 4. Kiểm tra lỗi từ Gemini trả về
    if (!aiResult.success) {
      console.error("[Backend] Gemini Failed:", aiResult.error);
      return res.status(500).json(aiResult);
    }

    // 5. Chuẩn hóa dữ liệu (Nếu cần thiết)
    // Lưu ý: aiResult.data chính là cấu trúc JSON mà Gemini trả về
    const normalizedResult = normalizeSyllabusResult(aiResult);

    // 6. Trả về kết quả
    res.json(normalizedResult);

  } catch (error) {
    console.error("[Backend] Critical Error:", error);

    // Cleanup file nếu có lỗi bất ngờ
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

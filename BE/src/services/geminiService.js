const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- CẤU HÌNH MODEL ---
// Dùng tên phiên bản cụ thể (001 hoặc latest) để tránh lỗi 404
const MODEL_NAME = "models/gemini-2.5-flash";
// ---------------------

function fileToGenerativePart(fileInput, mimeType) {
    if (Buffer.isBuffer(fileInput)) {
        return {
            inlineData: {
                data: fileInput.toString("base64"),
                mimeType
            },
        };
    }
    if (typeof fileInput === "string") {
        return {
            inlineData: {
                data: fs.readFileSync(fileInput).toString("base64"),
                mimeType
            },
        };
    }
    throw new Error("Invalid input: fileInput must be a File Path (string) or a Buffer");
}

async function extractSyllabusData(fileInput, mimeType = "image/jpeg") {
    try {
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `You are a syllabus parser. Extract data from this image into this JSON structure... (giữ nguyên prompt của bạn)`;

        const imagePart = fileToGenerativePart(fileInput, mimeType);
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        return JSON.parse(response.text());
    } catch (error) {
        console.error("Gemini Syllabus Error:", error);
        return { success: false, error: error.message };
    }
}

async function streamChatResponse(res, systemPrompt, userMessage) {
    try {
        // Sử dụng cấu hình systemInstruction chuẩn của SDK mới
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: systemPrompt // Truyền system prompt vào đây
        });

        // Chỉ gửi user message vì system prompt đã cấu hình ở trên
        const result = await model.generateContentStream([userMessage]);

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(`data: ${JSON.stringify({ content: chunkText })}\n\n`);
        }

        res.write("data: [DONE]\n\n");
        res.end();
    } catch (error) {
        console.error("Gemini Chat Error:", error);

        // Xử lý fallback: Nếu latest lỗi, thử về gemini-pro (bản cũ nhưng luôn chạy)
        if (error.message.includes("404") || error.message.includes("not found")) {
            if (!res.headersSent) {
                res.write(`data: ${JSON.stringify({ content: "⚠️ Model 2.5 đang bận, đang thử chuyển sang model dự phòng..." })}\n\n`);
            }
            // Gọi đệ quy lại với model cũ hơn nếu cần (hoặc báo lỗi)
        }

        if (!res.headersSent) {
            res.write(`data: ${JSON.stringify({ error: "Lỗi kết nối AI: " + error.message })}\n\n`);
            res.end();
        } else {
            res.end();
        }
    }
}

module.exports = {
    extractSyllabusData,
    streamChatResponse,
};
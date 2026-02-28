const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODEL_NAME = "models/gemini-2.5-flash-lite";

function fileToGenerativePart(fileInput, mimeType) {
    if (typeof fileInput === "string") {
        return {
            inlineData: {
                data: fs.readFileSync(fileInput).toString("base64"),
                mimeType
            },
        };
    }
    throw new Error("Invalid file input");
}

async function extractSyllabusData(fileInput, mimeType) {
    // Lấy năm hiện tại để fix lỗi ngày tháng
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    try {
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
            }
        });

        // --- SỬA ĐỔI 1: Cập nhật Prompt và Schema ---
        const prompt = `
        You are a smart assistant converting a Syllabus Image into structured JSON data.
        
        CONTEXT:
        - Current Date: ${new Date().toISOString()}
        - Academic Year Context: ${currentYear}-${nextYear}
        - If an event date lacks a year, assume it falls within ${currentYear}-${nextYear}.

        Analyze the image and extract:
        1. "courseName": The name of the course.
        2. "instructor": Name of the professor.
        3. "startDate": The extract start date of the course/term (YYYY-MM-DD). If not explicitly found, leave null.
        4. "endDate": The extract end date of the course/term (YYYY-MM-DD). If not explicitly found, leave null.
        5. "events": A list of all assignments, exams, quizzes.

        OUTPUT SCHEMA (Strict JSON):
        {
            "courseName": "string",
            "instructor": "string",
            "startDate": "YYYY-MM-DD" | null,
            "endDate": "YYYY-MM-DD" | null,
            "events": [
                {
                    "title": "string",
                    "type": "assignment" | "exam",
                    "dueDate": "YYYY-MM-DD" | null,
                    "description": "string"
                }
            ]
        }
        `;

        const imagePart = fileToGenerativePart(fileInput, mimeType);
        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error("Invalid JSON from AI");
        }

        // --- SỬA ĐỔI 2: Tính toán tự động Start/End Date từ Events ---
        // Nếu AI không tìm thấy ngày bắt đầu/kết thúc, ta tự tính dựa trên sự kiện sớm nhất và muộn nhất
        if (data.events && Array.isArray(data.events) && data.events.length > 0) {
            // Lọc ra các event có ngày tháng hợp lệ
            const validDates = data.events
                .map(e => e.dueDate)
                .filter(d => d && !isNaN(new Date(d).getTime()))
                .map(d => new Date(d));

            if (validDates.length > 0) {
                // Sắp xếp tăng dần
                validDates.sort((a, b) => a - b);

                const minDate = validDates[0];
                const maxDate = validDates[validDates.length - 1];

                // Nếu AI trả về null hoặc ngày sai, ta ghi đè bằng ngày tính toán được
                if (!data.startDate) {
                    data.startDate = minDate.toISOString().split('T')[0];
                }
                if (!data.endDate) {
                    data.endDate = maxDate.toISOString().split('T')[0];
                }
            }
        }

        return {
            success: true,
            data: data
        };

    } catch (error) {
        console.error("Gemini OCR Error:", error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Giữ nguyên hàm chat stream
async function streamChatResponse(res, systemPrompt, userMessage) {
    try {
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: systemPrompt
        });

        const result = await model.generateContentStream([userMessage]);

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(`data: ${JSON.stringify({ content: chunkText })}\n\n`);
        }

        res.write("data: [DONE]\n\n");
        res.end();
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        res.write(`data: ${JSON.stringify({ error: "AI Error: " + error.message })}\n\n`);
        res.end();
    }
}

module.exports = {
    extractSyllabusData,
    streamChatResponse,
};
const Groq = require("groq-sdk");
require("dotenv").config();


console.log("DEBUG GROQ KEY:", process.env.GROQ_API_KEY ? "Đã có Key ✅" : "Thiếu Key ❌");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function detectIntentWithLlama(userMessage) {
  const systemPrompt = `
    You are an intent classifier JSON generator.
    Intents: CREATE_ASSIGNMENT, DELETE_ASSIGNMENT, QUERY.
    
    Output JSON format only:
    {
      "intent": "ENUM",
      "params": {
        "title": "string or null",
        "courseName": "string or null",
        "dueDate": "string or null"
      }
    }
    
    Examples:
    User: "Add homework to Math" -> {"intent": "CREATE_ASSIGNMENT", "params": {"title": "homework", "courseName": "Math", "dueDate": null}}
    User: "Delete Math hw" -> {"intent": "DELETE_ASSIGNMENT", "params": {"title": "Math hw"}}
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      // UPDATE THIS LINE: Use the currently supported versatile model
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      stream: false,
      response_format: { type: "json_object" }
    });

    // This returns an OBJECT, not a string
    return JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Llama/Groq Error:", error);
    return { intent: "QUERY", params: {} };
  }
}

async function streamChatWithLlama(res, systemPrompt, userMessage) {
  try {
    console.log("[Llama] Starting chat stream...");

    const stream = await groq.chat.completions.create({
      // Model 8B chạy siêu nhanh cho chat, hoặc dùng 70B nếu muốn thông minh hơn
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.5, // Hơi sáng tạo một chút cho tự nhiên
      max_tokens: 1024,
      stream: true, // Bật chế độ stream
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        // Gửi về Frontend đúng định dạng SSE
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
    console.log("[Llama] Chat finished successfully");

  } catch (error) {
    console.error("Llama Chat Error:", error);
    if (!res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Lỗi Groq: " + error.message })}\n\n`);
      res.end();
    } else {
      res.end();
    }
  }
}

module.exports = { detectIntentWithLlama, streamChatWithLlama };
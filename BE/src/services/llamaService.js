const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function detectIntentWithLlama(userMessage) {
  const systemPrompt = `
    You are an intent classifier. Analyze the user's message regarding a student scheduler.
    
    INTENTS:
    1. CREATE_ASSIGNMENT: User wants to add/create a task/homework/exam.
    2. DELETE_ASSIGNMENT: User wants to remove/delete a task.
    3. QUERY: User asks about schedule, time, or general chat.

    OUTPUT JSON ONLY:
    {
      "intent": "CREATE_ASSIGNMENT" | "DELETE_ASSIGNMENT" | "QUERY",
      "params": {
        "title": "string (extracted task name) or null",
        "courseName": "string (extracted subject) or null",
        "dueDate": "string (e.g., 'tomorrow', 'next friday', '2025-10-10') or null"
      }
    }
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      // Llama 3 70B Versatile rất tốt cho việc hiểu ngữ nghĩa phức tạp
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      stream: false,
      response_format: { type: "json_object" } // Bắt buộc trả về JSON
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) return { intent: "QUERY", params: {} };

    return JSON.parse(content);
  } catch (error) {
    console.error("Llama Intent Error:", error);
    // Fallback an toàn
    return { intent: "QUERY", params: {} };
  }
}

async function streamChatWithLlama(res, systemPrompt, userMessage) {
  try {
    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // Nhanh và rẻ cho chat thường
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 1024,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (error) {
    console.error("Llama Stream Error:", error);
    res.write(`data: ${JSON.stringify({ error: "Llama Error" })}\n\n`);
    res.end();
  }
}

module.exports = { detectIntentWithLlama, streamChatWithLlama };
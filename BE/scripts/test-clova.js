require("dotenv").config({ path: "./.env" });
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const crypto = require("crypto");

const IMAGE_PATH =
  process.argv[2] ||
  "../app/(dashboard)/courses/new/Screenshot 2025-11-18 at 15.23.11.png";

async function testOcr() {
  console.log("=== Testing CLOVA OCR ===");
  try {
    const form = new FormData();
    form.append(
      "message",
      JSON.stringify({
        version: "V2",
        requestId: `test-${Date.now()}`,
        timestamp: Date.now(),
        images: [{ format: "png", name: "test_image" }],
      })
    );
    form.append("file", fs.readFileSync(IMAGE_PATH), {
      filename: "test.png",
      contentType: "image/png",
    });

    const response = await axios.post(process.env.CLOVA_OCR_URL, form, {
      headers: {
        "X-OCR-SECRET": process.env.SECRET_KEY_OCR,
        ...form.getHeaders(),
      },
      timeout: 30000,
    });

    console.log("OCR response sample:", response.data?.images?.[0]?.fields?.slice(0, 3));
    return (
      response.data?.images?.[0]?.fields?.map((f) => f.inferText).join(" ") || ""
    );
  } catch (error) {
    console.error("OCR test failed:", error.message);
    throw error;
  }
}

async function testStudio(ocrText) {
  console.log("=== Testing CLOVA Studio ===");
  try {
    const response = await axios.post(
      process.env.CLOVA_STUDIO_URL,
      {
        messages: [
          { role: "system", content: "Summarize key assignments and exams." },
          { role: "user", content: ocrText.slice(0, 4000) },
        ],
        temperature: 0,
        topP: 0.1,
        topK: 1,
        repeatPenalty: 1.0,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CLOVA_STUDIO_API_KEY}`,
          "X-NCP-CLOVASTUDIO-REQUEST-ID": crypto.randomBytes(16).toString("hex"),
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("Studio response:", response.data?.result?.message?.content);
  } catch (error) {
    console.error("Studio test failed:", error.message);
    throw error;
  }
}

(async () => {
  try {
    const ocrText = await testOcr();
    await testStudio(ocrText);
    console.log("CLOVA OCR + Studio test complete.");
  } catch (error) {
    process.exit(1);
  }
})();


const VALID_EVENT_TYPES = new Set(["assignment", "exam"]);
const DEFAULT_COURSE_NAME = "Untitled Course";

// Giữ nguyên logic này
const ensureString = (value, fallback) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
};

// Giữ nguyên logic này
const ensureNullableString = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.toLowerCase() !== "n/a") {
      return trimmed;
    }
  }
  return null;
};

// --- THAY ĐỔI: Logic ngày tháng đơn giản hơn & mạnh mẽ hơn ---
const toIsoOrNull = (value) => {
  if (!value) return null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed.toLowerCase() === "n/a") return null;

  // Thử parse ngày tháng trực tiếp
  const date = new Date(trimmed);

  // Kiểm tra nếu ngày không hợp lệ (Invalid Date)
  if (isNaN(date.getTime())) {
    return null;
  }

  // Trả về chuẩn ISO 8601 (VD: 2025-10-20T00:00:00.000Z)
  return date.toISOString();
};

const normalizeEvents = (events) => {
  if (!Array.isArray(events)) {
    return [];
  }

  return events.map((event, index) => {
    // Đảm bảo event là object, nếu không bỏ qua hoặc tạo object rỗng để tránh crash
    const safeEvent = (event && typeof event === "object") ? event : {};

    return {
      // Logic: Nếu type không hợp lệ thì mặc định là assignment
      type: VALID_EVENT_TYPES.has(safeEvent.type) ? safeEvent.type : "assignment",

      title: ensureString(safeEvent.title, `Untitled Event ${index + 1}`),

      // Prompt Gemini mới trả về field là 'dueDate'
      dueDate: toIsoOrNull(safeEvent.dueDate),

      description: ensureString(safeEvent.description, ""),
    };
  });
};

function normalizeSyllabusResult(aiResult) {
  // --- THAY ĐỔI: Nhận đầu vào là object kết quả từ geminiService ---
  // geminiService hiện tại trả về: { success: true, data: {...} }

  if (!aiResult) {
    throw new Error("No result from AI service");
  }

  // Nếu input là chuỗi JSON (trường hợp fallback), thử parse
  let parsed = aiResult;
  if (typeof aiResult === "string") {
    try {
      parsed = JSON.parse(aiResult);
    } catch (e) {
      throw new Error("Invalid JSON string from AI");
    }
  }

  // Kiểm tra flag success từ service
  if (parsed.success !== true) {
    throw new Error(parsed.error || "AI processing failed");
  }

  const data = parsed.data;
  if (!data || typeof data !== "object") {
    throw new Error("AI response missing data object");
  }

  // --- Mapping dữ liệu cuối cùng ---
  const normalizedData = {
    courseName: ensureString(data.courseName, DEFAULT_COURSE_NAME),
    instructor: ensureNullableString(data.instructor),

    // Prompt mới không bắt buộc startDate/endDate ở root, nên để null nếu thiếu
    startDate: toIsoOrNull(data.startDate),
    endDate: toIsoOrNull(data.endDate),

    events: normalizeEvents(data.events),
  };

  return {
    success: true,
    data: normalizedData,
  };
}

module.exports = { normalizeSyllabusResult };
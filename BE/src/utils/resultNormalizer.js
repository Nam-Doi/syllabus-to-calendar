const VALID_EVENT_TYPES = new Set(["assignment", "exam"]);
const DEFAULT_COURSE_NAME = "Untitled Course";

const ensureString = (value, fallback) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
};

const ensureNullableString = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.toLowerCase() !== "n/a") {
      return trimmed;
    }
  }
  return null;
};

const normalizeDateInput = (value) => {
  let str = value.trim();
  if (!str.includes("T")) {
    return `${str}T00:00:00.000Z`;
  }

  let [datePart, timePart] = str.split("T");
  let zoneMatch = timePart.match(/([+-]\d{2}:?\d{2}|Z)$/);
  let zone = zoneMatch ? zoneMatch[0] : "Z";
  timePart = zoneMatch ? timePart.slice(0, -zone.length) : timePart;

  let timeSegments = timePart.split(":");
  timeSegments = timeSegments.filter(Boolean);
  while (timeSegments.length < 3) {
    timeSegments.push("00");
  }

  // Ensure milliseconds
  if (!timeSegments[2].includes(".")) {
    timeSegments[2] = `${timeSegments[2].padStart(2, "0")}.000`;
  }

  return `${datePart}T${timeSegments.join(":")}${zone}`;
};

const toIsoOrNull = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") {
    return null;
  }

  const normalizedInput = normalizeDateInput(trimmed);
  const date = new Date(normalizedInput);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

const normalizeEvents = (events) => {
  if (!Array.isArray(events)) {
    return [];
  }

  return events.map((event, index) => {
    if (!event || typeof event !== "object") {
      throw new Error(`Event #${index + 1} is not a valid object`);
    }

    return {
      type: VALID_EVENT_TYPES.has(event.type) ? event.type : "assignment",
      title: ensureString(event.title, `Untitled Event ${index + 1}`),
      dueDate: toIsoOrNull(event.dueDate),
      description: ensureString(event.description, ""),
    };
  });
};

function normalizeSyllabusResult(raw) {
  let parsed = raw;

  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error("AI response was not valid JSON");
    }
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response did not contain a JSON object");
  }

  if (parsed.success !== true) {
    const reason =
      typeof parsed.error === "string"
        ? parsed.error
        : "AI did not return a successful result";
    throw new Error(reason);
  }

  const data = parsed.data;
  if (!data || typeof data !== "object") {
    throw new Error("AI response missing data object");
  }

  const normalizedData = {
    courseName: ensureString(data.courseName, DEFAULT_COURSE_NAME),
    instructor: ensureNullableString(data.instructor),
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


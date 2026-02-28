const { detectIntentWithLlama } = require("../services/llamaService");

/**
 * Detect user intent and extract parameters
 * Returns: { intent: 'QUERY' | 'CREATE_ASSIGNMENT' | 'DELETE_ASSIGNMENT', params: {...} }
 */
async function detectIntent(message) {
    try {
        // Llama Service giờ đã trả về JSON Object chuẩn, không cần parse string thủ công nữa
        const response = await detectIntentWithLlama(message);

        // Validation cơ bản
        const validIntents = ['QUERY', 'CREATE_ASSIGNMENT', 'DELETE_ASSIGNMENT'];
        const intent = response?.intent && validIntents.includes(response.intent)
            ? response.intent
            : 'QUERY';

        return {
            intent: intent,
            params: response.params || {}
        };
    } catch (error) {
        console.error('Intent detection wrapper error:', error);
        return { intent: 'QUERY', params: {} };
    }
}

/**
 * Parse natural language date to YYYY-MM-DD format
 */
function parseDate(dateStr) {
    if (!dateStr) return null;

    const today = new Date();
    const dateStrLower = dateStr.toLowerCase().trim();

    // Handle relative dates
    if (dateStrLower === 'today') {
        return formatDate(today);
    }

    if (dateStrLower === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return formatDate(tomorrow);
    }

    // Handle "next [day]"
    const nextDayMatch = dateStrLower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (nextDayMatch) {
        const targetDay = nextDayMatch[1];
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDayIndex = daysOfWeek.indexOf(targetDay);
        const currentDayIndex = today.getDay();

        let daysToAdd = targetDayIndex - currentDayIndex;
        if (daysToAdd <= 0) daysToAdd += 7;

        const nextDay = new Date(today);
        nextDay.setDate(nextDay.getDate() + daysToAdd);
        return formatDate(nextDay);
    }

    // Try parsing as ISO date (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // Handle DD/MM or DD/MM/YYYY format
    const ddmmMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (ddmmMatch) {
        const day = parseInt(ddmmMatch[1]);
        const month = parseInt(ddmmMatch[2]) - 1; // JS months are 0-indexed
        const year = ddmmMatch[3] ?
            (ddmmMatch[3].length === 2 ? 2000 + parseInt(ddmmMatch[3]) : parseInt(ddmmMatch[3])) :
            today.getFullYear();

        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
            return formatDate(date);
        }
    }

    // Handle "DD Month" or "DD Month YYYY" format (e.g., "24 November", "24 Nov 2025")
    const monthNames = {
        'january': 0, 'jan': 0,
        'february': 1, 'feb': 1,
        'march': 2, 'mar': 2,
        'april': 3, 'apr': 3,
        'may': 4,
        'june': 5, 'jun': 5,
        'july': 6, 'jul': 6,
        'august': 7, 'aug': 7,
        'september': 8, 'sep': 8, 'sept': 8,
        'october': 9, 'oct': 9,
        'november': 10, 'nov': 10,
        'december': 11, 'dec': 11
    };

    const monthMatch = dateStrLower.match(/^(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)(?:\s+(\d{4}))?$/);
    if (monthMatch) {
        const day = parseInt(monthMatch[1]);
        const month = monthNames[monthMatch[2]];
        const year = monthMatch[3] ? parseInt(monthMatch[3]) : today.getFullYear();

        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
            return formatDate(date);
        }
    }

    // Try parsing as standard date
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return formatDate(parsed);
    }

    return null;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

module.exports = {
    detectIntent,
    parseDate
};

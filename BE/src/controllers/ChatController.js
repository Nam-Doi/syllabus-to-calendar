const db = require('../config/connectDB');
const { processWithAI, streamAIResponse } = require('../services/clovaStudio');
const { detectIntent, parseDate } = require('../services/IntentService');
const { 
    createAssignment, 
    deleteAssignmentById, 
    findAssignmentByTitle,
    findCourseByName,
    createCourse
} = require('../services/AssignmentService');

const GET_UPCOMING_SCHEDULE_SQL = `
    (SELECT 
        'Assignment' as type, 
        a.title, 
        a.due_date as time, 
        c.name as course 
     FROM assignments a 
     JOIN courses c ON a.course_id = c.id 
     WHERE c.user_id = ? 
       AND a.due_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
       AND a.status != 'completed')
    
    UNION ALL

    (SELECT 
        'Exam' as type, 
        e.title, 
        e.date as time, 
        c.name as course 
     FROM exams e 
     JOIN courses c ON e.course_id = c.id 
     WHERE c.user_id = ? 
       AND e.date >= DATE_SUB(NOW(), INTERVAL 7 DAY))

    ORDER BY time ASC 
    LIMIT 20;
`;

const SYSTEM_PROMPT_TEMPLATE = (contextData, currentTime) => `
ROLE: Helpful Study Assistant.
TASK: Answer the student's query based on the provided schedule data.

CONTEXT:
Current System Time: ${currentTime}
Schedule Data (Past 7 days + Future):
${contextData}

RULES:
1. NO HALLUCINATIONS: If the answer is not in "Schedule Data", politely state that you don't have that information.
2. TONE: Friendly, encouraging, and concise. You can use greetings.
3. EXACT MATCH: Focus on the specific subject or time range asked.
4. FORMAT: Use markdown (bolding, lists) for readability.
5. NO REPETITION: Provide a single, complete response. Do NOT repeat information or provide duplicate sections.
6. BREVITY: Keep responses concise and to the point.
`;

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
});

/**
 * Handle CREATE_ASSIGNMENT intent
 */
async function handleCreateAssignment(userId, params) {
    try {
        console.log('[handleCreateAssignment] Starting with params:', params);
        const { title, courseName, dueDate, description } = params;
        
        if (!title) {
            console.log('[handleCreateAssignment] Missing title');
            return {
                type: 'action',
                success: false,
                message: '❌ Please provide an assignment title.'
            };
        }
        
        if (!dueDate) {
            console.log('[handleCreateAssignment] Missing dueDate');
            return {
                type: 'action',
                success: false,
                message: '❌ Please provide a due date for the assignment.'
            };
        }
        
        // Parse the due date
        console.log('[handleCreateAssignment] Parsing date:', dueDate);
        const parsedDate = parseDate(dueDate);
        console.log('[handleCreateAssignment] Parsed date result:', parsedDate);
        
        if (!parsedDate) {
            console.log('[handleCreateAssignment] Date parsing failed');
            return {
                type: 'action',
                success: false,
                message: `❌ Could not understand the date "${dueDate}". Please use formats like "tomorrow", "next Friday", or "YYYY-MM-DD".`
            };
        }
        
        // Find the course
        let courseId = null;
        let courseAutoCreated = false;
        
        if (courseName) {
            console.log('[handleCreateAssignment] Looking for course:', courseName);
            const courses = await findCourseByName({ userId, courseName });
            console.log('[handleCreateAssignment] Found courses:', courses);
            
            if (courses.length > 0) {
                courseId = courses[0].id;
            } else {
                // Course not found - auto-create it
                console.log('[handleCreateAssignment] Course not found, auto-creating:', courseName);
                const createResult = await createCourse({ userId, courseName });
                
                if (createResult.success) {
                    courseId = createResult.courseId;
                    courseAutoCreated = true;
                    console.log('[handleCreateAssignment] Course auto-created with ID:', courseId);
                } else {
                    console.log('[handleCreateAssignment] Failed to auto-create course');
                    return {
                        type: 'action',
                        success: false,
                        message: `❌ Failed to create course "${courseName}". Please try again or create the course manually.`
                    };
                }
            }
        } else {
            // No course specified - ask user to specify
            console.log('[handleCreateAssignment] No course specified, prompting user');
            
            // Get user's courses to show as options
            const [courses] = await db.execute(
                'SELECT name FROM courses WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', 
                [userId]
            );
            
            if (courses.length === 0) {
                return {
                    type: 'action',
                    success: false,
                    message: '❌ You don\'t have any courses yet.\n\n📚 Please create a course first:\n1. Go to the Courses page\n2. Click "Add Course"\n3. Enter the course name and details\n4. Then try adding the assignment again'
                };
            }
            
            // Show available courses and ask user to specify
            const courseList = courses.map(c => `• ${c.name}`).join('\n');
            return {
                type: 'action',
                success: false,
                message: `📚 Which course should I add "${title}" to?\n\nYour courses:\n${courseList}\n\n💡 Please specify the course name, for example:\n"Add ${title} to History on ${dueDate}"`
            };
        }
        
        // Create the assignment
        console.log('[handleCreateAssignment] Creating assignment with courseId:', courseId);
        const result = await createAssignment({
            userId,
            courseId,
            title,
            description: description || '',
            dueDate: parsedDate
        });
        
        console.log('[handleCreateAssignment] Create result:', result);
        
        if (result.success) {
            const successMessage = courseAutoCreated 
                ? `✅ ${result.message}\n📚 Course "${courseName}" was created automatically\n📅 Due: ${parsedDate}`
                : `✅ ${result.message}\n📅 Due: ${parsedDate}`;
                
            return {
                type: 'action',
                success: true,
                message: successMessage
            };
        } else {
            return {
                type: 'action',
                success: false,
                message: `❌ ${result.message}`
            };
        }
    } catch (error) {
        console.error('Create assignment error:', error);
        return {
            type: 'action',
            success: false,
            message: '❌ An error occurred while creating the assignment.'
        };
    }
}

/**
 * Handle DELETE_ASSIGNMENT intent
 */
async function handleDeleteAssignment(userId, params) {
    try {
        const { title } = params;
        
        if (!title) {
            return {
                type: 'action',
                success: false,
                message: '❌ Please specify which assignment to delete.'
            };
        }
        
        // Find matching assignments
        const assignments = await findAssignmentByTitle({ userId, title });
        
        if (assignments.length === 0) {
            return {
                type: 'action',
                success: false,
                message: `❌ Could not find an assignment matching "${title}".`
            };
        }
        
        if (assignments.length > 1) {
            const list = assignments.map((a, i) => 
                `${i + 1}. **${a.title}** (${a.course_name}) - Due: ${a.due_date}`
            ).join('\n');
            
            return {
                type: 'action',
                success: false,
                message: `❓ Found multiple assignments matching "${title}":\n\n${list}\n\nPlease be more specific.`
            };
        }
        
        // Delete the assignment
        const result = await deleteAssignmentById({ 
            userId, 
            assignmentId: assignments[0].id 
        });
        
        if (result.success) {
            return {
                type: 'action',
                success: true,
                message: `✅ ${result.message}`
            };
        } else {
            return {
                type: 'action',
                success: false,
                message: `❌ ${result.message}`
            };
        }
    } catch (error) {
        console.error('Delete assignment error:', error);
        return {
            type: 'action',
            success: false,
            message: '❌ An error occurred while deleting the assignment.'
        };
    }
}

/**
 * Handle QUERY intent (existing streaming logic)
 */
async function handleQuery(res, userId, message) {
    const [rows] = await db.execute(GET_UPCOMING_SCHEDULE_SQL, [userId, userId]);

    let contextInfo = "";
    if (rows.length === 0) {
        contextInfo = "No upcoming events found.";
    } else {
        contextInfo = rows.map((item, index) => {
            const timeStr = dateFormatter.format(new Date(item.time));
            return `${index + 1}. [${item.type}] ${item.course}: "${item.title}" (${timeStr})`;
        }).join('\n');
    }

    const currentSystemTime = dateFormatter.format(new Date());
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE(contextInfo, currentSystemTime);

    await streamAIResponse(res, systemPrompt, message);
}

const handleChat = async (req, res) => {
    try {
        const { userId, message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const targetUserId = userId || "1";
        
        // Detect intent
        console.log('[ChatController] Detecting intent for:', message);
        const { intent, params } = await detectIntent(message);
        console.log('[ChatController] Detected intent:', intent, 'Params:', params);
        
        // Route based on intent
        if (intent === 'CREATE_ASSIGNMENT') {
            const result = await handleCreateAssignment(targetUserId, params);
            return res.json(result);
        } else if (intent === 'DELETE_ASSIGNMENT') {
            const result = await handleDeleteAssignment(targetUserId, params);
            return res.json(result);
        } else {
            // QUERY - use streaming response
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            await handleQuery(res, targetUserId, message);
        }

    } catch (error) {
        console.error("Controller Error:", error);

        if (!res.headersSent) {
            res.status(500).json({ success: false, error: "Internal Server Error" });
        } else {
            res.write(`data: ${JSON.stringify({ error: "Internal Server Error" })}\n\n`);
            res.end();
        }
    }
};

module.exports = { handleChat };

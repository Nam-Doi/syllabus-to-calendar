const db = require('../config/connectDB');

/**
 * Create a new assignment
 */
async function createAssignment({ userId, courseId, title, description, dueDate, status = 'pending' }) {
    try {
        const { randomUUID } = require('crypto');
        const assignmentId = randomUUID();
        
        const [result] = await db.execute(
            `INSERT INTO assignments (id, course_id, title, description, due_date, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [assignmentId, courseId, title, description || '', dueDate, status]
        );
        
        return {
            success: true,
            assignmentId: assignmentId,
            message: `Assignment "${title}" created successfully!`
        };
    } catch (error) {
        console.error('Error creating assignment:', error);
        return {
            success: false,
            message: 'Failed to create assignment. Please try again.'
        };
    }
}

/**
 * Delete an assignment by ID
 */
async function deleteAssignmentById({ userId, assignmentId }) {
    try {
        // First verify the assignment belongs to the user's course
        const [assignments] = await db.execute(
            `SELECT a.id, a.title, c.user_id 
             FROM assignments a 
             JOIN courses c ON a.course_id = c.id 
             WHERE a.id = ? AND c.user_id = ?`,
            [assignmentId, userId]
        );

        if (assignments.length === 0) {
            return {
                success: false,
                message: 'Assignment not found or you do not have permission to delete it.'
            };
        }

        const [result] = await db.execute(
            'DELETE FROM assignments WHERE id = ?',
            [assignmentId]
        );

        return {
            success: true,
            message: `Assignment "${assignments[0].title}" deleted successfully!`
        };
    } catch (error) {
        console.error('Error deleting assignment:', error);
        return {
            success: false,
            message: 'Failed to delete assignment. Please try again.'
        };
    }
}

/**
 * Find assignment by title (fuzzy match)
 */
async function findAssignmentByTitle({ userId, title }) {
    try {
        const [assignments] = await db.execute(
            `SELECT a.id, a.title, a.due_date, c.name as course_name 
             FROM assignments a 
             JOIN courses c ON a.course_id = c.id 
             WHERE c.user_id = ? AND a.title LIKE ?
             ORDER BY a.due_date ASC
             LIMIT 5`,
            [userId, `%${title}%`]
        );

        return assignments;
    } catch (error) {
        console.error('Error finding assignment:', error);
        return [];
    }
}

/**
 * Get user's courses for course name -> ID mapping
 */
async function getUserCourses(userId) {
    try {
        const [courses] = await db.execute(
            'SELECT id, name, code FROM courses WHERE user_id = ?',
            [userId]
        );
        return courses;
    } catch (error) {
        console.error('Error fetching courses:', error);
        return [];
    }
}

/**
 * Find course by name (fuzzy match)
 */
async function findCourseByName({ userId, courseName }) {
    try {
        const [courses] = await db.execute(
            `SELECT id, name, code 
             FROM courses 
             WHERE user_id = ? AND (name LIKE ? OR code LIKE ?)
             LIMIT 5`,
            [userId, `%${courseName}%`, `%${courseName}%`]
        );

        return courses;
    } catch (error) {
        console.error('Error finding course:', error);
        return [];
    }
}

/**
 * Create a new course
 */
async function createCourse({ userId, courseName }) {
    try {
        const { randomUUID } = require('crypto');
        
        // Generate course ID and assign a random color
        const courseId = randomUUID();
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const icon = 'Calendar';
        
        const [result] = await db.execute(
            `INSERT INTO courses (id, user_id, name, color, icon) 
             VALUES (?, ?, ?, ?, ?)`,
            [courseId, userId, courseName, color, icon]
        );
        
        return {
            success: true,
            courseId: courseId,
            message: `Course "${courseName}" created successfully!`
        };
    } catch (error) {
        console.error('Error creating course:', error);
        return {
            success: false,
            message: 'Failed to create course. Please try again.'
        };
    }
}

module.exports = {
    createAssignment,
    deleteAssignmentById,
    findAssignmentByTitle,
    getUserCourses,
    findCourseByName,
    createCourse
};

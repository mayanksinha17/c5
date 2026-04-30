const express = require('express');
const router = express.Router();
const { getDB, saveDB } = require('../db');

// GET /api/tasks — Fetch all tasks
router.get('/', (req, res) => {
    try {
        const db = getDB();
        const results = db.exec('SELECT * FROM tasks ORDER BY created_at DESC');

        let tasks = [];
        if (results.length > 0) {
            const columns = results[0].columns;
            tasks = results[0].values.map(row => {
                const obj = {};
                columns.forEach((col, i) => { obj[col] = row[i]; });
                obj.completed = obj.completed === 1;
                return obj;
            });
        }

        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// POST /api/tasks — Create a new task
router.post('/', (req, res) => {
    try {
        const { title, description, deadline, priority } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Task title is required' });
        }

        const validPriorities = ['low', 'medium', 'high'];
        const taskPriority = validPriorities.includes(priority) ? priority : 'low';

        const db = getDB();
        db.run(
            'INSERT INTO tasks (title, description, deadline, priority) VALUES (?, ?, ?, ?)',
            [title.trim(), (description || '').trim(), deadline || null, taskPriority]
        );

        // Get the last inserted task BEFORE saveDB (which can reset last_insert_rowid)
        const result = db.exec('SELECT * FROM tasks ORDER BY id DESC LIMIT 1');
        saveDB();

        if (result.length > 0 && result[0].values.length > 0) {
            const columns = result[0].columns;
            const row = result[0].values[0];
            const newTask = {};
            columns.forEach((col, i) => { newTask[col] = row[i]; });
            newTask.completed = newTask.completed === 1;
            res.status(201).json(newTask);
        } else {
            // Fallback: construct response manually
            res.status(201).json({
                id: Date.now(),
                title: title.trim(),
                description: (description || '').trim(),
                deadline: deadline || null,
                priority: taskPriority,
                completed: false,
                created_at: new Date().toISOString(),
                completed_at: null
            });
        }
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// POST /api/tasks/sort — Sort tasks by priority and deadline
// NOTE: This route MUST be defined before /:id routes to avoid "sort" being parsed as an id
router.post('/sort', (req, res) => {
    try {
        const db = getDB();
        const results = db.exec(`
            SELECT * FROM tasks
            ORDER BY
                CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                END,
                CASE WHEN deadline IS NULL THEN 1 ELSE 0 END,
                deadline ASC,
                created_at ASC
        `);

        let tasks = [];
        if (results.length > 0) {
            const columns = results[0].columns;
            tasks = results[0].values.map(row => {
                const obj = {};
                columns.forEach((col, i) => { obj[col] = row[i]; });
                obj.completed = obj.completed === 1;
                return obj;
            });
        }

        res.json(tasks);
    } catch (error) {
        console.error('Error sorting tasks:', error);
        res.status(500).json({ error: 'Failed to sort tasks' });
    }
});

// POST /api/tasks/:id/toggle — Toggle task completion
router.post('/:id/toggle', (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();

        // Check if task exists
        const existing = db.exec('SELECT * FROM tasks WHERE id = ?', [Number(id)]);
        if (existing.length === 0 || existing[0].values.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const columns = existing[0].columns;
        const row = existing[0].values[0];
        const task = {};
        columns.forEach((col, i) => { task[col] = row[i]; });

        const newCompleted = task.completed === 1 ? 0 : 1;
        const completedAt = newCompleted === 1 ? new Date().toISOString() : null;

        db.run('UPDATE tasks SET completed = ?, completed_at = ? WHERE id = ?',
            [newCompleted, completedAt, Number(id)]);
        saveDB();

        // Return updated task
        const updated = db.exec('SELECT * FROM tasks WHERE id = ?', [Number(id)]);
        if (updated.length > 0 && updated[0].values.length > 0) {
            const uCols = updated[0].columns;
            const uRow = updated[0].values[0];
            const updatedTask = {};
            uCols.forEach((col, i) => { updatedTask[col] = uRow[i]; });
            updatedTask.completed = updatedTask.completed === 1;
            res.json(updatedTask);
        } else {
            res.json({ message: 'Task toggled' });
        }
    } catch (error) {
        console.error('Error toggling task:', error);
        res.status(500).json({ error: 'Failed to toggle task' });
    }
});

// DELETE /api/tasks/:id — Delete a single task
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();

        const existing = db.exec('SELECT id FROM tasks WHERE id = ?', [Number(id)]);
        if (existing.length === 0 || existing[0].values.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        db.run('DELETE FROM tasks WHERE id = ?', [Number(id)]);
        saveDB();
        res.json({ message: 'Task deleted successfully', id: Number(id) });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// DELETE /api/tasks — Clear all tasks
router.delete('/', (req, res) => {
    try {
        const db = getDB();
        db.run('DELETE FROM tasks');
        saveDB();
        res.json({ message: 'All tasks cleared' });
    } catch (error) {
        console.error('Error clearing tasks:', error);
        res.status(500).json({ error: 'Failed to clear tasks' });
    }
});

module.exports = router;

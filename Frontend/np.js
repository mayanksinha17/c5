// API Base URL
const API_BASE = 'http://localhost:3001/api';

// Load tasks from API
let tasks = [];

// DOM elements
const taskTitle = document.getElementById('task-title');
const taskDesc = document.getElementById('task-desc');
const taskDeadline = document.getElementById('task-deadline');
const taskPriority = document.getElementById('task-priority');
const addTaskBtn = document.getElementById('add-task-btn');
const automateBtn = document.getElementById('automate-btn');
const clearBtn = document.getElementById('clear-btn');
const viewStatsBtn = document.getElementById('view-stats-btn');
const tasksList = document.getElementById('tasks');
const reminderText = document.getElementById('reminder-text');

// API helper functions
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        alert('Failed to connect to server. Please make sure the backend is running.');
        throw error;
    }
}

// Load tasks from API
async function loadTasks() {
    try {
        tasks = await apiRequest('/tasks');
        renderTasks();
        updateReminders();
    } catch (error) {
        console.error('Failed to load tasks:', error);
    }
}

// Function to render tasks
function renderTasks() {
    tasksList.innerHTML = '';
    tasks.forEach((task) => {
        const li = document.createElement('li');
        li.className = task.priority;
        li.innerHTML = `
            <strong>${task.title}</strong> (${task.priority})
            <br>${task.description || 'No description'}
            <br>Deadline: ${task.deadline || 'None'}
            <br><button onclick="toggleComplete(${task.id})">${task.completed ? 'Mark Incomplete' : 'Mark Complete'}</button>
            <button onclick="deleteTask(${task.id})">Delete</button>
        `;
        if (task.completed) li.classList.add('completed');
        tasksList.appendChild(li);
    });
}

// Add task
addTaskBtn.addEventListener('click', async () => {
    if (!taskTitle.value.trim()) return alert('Please enter a task title.');

    const newTask = {
        title: taskTitle.value.trim(),
        description: taskDesc.value.trim(),
        deadline: taskDeadline.value,
        priority: taskPriority.value
    };

    try {
        const createdTask = await apiRequest('/tasks', {
            method: 'POST',
            body: JSON.stringify(newTask)
        });

        tasks.push(createdTask);
        renderTasks();
        updateReminders();

        // Clear form
        taskTitle.value = '';
        taskDesc.value = '';
        taskDeadline.value = '';
        taskPriority.value = 'low';
    } catch (error) {
        console.error('Failed to add task:', error);
    }
});

// Toggle complete
async function toggleComplete(taskId) {
    try {
        await apiRequest(`/tasks/${taskId}/toggle`, { method: 'POST' });

        // Update local array
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
        }

        renderTasks();
        updateReminders();
    } catch (error) {
        console.error('Failed to toggle task:', error);
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        await apiRequest(`/tasks/${taskId}`, { method: 'DELETE' });

        // Remove from local array
        tasks = tasks.filter(t => t.id !== taskId);
        renderTasks();
        updateReminders();
    } catch (error) {
        console.error('Failed to delete task:', error);
    }
}

// Automate: Sort tasks and show reminders
automateBtn.addEventListener('click', async () => {
    try {
        await apiRequest('/tasks/sort', { method: 'POST' });
        await loadTasks(); // Reload tasks after sorting
        updateReminders();
    } catch (error) {
        console.error('Failed to sort tasks:', error);
    }
});

// Clear all tasks
clearBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all tasks?')) return;

    try {
        await apiRequest('/tasks', { method: 'DELETE' });
        tasks = [];
        renderTasks();
        reminderText.textContent = 'No urgent reminders yet.';
    } catch (error) {
        console.error('Failed to clear tasks:', error);
    }
});

// View task statistics
viewStatsBtn.addEventListener('click', () => {
    window.location.href = 'tasks.html';
});

// Update reminders function
function updateReminders() {
    // AI Reminders: Check for urgent tasks (high priority or deadline within 2 days)
    const now = new Date();
    const urgentTasks = tasks.filter(task => {
        if (task.completed) return false;
        if (task.priority === 'high') return true;
        if (task.deadline) {
            const deadline = new Date(task.deadline);
            const diffDays = (deadline - now) / (1000 * 60 * 60 * 24);
            return diffDays <= 2;
        }
        return false;
    });

    if (urgentTasks.length > 0) {
        reminderText.textContent = `Urgent: Focus on "${urgentTasks[0].title}". ${urgentTasks.length > 1 ? `Plus ${urgentTasks.length - 1} more.` : ''}`;
        // Simple notification (if supported)
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Task Reminder', { body: `Don't forget: ${urgentTasks[0].title}` });
        }
    } else {
        reminderText.textContent = 'No urgent reminders. Great job staying on top!';
    }
}

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Initial load
loadTasks();
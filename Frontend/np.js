// Load tasks from localStorage
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

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

// Function to render tasks
function renderTasks() {
    tasksList.innerHTML = '';
    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = task.priority;
        li.innerHTML = `
            <strong>${task.title}</strong> (${task.priority})
            <br>${task.desc || 'No description'}
            <br>Deadline: ${task.deadline || 'None'}
            <br><button onclick="toggleComplete(${index})">${task.completed ? 'Mark Incomplete' : 'Mark Complete'}</button>
            <button onclick="deleteTask(${index})">Delete</button>
        `;
        if (task.completed) li.classList.add('completed');
        tasksList.appendChild(li);
    });
}

// Add task
addTaskBtn.addEventListener('click', () => {
    if (!taskTitle.value.trim()) return alert('Please enter a task title.');
    const newTask = {
        title: taskTitle.value.trim(),
        desc: taskDesc.value.trim(),
        deadline: taskDeadline.value,
        priority: taskPriority.value,
        completed: false
    };
    tasks.push(newTask);
    saveTasks();
    renderTasks();
    // Clear form
    taskTitle.value = '';
    taskDesc.value = '';
    taskDeadline.value = '';
    taskPriority.value = 'low';
});

// Toggle complete
function toggleComplete(index) {
    tasks[index].completed = !tasks[index].completed;
    saveTasks();
    renderTasks();
}

// Delete task
function deleteTask(index) {
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
}

// Automate: Sort by priority and deadline, show reminders
automateBtn.addEventListener('click', () => {
    // Sort: High priority first, then by deadline
    tasks.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        if (a.deadline && b.deadline) {
            return new Date(a.deadline) - new Date(b.deadline);
        }
        return a.deadline ? -1 : 1;
    });
    saveTasks();
    renderTasks();

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
});

// Clear all tasks
clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all tasks?')) {
        tasks = [];
        saveTasks();
        renderTasks();
        reminderText.textContent = 'No urgent reminders yet.';
    }
});

// View task statistics
viewStatsBtn.addEventListener('click', () => {
    window.location.href = 'tasks.html';
});

// Save to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Initial render
renderTasks();
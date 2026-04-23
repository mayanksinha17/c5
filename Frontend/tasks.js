// Load tasks from localStorage
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// DOM elements
const totalTasksEl = document.getElementById('total-tasks');
const completedTasksEl = document.getElementById('completed-tasks');
const pendingTasksEl = document.getElementById('pending-tasks');
const highPriorityEl = document.getElementById('high-priority');
const mediumPriorityEl = document.getElementById('medium-priority');
const lowPriorityEl = document.getElementById('low-priority');
const tasksList = document.getElementById('tasks');
const backBtn = document.getElementById('back-btn');

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
            <br>Status: ${task.completed ? 'Completed' : 'Pending'}
        `;
        if (task.completed) li.classList.add('completed');
        tasksList.appendChild(li);
    });
}

// Function to calculate and display statistics
function displayStatistics() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const high = tasks.filter(task => task.priority === 'high').length;
    const medium = tasks.filter(task => task.priority === 'medium').length;
    const low = tasks.filter(task => task.priority === 'low').length;

    totalTasksEl.textContent = total;
    completedTasksEl.textContent = completed;
    pendingTasksEl.textContent = pending;
    highPriorityEl.textContent = high;
    mediumPriorityEl.textContent = medium;
    lowPriorityEl.textContent = low;
}

// Back to main page
backBtn.addEventListener('click', () => {
    window.location.href = 'np.html';
});

// Initial render
renderTasks();
displayStatistics();
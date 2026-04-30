// API Base URL
const API_BASE = 'http://localhost:3001/api';

// Load tasks from API
let tasks = [];

// DOM elements
const totalTasksEl = document.getElementById('total-tasks');
const completedTasksEl = document.getElementById('completed-tasks');
const pendingTasksEl = document.getElementById('pending-tasks');
const highPriorityEl = document.getElementById('high-priority');
const mediumPriorityEl = document.getElementById('medium-priority');
const lowPriorityEl = document.getElementById('low-priority');
const tasksList = document.getElementById('tasks');
const backBtn = document.getElementById('back-btn');

// API helper function
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

// Load tasks and stats from API
async function loadData() {
    try {
        const [tasksData, statsData] = await Promise.all([
            apiRequest('/tasks'),
            apiRequest('/stats')
        ]);

        tasks = tasksData;
        displayStatistics(statsData);
        renderTasks();
    } catch (error) {
        console.error('Failed to load data:', error);
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
            <br>Status: ${task.completed ? 'Completed' : 'Pending'}
        `;
        if (task.completed) li.classList.add('completed');
        tasksList.appendChild(li);
    });
}

// Function to display statistics
function displayStatistics(stats) {
    totalTasksEl.textContent = stats.total || 0;
    completedTasksEl.textContent = stats.completed || 0;
    pendingTasksEl.textContent = stats.pending || 0;
    highPriorityEl.textContent = stats.high || 0;
    mediumPriorityEl.textContent = stats.medium || 0;
    lowPriorityEl.textContent = stats.low || 0;

    // Display analysis section if data is available
    const analysisSection = document.getElementById('analysis-section');
    if (stats.analysis) {
        analysisSection.style.display = 'block';

        // Productivity
        const productivityText = document.getElementById('productivity-text');
        productivityText.textContent = stats.analysis.productivity || 'No data';

        // Completion progress bar
        const completionBar = document.getElementById('completion-bar');
        const completionLabel = document.getElementById('completion-label');
        const rate = stats.completionRate || 0;
        completionBar.style.width = rate + '%';
        completionLabel.textContent = rate + '% completion rate';

        // Color the bar based on rate
        if (rate >= 80) {
            completionBar.style.background = 'linear-gradient(90deg, #28a745, #20c997)';
        } else if (rate >= 50) {
            completionBar.style.background = 'linear-gradient(90deg, #ffc107, #fd7e14)';
        } else {
            completionBar.style.background = 'linear-gradient(90deg, #dc3545, #e83e8c)';
        }

        // Improvements
        const improvementsList = document.getElementById('improvements-list');
        improvementsList.innerHTML = '';
        if (stats.analysis.improvements && stats.analysis.improvements.length > 0) {
            stats.analysis.improvements.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                improvementsList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No suggestions — you\'re doing great!';
            improvementsList.appendChild(li);
        }

        // Expected Resources
        if (stats.analysis.expectedResources) {
            const res = stats.analysis.expectedResources;
            document.getElementById('est-time').textContent = res.estimatedTimeToComplete || '—';
            document.getElementById('est-suggestion').textContent = res.suggestion || '—';
            document.getElementById('est-daily').textContent = res.dailyTarget || '—';
        }
    }
}

// Back to main page
backBtn.addEventListener('click', () => {
    window.location.href = 'np.html';
});

// Initial load
loadData();
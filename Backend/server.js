const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// Routes
const tasksRouter = require('./routes/tasks');
const statsRouter = require('./routes/stats');

app.use('/api/tasks', tasksRouter);
app.use('/api/stats', statsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize database then start server
async function start() {
    try {
        await initDB();
        app.listen(PORT, () => {
            console.log('');
            console.log('============================================');
            console.log('  Personal Task Automator — Backend API');
            console.log('============================================');
            console.log(`  Server running on: http://localhost:${PORT}`);
            console.log(`  API base:          http://localhost:${PORT}/api`);
            console.log(`  Health check:      http://localhost:${PORT}/api/health`);
            console.log('============================================');
            console.log('');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();

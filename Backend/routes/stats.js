const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// Helper: run a COUNT query and return the number
function getCount(db, query, params = []) {
    const result = db.exec(query, params);
    if (result.length > 0 && result[0].values.length > 0) {
        return result[0].values[0][0];
    }
    return 0;
}

// GET /api/stats — Get task statistics with analysis
router.get('/', (req, res) => {
    try {
        const db = getDB();

        // Basic counts
        const total = getCount(db, 'SELECT COUNT(*) FROM tasks');
        const completed = getCount(db, 'SELECT COUNT(*) FROM tasks WHERE completed = 1');
        const pending = total - completed;

        // Priority breakdown
        const high = getCount(db, "SELECT COUNT(*) FROM tasks WHERE priority = 'high'");
        const medium = getCount(db, "SELECT COUNT(*) FROM tasks WHERE priority = 'medium'");
        const low = getCount(db, "SELECT COUNT(*) FROM tasks WHERE priority = 'low'");

        // Overdue tasks (deadline has passed and task is not completed)
        const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const overdueTasks = getCount(db,
            "SELECT COUNT(*) FROM tasks WHERE completed = 0 AND deadline IS NOT NULL AND deadline < ?",
            [now]
        );

        // Pending high-priority tasks
        const pendingHigh = getCount(db,
            "SELECT COUNT(*) FROM tasks WHERE completed = 0 AND priority = 'high'"
        );

        // Pending medium-priority tasks
        const pendingMedium = getCount(db,
            "SELECT COUNT(*) FROM tasks WHERE completed = 0 AND priority = 'medium'"
        );

        // Tasks due within next 2 days
        const twoDaysLater = new Date();
        twoDaysLater.setDate(twoDaysLater.getDate() + 2);
        const urgentDeadline = twoDaysLater.toISOString().split('T')[0];
        const upcomingDeadlines = getCount(db,
            "SELECT COUNT(*) FROM tasks WHERE completed = 0 AND deadline IS NOT NULL AND deadline >= ? AND deadline <= ?",
            [now, urgentDeadline]
        );

        // Completion rate
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Average completion time (for completed tasks that have both timestamps)
        let avgCompletionHours = null;
        const completedWithTimes = db.exec(
            "SELECT created_at, completed_at FROM tasks WHERE completed = 1 AND completed_at IS NOT NULL"
        );

        if (completedWithTimes.length > 0 && completedWithTimes[0].values.length > 0) {
            let totalMs = 0;
            const rows = completedWithTimes[0].values;
            rows.forEach(row => {
                totalMs += new Date(row[1]) - new Date(row[0]);
            });
            avgCompletionHours = Math.round(totalMs / rows.length / (1000 * 60 * 60) * 10) / 10;
        }

        // --- Build analysis ---
        const analysis = buildAnalysis({
            total, completed, pending, completionRate,
            high, medium, low,
            pendingHigh, pendingMedium,
            overdueTasks, upcomingDeadlines,
            avgCompletionHours
        });

        res.json({
            total,
            completed,
            pending,
            high,
            medium,
            low,
            completionRate,
            overdueTasks,
            upcomingDeadlines,
            avgCompletionHours,
            analysis
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

/**
 * Build analysis object with productivity assessment,
 * improvement suggestions, and expected resource estimates
 */
function buildAnalysis({ total, completed, pending, completionRate, high, medium, low, pendingHigh, pendingMedium, overdueTasks, upcomingDeadlines, avgCompletionHours }) {

    // --- Productivity assessment ---
    let productivity;
    if (total === 0) {
        productivity = 'No tasks yet — start by adding some tasks!';
    } else if (completionRate >= 80) {
        productivity = `Excellent — ${completionRate}% tasks completed! You're on fire 🔥`;
    } else if (completionRate >= 60) {
        productivity = `Good — ${completionRate}% tasks completed. Keep pushing!`;
    } else if (completionRate >= 40) {
        productivity = `Fair — ${completionRate}% tasks completed. Room for improvement.`;
    } else if (completionRate > 0) {
        productivity = `Needs attention — only ${completionRate}% tasks completed. Let's focus!`;
    } else {
        productivity = `No tasks completed yet — time to get started!`;
    }

    // --- Improvement suggestions ---
    const improvements = [];

    if (pendingHigh > 0) {
        improvements.push(
            `${pendingHigh} high-priority task${pendingHigh > 1 ? 's' : ''} still pending — focus on ${pendingHigh > 1 ? 'these' : 'this'} first`
        );
    }

    if (overdueTasks > 0) {
        improvements.push(
            `${overdueTasks} task${overdueTasks > 1 ? 's are' : ' is'} overdue — consider rescheduling or prioritizing immediately`
        );
    }

    if (upcomingDeadlines > 0) {
        improvements.push(
            `${upcomingDeadlines} task${upcomingDeadlines > 1 ? 's have' : ' has'} a deadline within the next 2 days — plan your time accordingly`
        );
    }

    if (pendingMedium > 2) {
        improvements.push(
            `${pendingMedium} medium-priority tasks pending — try to batch and complete them in one session`
        );
    }

    if (completionRate < 50 && total >= 5) {
        improvements.push(
            'Your completion rate is below 50% — consider breaking large tasks into smaller, manageable ones'
        );
    }

    if (improvements.length === 0 && total > 0) {
        improvements.push('Great job! You\'re on track. Keep maintaining this pace.');
    }

    // --- Expected resources ---
    const expectedResources = {};

    if (pending > 0) {
        // Estimate time based on avg completion time or fallback heuristic
        if (avgCompletionHours !== null && avgCompletionHours > 0) {
            const estimatedHours = Math.round(pending * avgCompletionHours * 10) / 10;
            if (estimatedHours < 1) {
                expectedResources.estimatedTimeToComplete = `~${Math.round(estimatedHours * 60)} minutes (based on your avg completion speed)`;
            } else {
                expectedResources.estimatedTimeToComplete = `~${estimatedHours} hours (based on your avg completion speed)`;
            }
        } else {
            // Heuristic: high=2h, medium=1h, low=0.5h per task
            const estHours = (pendingHigh * 2) + (pendingMedium * 1) + ((pending - pendingHigh - pendingMedium) * 0.5);
            expectedResources.estimatedTimeToComplete = `~${estHours} hours (estimated based on priority levels)`;
        }

        // Suggestion based on workload
        if (pendingHigh >= 3) {
            expectedResources.suggestion = 'Heavy high-priority workload — consider delegating or extending deadlines for lower priority items';
        } else if (pending > 10) {
            expectedResources.suggestion = 'Large task backlog — try the Pomodoro technique: 25min focused work + 5min breaks';
        } else if (pending > 5) {
            expectedResources.suggestion = 'Moderate workload — block 2-3 focused hours daily to stay on track';
        } else {
            expectedResources.suggestion = 'Manageable workload — a focused session should clear your pending tasks';
        }

        // Daily target recommendation
        const dailyTarget = Math.max(1, Math.ceil(pending / 3));
        expectedResources.dailyTarget = `Complete ${dailyTarget} task${dailyTarget > 1 ? 's' : ''} per day to finish within 3 days`;
    } else if (total > 0) {
        expectedResources.estimatedTimeToComplete = 'All tasks completed!';
        expectedResources.suggestion = 'Add new tasks or review completed ones for follow-ups';
        expectedResources.dailyTarget = 'No pending tasks — enjoy your free time! 🎉';
    } else {
        expectedResources.estimatedTimeToComplete = 'N/A — no tasks added yet';
        expectedResources.suggestion = 'Start by adding tasks to get personalized resource estimates';
        expectedResources.dailyTarget = 'N/A';
    }

    return {
        productivity,
        improvements,
        expectedResources
    };
}

module.exports = router;

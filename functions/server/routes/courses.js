const express = require('express');
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const { getUserById, updateUser } = require('../db');

const router = express.Router();
const COURSES_PATH = path.join(__dirname, '..', 'data', 'courses.json');

// Cache courses data in memory (read-only reference data)
let coursesCache = null;
function getCourses() {
  if (!coursesCache) {
    coursesCache = JSON.parse(fs.readFileSync(COURSES_PATH, 'utf-8'));
  }
  return coursesCache;
}

// Get all courses (public)
router.get('/', (req, res) => {
  const courses = getCourses();
  res.json({ courses });
});

// Get courses with user enrollment status
router.get('/enrolled', authMiddleware, (req, res) => {
  const courses = getCourses();
  const enrolled = req.user.enrolledCourses || [];
  const completedModules = req.user.completedModules || [];

  const enrolledCourses = courses
    .filter(c => enrolled.includes(c.id))
    .map(c => ({
      ...c,
      modules: c.modules.map(m => ({
        ...m,
        completed: completedModules.includes(m.id)
      })),
      progress: Math.round((c.modules.filter(m => completedModules.includes(m.id)).length / c.modules.length) * 100)
    }));

  res.json({ courses: enrolledCourses });
});

// Enroll in a course
router.post('/:id/enroll', authMiddleware, (req, res) => {
  const { id } = req.params;
  const courses = getCourses();
  const course = courses.find(c => c.id === id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  const user = getUserById(req.user.id);

  if (user.enrolledCourses.includes(id)) {
    return res.json({ message: 'Already enrolled.' });
  }

  user.enrolledCourses.push(id);
  updateUser(user.id, { enrolledCourses: user.enrolledCourses });

  res.json({ message: `Enrolled in ${course.title}!` });
});

// Complete a module
router.post('/:id/module/:moduleId/complete', authMiddleware, (req, res) => {
  const { id, moduleId } = req.params;
  const courses = getCourses();
  const course = courses.find(c => c.id === id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  const module = course.modules.find(m => m.id === moduleId);
  if (!module) {
    return res.status(404).json({ error: 'Module not found.' });
  }

  const user = getUserById(req.user.id);

  if (!user.enrolledCourses.includes(id)) {
    return res.status(400).json({ error: 'Not enrolled in this course.' });
  }

  if (user.completedModules.includes(moduleId)) {
    return res.json({ message: 'Module already completed.', coins: user.coins, earned: 0 });
  }

  user.completedModules.push(moduleId);
  user.coins += course.coinsPerModule;
  user.coinHistory.unshift({
    action: 'course_module',
    coins: course.coinsPerModule,
    detail: `Module: ${module.title}`,
    date: new Date().toISOString()
  });

  // Check if all modules completed → bonus coins
  const allModuleIds = course.modules.map(m => m.id);
  const allCompleted = allModuleIds.every(mid => user.completedModules.includes(mid));
  let bonusEarned = 0;
  if (allCompleted) {
    user.coins += course.coinsOnComplete;
    bonusEarned = course.coinsOnComplete;
    user.coinHistory.unshift({
      action: 'course_complete',
      coins: course.coinsOnComplete,
      detail: `Completed: ${course.title} 🎉`,
      date: new Date().toISOString()
    });
  }

  updateUser(user.id, {
    completedModules: user.completedModules,
    coins: user.coins,
    coinHistory: user.coinHistory
  });

  res.json({
    message: `+${course.coinsPerModule} coins!${allCompleted ? ` + ${bonusEarned} course completion bonus! 🎉` : ''}`,
    coins: user.coins,
    earned: course.coinsPerModule + bonusEarned,
    courseCompleted: allCompleted
  });
});

module.exports = router;

const express = require('express');
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const { getUserById, updateUser } = require('../db');

const router = express.Router();
const MED_PATH = path.join(__dirname, '..', 'data', 'meditation.json');

// Cache meditation data in memory (read-only reference data)
let medCache = null;
function getMeditations() {
  if (!medCache) {
    medCache = JSON.parse(fs.readFileSync(MED_PATH, 'utf-8'));
  }
  return medCache;
}

// Get all meditation sessions
router.get('/sessions', (req, res) => {
  const sessions = getMeditations();
  res.json({ sessions });
});

// Get sessions with user completion status
router.get('/sessions/status', authMiddleware, (req, res) => {
  const sessions = getMeditations();
  const completedIds = req.user.completedMeditations || [];
  const withStatus = sessions.map(s => ({
    ...s,
    completed: completedIds.includes(s.id)
  }));
  res.json({ sessions: withStatus });
});

// Complete a meditation
router.post('/:id/complete', authMiddleware, (req, res) => {
  const { id } = req.params;
  const sessions = getMeditations();
  const session = sessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const user = getUserById(req.user.id);

  if (user.completedMeditations.includes(id)) {
    return res.json({ message: 'Already completed this month.', coins: user.coins, earned: 0 });
  }

  user.completedMeditations.push(id);
  user.coins += session.coinsOnComplete;
  user.coinHistory.unshift({
    action: 'meditation',
    coins: session.coinsOnComplete,
    detail: `Meditation: ${session.title}`,
    date: new Date().toISOString()
  });

  updateUser(user.id, {
    completedMeditations: user.completedMeditations,
    coins: user.coins,
    coinHistory: user.coinHistory
  });

  res.json({
    message: `+${session.coinsOnComplete} coins earned! 🧘`,
    coins: user.coins,
    earned: session.coinsOnComplete
  });
});

module.exports = router;

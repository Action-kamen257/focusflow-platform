const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getUserById, updateUser } = require('../db');

const router = express.Router();

// Get coin balance
router.get('/balance', authMiddleware, (req, res) => {
  res.json({ coins: req.user.coins, streak: req.user.streak });
});

// Get coin history
router.get('/history', authMiddleware, (req, res) => {
  res.json({ history: req.user.coinHistory || [] });
});

// Earn coins (generic endpoint)
router.post('/earn', authMiddleware, (req, res) => {
  const { action, detail } = req.body;
  const COIN_VALUES = {
    news_read: 5,
    course_module: 25,
    course_complete: 100,
    meditation: 30,
    streak_bonus: 50,
    referral: 200
  };

  const coinsEarned = COIN_VALUES[action];
  if (!coinsEarned) {
    return res.status(400).json({ error: 'Invalid action type.' });
  }

  const user = getUserById(req.user.id);
  user.coins += coinsEarned;
  user.coinHistory.unshift({
    action,
    coins: coinsEarned,
    detail: detail || action,
    date: new Date().toISOString()
  });

  updateUser(user.id, {
    coins: user.coins,
    coinHistory: user.coinHistory
  });

  res.json({ coins: user.coins, earned: coinsEarned, message: `+${coinsEarned} coins earned!` });
});

module.exports = router;

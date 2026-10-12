const express = require('express');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const { getUserById, updateUser } = require('../db');

const router = express.Router();
const REWARDS_PATH = path.join(__dirname, '..', 'data', 'rewards.json');

// Cache rewards data in memory (read-only reference data)
let rewardsCache = null;
function getRewards() {
  if (!rewardsCache) {
    rewardsCache = JSON.parse(fs.readFileSync(REWARDS_PATH, 'utf-8'));
  }
  return rewardsCache;
}

// Get reward catalog
router.get('/catalog', (req, res) => {
  const rewards = getRewards();
  res.json({ rewards });
});

// Redeem a reward
router.post('/', authMiddleware, (req, res) => {
  const { rewardId } = req.body;
  if (!rewardId) {
    return res.status(400).json({ error: 'rewardId is required.' });
  }

  const rewards = getRewards();
  const reward = rewards.find(r => r.id === rewardId);
  if (!reward) {
    return res.status(404).json({ error: 'Reward not found.' });
  }

  const user = getUserById(req.user.id);

  if (user.coins < reward.coinsRequired) {
    return res.status(400).json({
      error: `Not enough coins. You need ${reward.coinsRequired} but have ${user.coins}.`,
      coinsNeeded: reward.coinsRequired - user.coins
    });
  }

  user.coins -= reward.coinsRequired;
  const redemption = {
    id: uuidv4(),
    rewardId: reward.id,
    rewardTitle: reward.title,
    rewardSubtitle: reward.subtitle,
    coinsSpent: reward.coinsRequired,
    date: new Date().toISOString(),
    status: 'fulfilled'
  };
  user.redemptions.unshift(redemption);
  user.coinHistory.unshift({
    action: 'redemption',
    coins: -reward.coinsRequired,
    detail: `Redeemed: ${reward.title} — ${reward.subtitle}`,
    date: new Date().toISOString()
  });

  updateUser(user.id, {
    coins: user.coins,
    redemptions: user.redemptions,
    coinHistory: user.coinHistory
  });

  res.json({
    message: `🎁 ${reward.title} redeemed successfully!`,
    coins: user.coins,
    redemption
  });
});

// Get user's redemption history
router.get('/history', authMiddleware, (req, res) => {
  res.json({ redemptions: req.user.redemptions || [] });
});

module.exports = router;

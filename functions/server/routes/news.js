const express = require('express');
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const { getUserById, updateUser } = require('../db');

const router = express.Router();
const NEWS_PATH = path.join(__dirname, '..', 'data', 'news.json');

// Cache news data in memory (read-only reference data)
let newsCache = null;
function getNews() {
  if (!newsCache) {
    newsCache = JSON.parse(fs.readFileSync(NEWS_PATH, 'utf-8'));
  }
  return newsCache;
}

// Get all news articles
router.get('/', (req, res) => {
  const news = getNews();
  res.json({ articles: news });
});

// Get news with user read status
router.get('/feed', authMiddleware, (req, res) => {
  const news = getNews();
  const readIds = req.user.readNews || [];
  const articlesWithStatus = news.map(article => ({
    ...article,
    isRead: readIds.includes(article.id)
  }));
  res.json({ articles: articlesWithStatus });
});

// Mark article as read and earn coins
router.post('/:id/read', authMiddleware, (req, res) => {
  const { id } = req.params;
  const news = getNews();
  const article = news.find(a => a.id === id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found.' });
  }

  const user = getUserById(req.user.id);

  if (user.readNews.includes(id)) {
    return res.json({ message: 'Already read.', coins: user.coins, earned: 0 });
  }

  user.readNews.push(id);
  user.coins += article.coinsOnRead;
  user.coinHistory.unshift({
    action: 'news_read',
    coins: article.coinsOnRead,
    detail: `Read: ${article.headline.substring(0, 50)}...`,
    date: new Date().toISOString()
  });

  updateUser(user.id, {
    readNews: user.readNews,
    coins: user.coins,
    coinHistory: user.coinHistory
  });

  res.json({
    message: `+${article.coinsOnRead} coins earned!`,
    coins: user.coins,
    earned: article.coinsOnRead
  });
});

module.exports = router;

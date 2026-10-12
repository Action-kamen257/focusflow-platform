const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getUserByEmail, getUserById, createUser, updateUser } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = createUser({
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      coins: 50, // welcome bonus
      streak: 0,
      lastActive: new Date().toISOString().split('T')[0],
      enrolledCourses: [],
      completedModules: [],
      readNews: [],
      completedMeditations: [],
      coinHistory: [
        { action: 'welcome_bonus', coins: 50, detail: 'Welcome to FocusFlow! 🎉', date: new Date().toISOString() }
      ],
      redemptions: [],
      createdAt: new Date().toISOString()
    });

    req.session.userId = newUser.id;

    const { password: _, ...safeUser } = newUser;
    res.status(201).json({ message: 'Account created!', user: safeUser });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const lastActive = user.lastActive;
    if (lastActive !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastActive === yesterday) {
        user.streak += 1;
        if (user.streak % 7 === 0) {
          user.coins += 50;
          user.coinHistory.unshift({
            action: 'streak_bonus',
            coins: 50,
            detail: `${user.streak}-day streak bonus! 🔥`,
            date: new Date().toISOString()
          });
        }
      } else {
        user.streak = 1;
      }
      user.lastActive = today;
      updateUser(user.id, {
        streak: user.streak,
        coins: user.coins,
        lastActive: user.lastActive,
        coinHistory: user.coinHistory
      });
    }

    req.session.userId = user.id;

    const { password: _, ...safeUser } = user;
    res.json({ message: 'Logged in!', user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out.' });
  });
});

module.exports = router;

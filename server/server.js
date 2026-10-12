require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const { initDatabase } = require('./db');
const authRoutes = require('./routes/auth');
const coinsRoutes = require('./routes/coins');
const newsRoutes = require('./routes/news');
const coursesRoutes = require('./routes/courses');
const meditationRoutes = require('./routes/meditation');
const redeemRoutes = require('./routes/redeem');

const app = express();
const PORT = process.env.PORT || 3000;

const isProd = process.env.NODE_ENV === 'production';

// Trust proxy (required for secure cookies behind reverse proxies)
app.set('trust proxy', 1);

// Middleware
app.use(cors({ 
  origin: true, 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: '__session',
  secret: process.env.SESSION_SECRET || 'focusflow-session-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax' // 'none' allows cookies across different domains (Firebase frontend <-> Render backend)
  }
}));

// Serverless DB initialization guard
let dbReady = false;
let dbInitPromise = null;
app.use(async (req, res, next) => {
  if (!dbReady) {
    if (!dbInitPromise) {
      dbInitPromise = initDatabase().then(() => {
        dbReady = true;
      });
    }
    try {
      await dbInitPromise;
    } catch (err) {
      console.error('Database initialization error:', err);
      return res.status(500).json({ error: 'Database initialization error' });
    }
  }
  next();
});

// Serve static files from project root
app.use(express.static(path.join(__dirname, '..')));

// API Routes (mounted on both /api/path and /path for Firebase Hosting / Cloud Function flexibility)
app.use('/api/auth', authRoutes);
app.use('/api/coins', coinsRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/meditation', meditationRoutes);
app.use('/api/redeem', redeemRoutes);

app.use('/auth', authRoutes);
app.use('/coins', coinsRoutes);
app.use('/news', newsRoutes);
app.use('/courses', coursesRoutes);
app.use('/meditation', meditationRoutes);
app.use('/redeem', redeemRoutes);

// Fallback: serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

module.exports = app;

// Initialize database and start server if executed directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Focus Reward Server running on http://localhost:${PORT}`);
        console.log(`  ✦ Dashboard: http://localhost:${PORT}/dashboard.html`);
        console.log(`  ✦ Redeem: http://localhost:${PORT}/redeem.html\n`);
      });
    })
    .catch(err => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

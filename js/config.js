/* ============================================================
   FOCUSFLOW — Production & Client-Side Resilient Engine
   ============================================================
   Provides transparent client-side fallback storage so the entire
   platform works immediately on static hosting (Firebase Spark)
   without requiring a paid serverless backend.
   ============================================================ */

const REMOTE_BACKEND_URL = '';

window.API = (() => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '';
  }
  return localStorage.getItem('FOCUSFLOW_API_URL') || REMOTE_BACKEND_URL || '';
})();

(function() {
  // ---- Helper: Local Storage Store ----
  const STORAGE_USERS = 'focusflow_users_db';
  const STORAGE_SESSION = 'focusflow_active_session';

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_USERS)) || [];
    } catch(e) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  }

  function getCurrentUser() {
    try {
      const id = localStorage.getItem(STORAGE_SESSION);
      if (!id) return null;
      const users = getUsers();
      return users.find(u => u.id === id) || null;
    } catch(e) {
      return null;
    }
  }

  function setCurrentUser(user) {
    if (user && user.id) {
      localStorage.setItem(STORAGE_SESSION, user.id);
    } else {
      localStorage.removeItem(STORAGE_SESSION);
    }
  }

  function updateUser(id, updates) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      saveUsers(users);
      return users[idx];
    }
    return null;
  }

  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      statusText: status === 200 || status === 201 ? 'OK' : 'Error',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Fallback mock data if mock-data.js is loading
  const mockData = window.MOCK_DATA || {
    news: [],
    courses: [],
    meditation: [],
    rewards: []
  };

  // ---- Client API Dispatcher ----
  async function handleClientApi(urlStr, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const url = new URL(urlStr, window.location.origin);
    const pathname = url.pathname;
    const body = options.body ? JSON.parse(options.body) : {};

    const currentUser = getCurrentUser();

    // 1. Auth Register
    if (pathname === '/api/auth/register' && method === 'POST') {
      const { name, email, password } = body;
      if (!name || !email || !password) {
        return jsonResponse({ error: 'Name, email, and password are required.' }, 400);
      }
      const users = getUsers();
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return jsonResponse({ error: 'Email already registered.' }, 409);
      }
      const newUser = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name,
        email: email.toLowerCase(),
        password,
        coins: 50,
        streak: 1,
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
      };
      users.push(newUser);
      saveUsers(users);
      setCurrentUser(newUser);
      const { password: _, ...safeUser } = newUser;
      return jsonResponse({ message: 'Account created!', user: safeUser }, 201);
    }

    // 2. Auth Login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = body;
      if (!email || !password) {
        return jsonResponse({ error: 'Email and password are required.' }, 400);
      }
      const users = getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user || user.password !== password) {
        return jsonResponse({ error: 'Invalid email or password.' }, 401);
      }

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      if (user.lastActive !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (user.lastActive === yesterday) {
          user.streak = (user.streak || 0) + 1;
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
        updateUser(user.id, user);
      }

      setCurrentUser(user);
      const { password: _, ...safeUser } = user;
      return jsonResponse({ message: 'Logged in successfully!', user: safeUser }, 200);
    }

    // 3. Auth Me
    if (pathname === '/api/auth/me' && method === 'GET') {
      if (!currentUser) {
        return jsonResponse({ error: 'Not authenticated.' }, 401);
      }
      const { password: _, ...safeUser } = currentUser;
      return jsonResponse({ user: safeUser }, 200);
    }

    // 4. Auth Logout
    if (pathname === '/api/auth/logout' && method === 'POST') {
      setCurrentUser(null);
      return jsonResponse({ message: 'Logged out successfully.' }, 200);
    }

    // 5. News Feed
    if (pathname === '/api/news/feed' && method === 'GET') {
      const news = (window.MOCK_DATA && window.MOCK_DATA.news) || [];
      const readIds = (currentUser && currentUser.readNews) || [];
      const articles = news.map(a => ({
        ...a,
        isRead: readIds.includes(a.id)
      }));
      return jsonResponse({ articles });
    }

    // 6. News Read
    const newsReadMatch = pathname.match(/^\/api\/news\/([^/]+)\/read$/);
    if (newsReadMatch && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);
      const id = newsReadMatch[1];
      const news = (window.MOCK_DATA && window.MOCK_DATA.news) || [];
      const article = news.find(a => a.id === id);
      if (!article) return jsonResponse({ error: 'Article not found' }, 404);

      if (!currentUser.readNews.includes(id)) {
        currentUser.readNews.push(id);
        const coinsEarned = article.coinsOnRead || 5;
        currentUser.coins += coinsEarned;
        currentUser.coinHistory.unshift({
          action: 'news_read',
          coins: coinsEarned,
          detail: `Read: ${article.headline.substring(0, 48)}...`,
          date: new Date().toISOString()
        });
        updateUser(currentUser.id, currentUser);
        return jsonResponse({ message: 'Article read!', coins: currentUser.coins, earned: coinsEarned });
      }
      return jsonResponse({ message: 'Already read.', coins: currentUser.coins, earned: 0 });
    }

    // 7. Courses All
    if (pathname === '/api/courses' && method === 'GET') {
      const courses = (window.MOCK_DATA && window.MOCK_DATA.courses) || [];
      return jsonResponse({ courses });
    }

    // 8. Courses Enrolled
    if (pathname === '/api/courses/enrolled' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);
      const courses = (window.MOCK_DATA && window.MOCK_DATA.courses) || [];
      const enrolledIds = currentUser.enrolledCourses || [];
      const completedModules = currentUser.completedModules || [];
      const enrolledCourses = courses
        .filter(c => enrolledIds.includes(c.id))
        .map(c => ({
          ...c,
          modules: c.modules.map(m => ({
            ...m,
            completed: completedModules.includes(m.id)
          })),
          progress: Math.round((c.modules.filter(m => completedModules.includes(m.id)).length / (c.modules.length || 1)) * 100)
        }));
      return jsonResponse({ courses: enrolledCourses });
    }

    // 9. Course Enroll
    const courseEnrollMatch = pathname.match(/^\/api\/courses\/([^/]+)\/enroll$/);
    if (courseEnrollMatch && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);
      const id = courseEnrollMatch[1];
      if (!currentUser.enrolledCourses.includes(id)) {
        currentUser.enrolledCourses.push(id);
        updateUser(currentUser.id, currentUser);
      }
      return jsonResponse({ message: 'Enrolled successfully!', enrolled: currentUser.enrolledCourses });
    }

    // 10. Course Module Complete
    const courseModuleMatch = pathname.match(/^\/api\/courses\/([^/]+)\/module\/([^/]+)\/complete$/);
    if (courseModuleMatch && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);
      const [_, courseId, moduleId] = courseModuleMatch;
      const courses = (window.MOCK_DATA && window.MOCK_DATA.courses) || [];
      const course = courses.find(c => c.id === courseId);
      if (!course) return jsonResponse({ error: 'Course not found' }, 404);

      if (!currentUser.completedModules.includes(moduleId)) {
        currentUser.completedModules.push(moduleId);
        const moduleCoins = course.coinsPerModule || 25;
        currentUser.coins += moduleCoins;
        currentUser.coinHistory.unshift({
          action: 'course_module',
          coins: moduleCoins,
          detail: `Module completed in ${course.title}`,
          date: new Date().toISOString()
        });

        // Check if all modules complete
        const allDone = course.modules.every(m => currentUser.completedModules.includes(m.id));
        let bonus = 0;
        if (allDone) {
          bonus = course.coinsOnComplete || 100;
          currentUser.coins += bonus;
          currentUser.coinHistory.unshift({
            action: 'course_complete',
            coins: bonus,
            detail: `🎉 Completed course: ${course.title}!`,
            date: new Date().toISOString()
          });
        }
        updateUser(currentUser.id, currentUser);
        return jsonResponse({
          message: 'Module completed!',
          coins: currentUser.coins,
          earned: moduleCoins + bonus,
          courseCompleted: allDone
        });
      }
      return jsonResponse({ message: 'Already completed.', coins: currentUser.coins, earned: 0 });
    }

    // 11. Meditation Sessions Status
    if (pathname === '/api/meditation/sessions/status' && method === 'GET') {
      const sessions = (window.MOCK_DATA && window.MOCK_DATA.meditation) || [];
      const completedIds = (currentUser && currentUser.completedMeditations) || [];
      const withStatus = sessions.map(s => ({
        ...s,
        completed: completedIds.includes(s.id)
      }));
      return jsonResponse({ sessions: withStatus });
    }

    // 12. Meditation Complete
    const medCompleteMatch = pathname.match(/^\/api\/meditation\/([^/]+)\/complete$/);
    if (medCompleteMatch && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);
      const id = medCompleteMatch[1];
      const sessions = (window.MOCK_DATA && window.MOCK_DATA.meditation) || [];
      const session = sessions.find(s => s.id === id);
      if (!session) return jsonResponse({ error: 'Session not found' }, 404);

      if (!currentUser.completedMeditations.includes(id)) {
        currentUser.completedMeditations.push(id);
        const coinsEarned = session.coinsOnComplete || 30;
        currentUser.coins += coinsEarned;
        currentUser.coinHistory.unshift({
          action: 'meditation',
          coins: coinsEarned,
          detail: `Meditation: ${session.title}`,
          date: new Date().toISOString()
        });
        updateUser(currentUser.id, currentUser);
        return jsonResponse({ message: 'Session completed!', coins: currentUser.coins, earned: coinsEarned });
      }
      return jsonResponse({ message: 'Already completed.', coins: currentUser.coins, earned: 0 });
    }

    // 13. Redeem Catalog
    if (pathname === '/api/redeem/catalog' && method === 'GET') {
      const rewards = (window.MOCK_DATA && window.MOCK_DATA.rewards) || [];
      return jsonResponse({ rewards });
    }

    // 14. Redeem History
    if (pathname === '/api/redeem/history' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);
      return jsonResponse({ redemptions: currentUser.redemptions || [] });
    }

    // 15. Redeem Action
    if (pathname === '/api/redeem' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);
      const { rewardId } = body;
      const rewards = (window.MOCK_DATA && window.MOCK_DATA.rewards) || [];
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) return jsonResponse({ error: 'Reward not found' }, 404);

      if (currentUser.coins < reward.coinsRequired) {
        return jsonResponse({
          error: `Not enough coins. You need ${reward.coinsRequired} but have ${currentUser.coins}.`,
          coinsNeeded: reward.coinsRequired - currentUser.coins
        }, 400);
      }

      currentUser.coins -= reward.coinsRequired;
      const redemption = {
        id: 'rdm_' + Date.now(),
        rewardId: reward.id,
        rewardTitle: reward.title,
        rewardSubtitle: reward.subtitle,
        coinsSpent: reward.coinsRequired,
        code: 'FF-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        date: new Date().toISOString(),
        status: 'fulfilled'
      };
      currentUser.redemptions.unshift(redemption);
      currentUser.coinHistory.unshift({
        action: 'redemption',
        coins: -reward.coinsRequired,
        detail: `Redeemed: ${reward.title} (${redemption.code})`,
        date: new Date().toISOString()
      });
      updateUser(currentUser.id, currentUser);

      return jsonResponse({
        message: `🎁 ${reward.title} redeemed successfully!`,
        coins: currentUser.coins,
        redemption
      });
    }

    // 16. Coin Balance & History
    if (pathname === '/api/coins/balance' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);
      return jsonResponse({ coins: currentUser.coins, streak: currentUser.streak });
    }
    if (pathname === '/api/coins/history' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);
      return jsonResponse({ history: currentUser.coinHistory || [] });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }

  // ---- Transparent fetch Interceptor ----
  const nativeFetch = window.fetch;
  window.fetch = async function(input, init) {
    const urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');

    // Intercept /api/ calls
    if (urlStr.includes('/api/')) {
      // If a remote backend URL is explicitly configured, try it first
      if (REMOTE_BACKEND_URL) {
        try {
          const res = await nativeFetch(input, init);
          if (res.status !== 404 && res.status !== 502 && res.status !== 503) {
            return res;
          }
        } catch (e) {
          // Network error contacting remote server -> fallback to local client storage
        }
      }

      // If running locally on localhost, try the local Node server first
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
          const res = await nativeFetch(input, init);
          if (res.status !== 404) {
            return res;
          }
        } catch (e) {
          // Local Node server not running -> fallback to client storage seamlessly!
        }
      }

      // Execute client-side storage engine
      return handleClientApi(urlStr, init);
    }

    return nativeFetch(input, init);
  };

  console.log('⚡ FocusFlow Client-Side Storage & API Engine Ready!');
})();

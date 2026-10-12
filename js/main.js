/* ============================================================
   FOCUSFLOW — Landing Page JavaScript
   ============================================================ */

const API = window.API !== undefined ? window.API : '';

// ---- Theme Toggle Logic ----
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark'; // Defaulting to dark
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }
}
initTheme();


// ---- Navigation ----
const navLinks = document.getElementById('navLinks');
const hamburger = document.getElementById('hamburger');

hamburger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', open);
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

window.addEventListener('scroll', () => {
  document.querySelector('nav').classList.toggle('scrolled', window.scrollY > 40);
});

// ---- Scroll Reveal ----
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

// ---- Auth Modal ----
const authModal = document.getElementById('authModal');
const modalClose = document.getElementById('modalClose');
const registerView = document.getElementById('registerView');
const loginView = document.getElementById('loginView');
const showLogin = document.getElementById('showLogin');
const showRegister = document.getElementById('showRegister');

function openModal(view = 'register') {
  authModal.classList.add('active');
  if (view === 'login') {
    registerView.style.display = 'none';
    loginView.style.display = 'block';
  } else {
    registerView.style.display = 'block';
    loginView.style.display = 'none';
  }
}

function closeModal() {
  authModal.classList.remove('active');
}

modalClose.addEventListener('click', closeModal);
authModal.addEventListener('click', (e) => { if (e.target === authModal) closeModal(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

showLogin.addEventListener('click', (e) => { e.preventDefault(); openModal('login'); });
showRegister.addEventListener('click', (e) => { e.preventDefault(); openModal('register'); });

// Open modal from nav and hero buttons
document.getElementById('navLoginBtn').addEventListener('click', (e) => { e.preventDefault(); openModal(); });
document.getElementById('heroStartBtn').addEventListener('click', (e) => { e.preventDefault(); openModal(); });
document.getElementById('ctaStartBtn').addEventListener('click', (e) => { e.preventDefault(); openModal(); });

// ---- Helper: Client-Side Fallback Storage ----
function getLocalUsers() {
  try { return JSON.parse(localStorage.getItem('focusflow_users_db')) || []; } catch(e) { return []; }
}
function saveLocalUsers(u) {
  try { localStorage.setItem('focusflow_users_db', JSON.stringify(u)); } catch(e) {}
}
function setLocalSession(userId) {
  try { localStorage.setItem('focusflow_active_session', userId); } catch(e) {}
}

function registerClientUser(name, email, password) {
  const users = getLocalUsers();
  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error('Email already registered.');
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
  saveLocalUsers(users);
  setLocalSession(newUser.id);
  return newUser;
}

function loginClientUser(email, password) {
  const users = getLocalUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    throw new Error('Invalid email or password.');
  }
  setLocalSession(user.id);
  return user;
}

// ---- Register ----
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('regError');
  errEl.style.display = 'none';

  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  try {
    let succeeded = false;
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      });
      if (res && res.ok) {
        succeeded = true;
      }
    } catch (netErr) {
      // Remote server not reachable
    }

    if (!succeeded) {
      registerClientUser(name, email, password);
    }

    // Registration succeeded — redirect to dashboard
    window.location.href = '/dashboard.html';
  } catch (err) {
    errEl.textContent = err.message || 'Registration failed.';
    errEl.style.display = 'block';
  }
});

// ---- Login ----
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    let succeeded = false;
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      if (res && res.ok) {
        succeeded = true;
      }
    } catch (netErr) {
      // Remote server not reachable
    }

    if (!succeeded) {
      loginClientUser(email, password);
    }

    window.location.href = '/dashboard.html';
  } catch (err) {
    errEl.textContent = err.message || 'Invalid email or password.';
    errEl.style.display = 'block';
  }
});

// ---- Load Rewards Preview ----
async function loadRewardsPreview() {
  try {
    const res = await fetch(`${API}/api/redeem/catalog`);
    const data = await res.json();
    const grid = document.getElementById('rewardsPreview');
    if (!grid || !data.rewards) return;

    grid.innerHTML = data.rewards.map(r => `
      <div class="reward-card reveal">
        <div class="reward-icon">${r.icon}</div>
        <h3>${r.title}</h3>
        <p class="reward-sub">${r.subtitle}</p>
        <p style="font-size:0.85rem; margin-bottom:14px;">${r.description}</p>
        <div class="reward-cost">🪙 ${r.coinsRequired.toLocaleString()} coins</div>
      </div>
    `).join('');

    // Re-observe new elements
    grid.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
  } catch (err) {
    // If server not running, show static cards
    const grid = document.getElementById('rewardsPreview');
    if (grid) {
      grid.innerHTML = `
        <div class="reward-card"><div class="reward-icon">🤖</div><h3>ChatGPT Plus</h3><p class="reward-sub">1 Month</p><div class="reward-cost">🪙 2,000 coins</div></div>
        <div class="reward-card"><div class="reward-icon">🎓</div><h3>Coursera Plus</h3><p class="reward-sub">1 Month</p><div class="reward-cost">🪙 4,000 coins</div></div>
        <div class="reward-card"><div class="reward-icon">🛒</div><h3>Amazon Gift Card</h3><p class="reward-sub">₹500</p><div class="reward-cost">🪙 500 coins</div></div>
        <div class="reward-card"><div class="reward-icon">☕</div><h3>Starbucks</h3><p class="reward-sub">₹300</p><div class="reward-cost">🪙 300 coins</div></div>
        <div class="reward-card"><div class="reward-icon">🎵</div><h3>Spotify Premium</h3><p class="reward-sub">1 Month</p><div class="reward-cost">🪙 600 coins</div></div>
        <div class="reward-card"><div class="reward-icon">🛍️</div><h3>Flipkart Gift Card</h3><p class="reward-sub">₹500</p><div class="reward-cost">🪙 500 coins</div></div>
      `;
    }
  }
}

// ---- Check if already logged in ----
async function checkAuth() {
  try {
    let loggedIn = false;
    try {
      const res = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
      if (res && res.ok) loggedIn = true;
    } catch(e) {}

    if (!loggedIn) {
      const activeId = localStorage.getItem('focusflow_active_session');
      if (activeId && getLocalUsers().some(u => u.id === activeId)) {
        loggedIn = true;
      }
    }

    if (loggedIn) {
      const navCta = document.getElementById('navLoginBtn');
      if (navCta) {
        navCta.textContent = 'Dashboard';
        navCta.addEventListener('click', (e) => {
          e.preventDefault();
          window.location.href = '/dashboard.html';
        }, { once: true });
      }
    }
  } catch (e) { /* not logged in, that's fine */ }
}

// ---- Init ----
loadRewardsPreview();
checkAuth();

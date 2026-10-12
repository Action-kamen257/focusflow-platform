/* ============================================================
   FOCUSFLOW — Redeem Page JavaScript
   ============================================================ */

const API = window.API !== undefined ? window.API : '';
let currentUser = null;

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

async function checkAuth() {
  try {
    const res = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
    if (!res.ok) throw new Error();
    const data = await res.json();
    currentUser = data.user;
    document.getElementById('coinBalance').textContent = currentUser.coins.toLocaleString();
    document.getElementById('heroBalance').textContent = currentUser.coins.toLocaleString();
    loadCatalog();
    loadHistory();
  } catch (e) {
    window.location.href = '/';
  }
}

function showToast(msg) {
  const toast = document.getElementById('coinToast');
  document.getElementById('toastText').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function updateCoins(n) {
  currentUser.coins = n;
  document.getElementById('coinBalance').textContent = n.toLocaleString();
  document.getElementById('heroBalance').textContent = n.toLocaleString();
}

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function loadCatalog() {
  const res = await fetch(`${API}/api/redeem/catalog`);
  const data = await res.json();
  const grid = document.getElementById('redeemGrid');

  grid.innerHTML = data.rewards.map(r => {
    const can = currentUser.coins >= r.coinsRequired;
    return `
      <div class="r-card" style="--card-glow: ${r.color}33">
        <div class="r-icon">${r.icon}</div>
        <h3>${r.title}</h3>
        <div class="r-sub">${r.subtitle}</div>
        <div class="r-value">${r.value} value</div>
        <p class="r-desc">${r.description}</p>
        <div class="r-cost">🪙 ${r.coinsRequired.toLocaleString()}</div>
        <button class="r-btn ${can ? 'can' : 'cant'}" ${can ? `onclick="redeemReward('${r.id}')"` : 'disabled'}>
          ${can ? '🎁 Redeem Now' : `Need ${(r.coinsRequired - currentUser.coins).toLocaleString()} more coins`}
        </button>
      </div>
    `;
  }).join('');
}

async function loadHistory() {
  const res = await fetch(`${API}/api/redeem/history`, { credentials: 'include' });
  const data = await res.json();
  const list = document.getElementById('historyList');
  if (!data.redemptions || data.redemptions.length === 0) return;

  list.innerHTML = data.redemptions.map(r => `
    <div class="activity-item">
      <div class="a-icon" style="background:var(--amber-soft)">🎁</div>
      <div class="a-text">
        <div class="a-title">${r.rewardTitle} — ${r.rewardSubtitle}</div>
        <div class="a-time">${formatTimeAgo(r.date)} · Status: ${r.status}</div>
      </div>
      <div class="a-coins negative" style="color:var(--rose)">-${r.coinsSpent.toLocaleString()}</div>
    </div>
  `).join('');
}

async function redeemReward(id) {
  if (!confirm('Are you sure you want to redeem this reward?')) return;
  try {
    const res = await fetch(`${API}/api/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rewardId: id })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message);
      updateCoins(data.coins);
      loadCatalog();
      loadHistory();
    } else {
      alert(data.error);
    }
  } catch (e) { console.error(e); }
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  window.location.href = '/';
});

window.redeemReward = redeemReward;
checkAuth();

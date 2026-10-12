/* ============================================================
   FOCUSFLOW — Dashboard JavaScript
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

// ---- Auth Check ----
async function checkAuth() {
  try {
    const res = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
    if (!res.ok) throw new Error('Not authenticated');
    const data = await res.json();
    currentUser = data.user;
    renderUserInfo();
    loadAllTabs();
  } catch (e) {
    window.location.href = '/';
  }
}

// ---- Render User Info ----
function renderUserInfo() {
  document.getElementById('coinBalance').textContent = currentUser.coins.toLocaleString();
  document.getElementById('streakCount').textContent = currentUser.streak;
  document.getElementById('userName').textContent = currentUser.name.split(' ')[0];
  document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();

  // Greeting based on time
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  document.getElementById('greeting').textContent = `${greeting}, ${currentUser.name.split(' ')[0]}! 👋`;
}

// ---- Tab Navigation ----
document.querySelectorAll('.dash-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ---- Coin Toast ----
function showToast(message) {
  const toast = document.getElementById('coinToast');
  document.getElementById('toastText').textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ---- Update Coin Display ----
function updateCoins(newTotal) {
  currentUser.coins = newTotal;
  document.getElementById('coinBalance').textContent = newTotal.toLocaleString();
  document.getElementById('statCoins').textContent = newTotal.toLocaleString();
}

// ---- Logout ----
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  window.location.href = '/';
});

// ---- Load All Tabs ----
function loadAllTabs() {
  loadOverview();
  loadNews();
  loadCourses();
  loadMeditation();
  loadRedeem();
}

// ==============================
// OVERVIEW TAB
// ==============================
function loadOverview() {
  document.getElementById('statCoins').textContent = currentUser.coins.toLocaleString();
  document.getElementById('statNews').textContent = (currentUser.readNews || []).length;
  document.getElementById('statModules').textContent = (currentUser.completedModules || []).length;
  document.getElementById('statMed').textContent = (currentUser.completedMeditations || []).length;

  const list = document.getElementById('activityList');
  const history = currentUser.coinHistory || [];
  if (history.length === 0) {
    list.innerHTML = '<p style="padding:20px; color:var(--text-dim);">No activity yet. Start learning!</p>';
    return;
  }

  list.innerHTML = history.slice(0, 10).map(h => {
    const icon = getActionIcon(h.action);
    const bg = getActionBg(h.action);
    const isNeg = h.coins < 0;
    const timeAgo = formatTimeAgo(h.date);
    return `
      <div class="activity-item">
        <div class="a-icon" style="background:${bg}">${icon}</div>
        <div class="a-text">
          <div class="a-title">${h.detail}</div>
          <div class="a-time">${timeAgo}</div>
        </div>
        <div class="a-coins ${isNeg ? 'negative' : 'positive'}">${isNeg ? '' : '+'}${h.coins}</div>
      </div>
    `;
  }).join('');
  lucide.createIcons();
}

function getActionIcon(action) {
  const icons = { news_read: '<i data-lucide="newspaper"></i>', course_module: '<i data-lucide="book-open"></i>', course_complete: '<i data-lucide="graduation-cap"></i>', meditation: '<i data-lucide="flower-2"></i>', streak_bonus: '<i data-lucide="flame"></i>', referral: '<i data-lucide="users"></i>', welcome_bonus: '<i data-lucide="sparkles"></i>', redemption: '<i data-lucide="gift"></i>' };
  return icons[action] || '<i data-lucide="star"></i>';
}
function getActionBg(action) {
  const bgs = { news_read: 'rgba(14,165,233,0.12)', course_module: 'rgba(16,185,129,0.12)', course_complete: 'rgba(124,58,237,0.12)', meditation: 'rgba(167,139,250,0.12)', streak_bonus: 'rgba(244,63,94,0.12)', referral: 'rgba(245,158,11,0.12)', welcome_bonus: 'rgba(124,58,237,0.12)', redemption: 'rgba(245,158,11,0.12)' };
  return bgs[action] || 'rgba(255,255,255,0.05)';
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

// ==============================
// NEWS TAB
// ==============================
async function loadNews() {
  try {
    const res = await fetch(`${API}/api/news/feed`, { credentials: 'include' });
    const data = await res.json();
    const grid = document.getElementById('newsGrid');

    const categoryColors = {
      Economy: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)', color: '#10B981' },
      Science: { bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.2)', color: '#7C3AED' },
      Finance: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)', color: '#F59E0B' },
      Law: { bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.2)', color: '#F43F5E' },
      Technology: { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.2)', color: '#0EA5E9' },
      Sports: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)', color: '#F59E0B' },
      Policy: { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.2)', color: '#A78BFA' },
      Health: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)', color: '#10B981' },
      Education: { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.2)', color: '#0EA5E9' },
      Business: { bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.2)', color: '#7C3AED' },
      Infrastructure: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)', color: '#F59E0B' },
    };

    grid.innerHTML = data.articles.map(article => {
      const catStyle = categoryColors[article.category] || { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.2)', color: '#0EA5E9' };
      return `
        <div class="news-card ${article.isRead ? 'read' : ''}" id="news-${article.id}">
          <span class="news-cat" style="background:${catStyle.bg};border-color:${catStyle.border};color:${catStyle.color}">${article.category}</span>
          <div class="news-body">
            <h3>${article.headline}</h3>
            <p>${article.summary}</p>
            <div class="news-meta">${article.source} · ${new Date(article.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
          </div>
          <div class="news-action">
            ${article.isRead
              ? '<button class="btn-sm done" disabled>Read</button>'
              : `<button class="btn-sm earn" onclick="markNewsRead('${article.id}')">+5 <i data-lucide="coins" style="width:14px;height:14px;display:inline-block;vertical-align:text-bottom;margin-right:2px;"></i> Read</button>`
            }
          </div>
        </div>
      `;
    }).join('');
    lucide.createIcons();
  } catch (e) {
    document.getElementById('newsGrid').innerHTML = '<p style="padding:20px;color:var(--text-dim);">Could not load news. Check server.</p>';
  }
}

async function markNewsRead(id) {
  try {
    const res = await fetch(`${API}/api/news/${id}/read`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (data.earned > 0) {
      showToast(`+${data.earned} coins — Article read! 📰`);
      updateCoins(data.coins);
      currentUser.readNews.push(id);
      document.getElementById('statNews').textContent = currentUser.readNews.length;

      const card = document.getElementById(`news-${id}`);
      card.classList.add('read');
      card.querySelector('.news-action').innerHTML = '<button class="btn-sm done" disabled>✓ Read</button>';

      // Update activity
      currentUser.coinHistory.unshift({ action: 'news_read', coins: 5, detail: 'Article read', date: new Date().toISOString() });
      loadOverview();
    }
  } catch (e) { console.error(e); }
}

// ==============================
// COURSES TAB
// ==============================
async function loadCourses() {
  try {
    // Load enrolled
    const enrolledRes = await fetch(`${API}/api/courses/enrolled`, { credentials: 'include' });
    const enrolledData = await enrolledRes.json();
    renderEnrolledCourses(enrolledData.courses);

    // Load all courses
    const allRes = await fetch(`${API}/api/courses`);
    const allData = await allRes.json();
    renderAllCourses(allData.courses, currentUser.enrolledCourses);
  } catch (e) {
    document.getElementById('allCourses').innerHTML = '<p style="padding:20px;color:var(--text-dim);">Could not load courses.</p>';
  }
}

function renderEnrolledCourses(courses) {
  const grid = document.getElementById('enrolledCourses');
  if (!courses || courses.length === 0) {
    grid.innerHTML = '<p style="padding:20px;color:var(--text-dim);">No courses enrolled yet. Browse below!</p>';
    return;
  }

  grid.innerHTML = courses.map(c => `
    <div class="course-card">
      <img class="course-thumb" src="${c.thumbnail}" alt="${c.title}" onerror="this.style.background='var(--bg-card2)'">
      <div class="course-info">
        <div class="course-provider">${c.provider}</div>
        <h3>${c.title}</h3>
        <div class="course-progress">
          <div class="course-progress-fill" style="width:${c.progress}%"></div>
        </div>
        <div class="course-progress-label">${c.progress}% complete · +25 coins/module</div>
        <div class="course-modules">
          ${c.modules.map(m => `
            <div class="module-item ${m.completed ? 'completed' : ''}">
              <span class="m-status">${m.completed ? '<i data-lucide="check-circle-2" style="width:16px;height:16px;color:var(--emerald);"></i>' : '<i data-lucide="circle" style="width:16px;height:16px;"></i>'}</span>
              <span class="m-title">${m.title}</span>
              ${m.completed
                ? '<span style="font-size:0.72rem;color:var(--text-dim)">Done</span>'
                : `<button class="btn-sm earn" onclick="completeModule('${c.id}','${m.id}')">+25 <i data-lucide="coins" style="width:12px;height:12px;display:inline-block;margin-left:2px;"></i></button>`
              }
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

function renderAllCourses(courses, enrolledIds) {
  const grid = document.getElementById('allCourses');
  const unenrolled = courses.filter(c => !enrolledIds.includes(c.id));

  if (unenrolled.length === 0) {
    grid.innerHTML = '<p style="padding:20px;color:var(--text-dim);">You\'re enrolled in all available courses! 🎉</p>';
    return;
  }

  grid.innerHTML = unenrolled.map(c => `
    <div class="course-card">
      <img class="course-thumb" src="${c.thumbnail}" alt="${c.title}" onerror="this.style.background='var(--bg-card2)'">
      <div class="course-info">
        <div class="course-provider">${c.provider}</div>
        <h3>${c.title}</h3>
        <p>${c.description}</p>
        <div class="course-meta">
          <span><i data-lucide="clock" style="width:14px;height:14px;"></i> ${c.duration}</span>
          <span><i data-lucide="star" style="width:14px;height:14px;color:var(--amber);"></i> ${c.rating}</span>
          <span><i data-lucide="package" style="width:14px;height:14px;"></i> ${c.totalModules} modules</span>
        </div>
        <button class="btn-block primary" onclick="enrollCourse('${c.id}')">Enroll & Start Earning</button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

async function enrollCourse(id) {
  try {
    const res = await fetch(`${API}/api/courses/${id}/enroll`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    showToast(data.message);
    currentUser.enrolledCourses.push(id);
    loadCourses();
  } catch (e) { console.error(e); }
}

async function completeModule(courseId, moduleId) {
  try {
    const res = await fetch(`${API}/api/courses/${courseId}/module/${moduleId}/complete`, {
      method: 'POST', credentials: 'include'
    });
    const data = await res.json();
    if (data.earned > 0) {
      showToast(data.message);
      updateCoins(data.coins);
      currentUser.completedModules.push(moduleId);
      document.getElementById('statModules').textContent = currentUser.completedModules.length;
      loadCourses();
      loadOverview();
    }
  } catch (e) { console.error(e); }
}

// ==============================
// MEDITATION TAB
// ==============================
async function loadMeditation() {
  try {
    const res = await fetch(`${API}/api/meditation/sessions/status`, { credentials: 'include' });
    const data = await res.json();
    const grid = document.getElementById('meditationGrid');

    grid.innerHTML = data.sessions.map(s => `
      <div class="med-card ${s.completed ? 'completed-med' : ''}">
        <img class="med-thumb" src="${s.thumbnail}" alt="${s.title}" onerror="this.style.background='var(--bg-card2)'">
        <div class="med-info">
          <span class="med-cat">${s.category}</span>
          <h3>${s.title}</h3>
          <p>${s.description}</p>
          <div class="med-meta">
            <span><i data-lucide="clock" style="width:14px;height:14px;"></i> ${s.duration}</span>
            <span><i data-lucide="mic" style="width:14px;height:14px;"></i> ${s.instructor}</span>
            <span><i data-lucide="coins" style="width:14px;height:14px;"></i> +${s.coinsOnComplete} coins</span>
          </div>
          <iframe class="med-video" src="https://www.youtube.com/embed/${s.youtubeId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
          ${s.completed
            ? '<button class="btn-block done" disabled><i data-lucide="check-circle-2" style="width:16px;height:16px;display:inline-block;vertical-align:text-bottom;margin-right:6px;"></i> Completed This Month</button>'
            : `<button class="btn-block success" onclick="completeMeditation('${s.id}')">Complete & Earn +${s.coinsOnComplete} <i data-lucide="coins" style="width:16px;height:16px;display:inline-block;vertical-align:text-bottom;margin-left:4px;"></i></button>`
          }
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  } catch (e) {
    document.getElementById('meditationGrid').innerHTML = '<p style="padding:20px;color:var(--text-dim);">Could not load sessions.</p>';
  }
}

async function completeMeditation(id) {
  try {
    const res = await fetch(`${API}/api/meditation/${id}/complete`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (data.earned > 0) {
      showToast(data.message);
      updateCoins(data.coins);
      currentUser.completedMeditations.push(id);
      document.getElementById('statMed').textContent = currentUser.completedMeditations.length;
      loadMeditation();
      loadOverview();
    }
  } catch (e) { console.error(e); }
}

// ==============================
// REDEEM TAB
// ==============================
async function loadRedeem() {
  try {
    const res = await fetch(`${API}/api/redeem/catalog`);
    const data = await res.json();
    const grid = document.getElementById('redeemGrid');

    grid.innerHTML = data.rewards.map(r => {
      const canAfford = currentUser.coins >= r.coinsRequired;
      return `
        <div class="course-card" style="overflow:visible;">
          <div class="course-info" style="text-align:center;">
            <div style="font-size:3rem; margin-bottom:12px;">${r.icon}</div>
            <h3>${r.title}</h3>
            <p style="font-size:0.85rem; color:var(--text-dim); margin-bottom:4px;">${r.subtitle}</p>
            <p style="font-size:0.82rem; margin-bottom:16px;">${r.description}</p>
            <div style="display:inline-flex;align-items:center;gap:6px;background:var(--amber-soft);border:1px solid rgba(245,158,11,0.2);border-radius:100px;padding:6px 16px;font-size:0.88rem;font-weight:700;color:var(--amber);font-family:var(--font-head);margin-bottom:14px;">
              <i data-lucide="coins" style="width:16px;height:16px;"></i> ${r.coinsRequired.toLocaleString()} coins
            </div>
            <br>
            ${canAfford
              ? `<button class="btn-block success" onclick="redeemReward('${r.id}')">Redeem Now <i data-lucide="gift" style="width:16px;height:16px;vertical-align:text-bottom;margin-left:4px;"></i></button>`
              : `<button class="btn-block done" disabled>Need ${(r.coinsRequired - currentUser.coins).toLocaleString()} more coins</button>`
            }
          </div>
        </div>
      `;
    }).join('');

    // Load history
    const histRes = await fetch(`${API}/api/redeem/history`, { credentials: 'include' });
    const histData = await histRes.json();
    const histList = document.getElementById('redeemHistory');

    if (histData.redemptions && histData.redemptions.length > 0) {
      histList.innerHTML = histData.redemptions.map(r => `
        <div class="activity-item">
          <div class="a-icon" style="background:var(--amber-soft)"><i data-lucide="gift"></i></div>
          <div class="a-text">
            <div class="a-title">${r.rewardTitle} — ${r.rewardSubtitle}</div>
            <div class="a-time">${formatTimeAgo(r.date)} · ${r.status}</div>
          </div>
          <div class="a-coins negative">-${r.coinsSpent}</div>
        </div>
      `).join('');
    }
    lucide.createIcons();
  } catch (e) {
    document.getElementById('redeemGrid').innerHTML = '<p style="padding:20px;color:var(--text-dim);">Could not load rewards.</p>';
  }
}

async function redeemReward(rewardId) {
  if (!confirm('Are you sure you want to redeem this reward?')) return;
  try {
    const res = await fetch(`${API}/api/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rewardId })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message);
      updateCoins(data.coins);
      currentUser.redemptions.unshift(data.redemption);
      loadRedeem();
      loadOverview();
    } else {
      alert(data.error);
    }
  } catch (e) { console.error(e); }
}

// Make functions global
window.markNewsRead = markNewsRead;
window.enrollCourse = enrollCourse;
window.completeModule = completeModule;
window.completeMeditation = completeMeditation;
window.redeemReward = redeemReward;

// ---- Init ----
checkAuth();

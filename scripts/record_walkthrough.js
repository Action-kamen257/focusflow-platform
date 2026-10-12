const pw = require('C:/Users/Tushar/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright');
const fs = require('fs');
const path = require('path');

async function smoothScroll(page, distance, steps = 12, delayMs = 45) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate((d) => window.scrollBy({ top: d, behavior: 'smooth' }), distance / steps);
    await page.waitForTimeout(delayMs);
  }
}

(async () => {
  const videosDir = path.resolve(__dirname, '../videos');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  console.log('🚀 Launching Google Chrome via Playwright...');
  const browser = await pw.chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });

  const context = await browser.newContext({
    recordVideo: { dir: videosDir, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // Inject persistent demo user data
  await page.addInitScript(() => {
    const demoUser = {
      id: 'usr_tushar_demo',
      name: 'Tushar Mali',
      email: 'tushar@focusflow.io',
      coins: 520,
      streak: 7,
      lastStreakDate: new Date().toISOString().split('T')[0],
      coursesCompleted: 4,
      articlesRead: 18,
      meditationMinutes: 65,
      createdAt: new Date().toISOString()
    };
    try {
      localStorage.setItem('focusflow_users_db', JSON.stringify([demoUser]));
      localStorage.setItem('focusflow_active_session', demoUser.id);
      localStorage.setItem('theme', 'dark');
    } catch(e) {}
  });

  console.log('🌐 1. Landing Page Navigation (index.html)...');
  await page.goto('https://focus-flow-d8b48.web.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Smooth scroll down sections
  console.log('   Scrolling Problem & Solution sections...');
  await smoothScroll(page, 650, 16, 50);
  await page.waitForTimeout(900);
  await smoothScroll(page, 700, 16, 50);
  await page.waitForTimeout(900);
  await smoothScroll(page, 750, 16, 50);
  await page.waitForTimeout(1000);

  // Scroll back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  // 2. Open Auth Modal
  console.log('🔐 2. Triggering Auth Modal...');
  try {
    const authBtn = await page.locator('button:has-text("Get Started"), a:has-text("Get Started"), button:has-text("Sign In")').first();
    if (await authBtn.isVisible()) {
      await authBtn.click();
      await page.waitForTimeout(1400);
      const closeBtn = await page.locator('.modal-close, button.close, [aria-label="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  } catch(e) {
    console.log('   Auth trigger skipped:', e.message);
  }
  await page.waitForTimeout(600);

  // 3. Main Dashboard
  console.log('📊 3. Navigating to Dashboard (dashboard.html)...');
  await page.goto('https://focus-flow-d8b48.web.app/dashboard.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

  // Inspect overview stats
  await smoothScroll(page, 320, 12, 50);
  await page.waitForTimeout(1000);

  // Newsfeed tab
  console.log('📰 4. Exploring Newsfeed Reader...');
  try {
    const newsTab = await page.locator('[data-tab="news"], button:has-text("News")').first();
    if (await newsTab.isVisible()) {
      await newsTab.click();
      await page.waitForTimeout(1200);
      await smoothScroll(page, 280, 10, 50);
      await page.waitForTimeout(1000);
    }
  } catch(e) {}

  // Courses tab
  console.log('📚 5. Exploring Courses & Upskilling...');
  try {
    const coursesTab = await page.locator('[data-tab="courses"], button:has-text("Courses")').first();
    if (await coursesTab.isVisible()) {
      await coursesTab.click();
      await page.waitForTimeout(1200);
      await smoothScroll(page, 320, 10, 50);
      await page.waitForTimeout(1000);
    }
  } catch(e) {}

  // Meditation tab
  console.log('🧘 6. Exploring Guided Meditation...');
  try {
    const medTab = await page.locator('[data-tab="meditation"], button:has-text("Meditation")').first();
    if (await medTab.isVisible()) {
      await medTab.click();
      await page.waitForTimeout(1200);
      await smoothScroll(page, 260, 10, 50);
      await page.waitForTimeout(1000);
    }
  } catch(e) {}

  // 4. Rewards Marketplace
  console.log('🎁 7. Navigating to Rewards Marketplace (redeem.html)...');
  await page.goto('https://focus-flow-d8b48.web.app/redeem.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await smoothScroll(page, 380, 14, 50);
  await page.waitForTimeout(1200);
  await smoothScroll(page, 380, 14, 50);
  await page.waitForTimeout(1200);

  // 5. FocusFlow AI Hub
  console.log('🧠 8. Navigating to FocusFlow AI Hub (focusflow.html)...');
  await page.goto('https://focus-flow-d8b48.web.app/focusflow.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await smoothScroll(page, 300, 12, 50);
  await page.waitForTimeout(1400);

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  const savedVideoPath = await video.path();
  console.log('🎉 SUCCESS! Walkthrough video saved at:', savedVideoPath);

  // Rename to standard focusflow_walkthrough.webm
  const finalWebm = path.resolve(__dirname, '../images/focusflow_walkthrough.webm');
  fs.copyFileSync(savedVideoPath, finalWebm);
  console.log('📦 Copied to:', finalWebm);
})().catch(err => {
  console.error('Recording failed:', err);
  process.exit(1);
});

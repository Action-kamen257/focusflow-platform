const pw = require('C:/Users/Tushar/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const FRAMES_DIR = path.resolve(__dirname, '../frames_smooth');
if (fs.existsSync(FRAMES_DIR)) {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
}
fs.mkdirSync(FRAMES_DIR, { recursive: true });

(async () => {
  console.log('🚀 Launching Chrome for Smooth 30fps Walkthrough Recording...');

  const browser = await pw.chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
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

  // Inject fluid scroll helper
  await page.addInitScript(() => {
    window.__easeScrollTo = function(targetY, durationMs) {
      return new Promise(resolve => {
        const startY = window.scrollY;
        const diff = targetY - startY;
        const start = performance.now();
        function anim(now) {
          const t = Math.min((now - start) / durationMs, 1);
          // Cubic ease-in-out
          const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          window.scrollTo(0, startY + diff * ease);
          if (t < 1) {
            requestAnimationFrame(anim);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(anim);
      });
    };
  });

  const client = await page.context().newCDPSession(page);

  let frameCount = 0;
  let isCapturing = true;

  client.on('Page.screencastFrame', async ({ data, sessionId }) => {
    try {
      await client.send('Page.screencastFrameAck', { sessionId });
      if (isCapturing) {
        frameCount++;
        const filename = path.join(FRAMES_DIR, `frame_${String(frameCount).padStart(6, '0')}.jpg`);
        fs.writeFileSync(filename, Buffer.from(data, 'base64'));
      }
    } catch (e) {}
  });

  // Start Screencast at quality 90, EVERY frame (everyNthFrame: 1)
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    maxWidth: 1280,
    maxHeight: 720,
    everyNthFrame: 1
  });

  console.log('📍 1. Landing Page Hero (Holding 2.2s)...');
  await page.goto('https://focus-flow-d8b48.web.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);

  console.log('📍 2. Fluid continuous scroll to Solution section...');
  await page.evaluate(() => window.__easeScrollTo(680, 1400));
  await page.waitForTimeout(1800);

  console.log('📍 3. Fluid scroll to Rewards Showcase...');
  await page.evaluate(() => window.__easeScrollTo(1400, 1400));
  await page.waitForTimeout(1800);

  console.log('📍 4. Fluid scroll back to Hero...');
  await page.evaluate(() => window.__easeScrollTo(0, 1200));
  await page.waitForTimeout(1000);

  console.log('📍 5. Triggering Auth Modal (+50 Coins bonus)...');
  try {
    const authBtn = await page.locator('button:has-text("Get Started"), a:has-text("Get Started"), button:has-text("Sign In")').first();
    if (await authBtn.isVisible()) {
      await authBtn.click();
      await page.waitForTimeout(2000);
      const closeBtn = await page.locator('.modal-close, button.close, [aria-label="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  } catch(e) {}
  await page.waitForTimeout(800);

  console.log('📍 6. User Dashboard (Streak & Coins Overview)...');
  await page.goto('https://focus-flow-d8b48.web.app/dashboard.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);

  console.log('📍 7. Exploring Newsfeed Tab (+5 Coins/article)...');
  try {
    const newsTab = await page.locator('[data-tab="news"], button:has-text("News")').first();
    if (await newsTab.isVisible()) {
      await newsTab.click();
      await page.waitForTimeout(1800);
      await page.evaluate(() => window.__easeScrollTo(280, 800));
      await page.waitForTimeout(1400);
    }
  } catch(e) {}

  console.log('📍 8. Exploring Courses Tab (+25 to +100 Coins)...');
  try {
    const coursesTab = await page.locator('[data-tab="courses"], button:has-text("Courses")').first();
    if (await coursesTab.isVisible()) {
      await coursesTab.click();
      await page.waitForTimeout(1800);
      await page.evaluate(() => window.__easeScrollTo(320, 800));
      await page.waitForTimeout(1400);
    }
  } catch(e) {}

  console.log('📍 9. Exploring Meditation Tab (+30 Coins Mindfulness)...');
  try {
    const medTab = await page.locator('[data-tab="meditation"], button:has-text("Meditation")').first();
    if (await medTab.isVisible()) {
      await medTab.click();
      await page.waitForTimeout(1800);
      await page.evaluate(() => window.__easeScrollTo(260, 800));
      await page.waitForTimeout(1400);
    }
  } catch(e) {}

  console.log('📍 10. Rewards Marketplace (redeem.html)...');
  await page.goto('https://focus-flow-d8b48.web.app/redeem.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.__easeScrollTo(360, 900));
  await page.waitForTimeout(1800);

  console.log('📍 11. FocusFlow AI Attention Hub (focusflow.html)...');
  await page.goto('https://focus-flow-d8b48.web.app/focusflow.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.__easeScrollTo(320, 800));
  await page.waitForTimeout(1800);

  isCapturing = false;
  await client.send('Page.stopScreencast');
  await page.close();
  await context.close();
  await browser.close();

  console.log(`🎉 SUCCESS! Captured ${frameCount} smooth frames in ${FRAMES_DIR}`);
})().catch(err => {
  console.error('Recording error:', err);
  process.exit(1);
});

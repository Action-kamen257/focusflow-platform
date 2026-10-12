const pw = require('C:/Users/Tushar/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const FRAMES_DIR = path.resolve(__dirname, '../frames');
if (fs.existsSync(FRAMES_DIR)) {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
}
fs.mkdirSync(FRAMES_DIR, { recursive: true });

async function smoothScroll(page, distance, steps = 10, delayMs = 60) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate((d) => window.scrollBy({ top: d, behavior: 'smooth' }), distance / steps);
    await page.waitForTimeout(delayMs);
  }
}

(async () => {
  console.log('🎬 Starting CDP Screen Recording of FocusFlow...');

  const browser = await pw.chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  // Inject user session into localStorage
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

  const client = await page.context().newCDPSession(page);

  let frameCount = 0;
  let isCapturing = true;

  client.on('Page.screencastFrame', async ({ data, sessionId }) => {
    try {
      await client.send('Page.screencastFrameAck', { sessionId });
      if (isCapturing) {
        frameCount++;
        const filename = path.join(FRAMES_DIR, `frame_${String(frameCount).padStart(5, '0')}.jpg`);
        fs.writeFileSync(filename, Buffer.from(data, 'base64'));
      }
    } catch (e) {}
  });

  // Start Screencast at quality 80, every 2nd frame
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 80,
    maxWidth: 1280,
    maxHeight: 720,
    everyNthFrame: 2
  });

  console.log('📍 Step 1: Landing Page Hero & Value Proposition...');
  await page.goto('https://focus-flow-d8b48.web.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  console.log('📍 Step 2: Smooth scroll through Landing Page Problem & Solution...');
  await smoothScroll(page, 550, 10, 80);
  await page.waitForTimeout(1000);
  await smoothScroll(page, 650, 10, 80);
  await page.waitForTimeout(1000);
  await smoothScroll(page, 700, 10, 80);
  await page.waitForTimeout(1000);

  // Scroll back to hero
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(900);

  // Open Auth Modal
  console.log('📍 Step 3: Triggering Auth Modal (+50 Coins bonus)...');
  try {
    const authBtn = await page.locator('button:has-text("Get Started"), a:has-text("Get Started"), button:has-text("Sign In")').first();
    if (await authBtn.isVisible()) {
      await authBtn.click();
      await page.waitForTimeout(1500);
      const closeBtn = await page.locator('.modal-close, button.close, [aria-label="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  } catch(e) {
    console.log('   Auth trigger notice:', e.message);
  }
  await page.waitForTimeout(600);

  // Navigate to Dashboard
  console.log('📍 Step 4: User Dashboard Overview (Streak, Coins, Stats)...');
  await page.goto('https://focus-flow-d8b48.web.app/dashboard.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await smoothScroll(page, 300, 8, 70);
  await page.waitForTimeout(1000);

  // Newsfeed tab
  console.log('📍 Step 5: Newsfeed Reader Tab (+5 Coins / Article)...');
  try {
    const newsTab = await page.locator('[data-tab="news"], button:has-text("News")').first();
    if (await newsTab.isVisible()) {
      await newsTab.click();
      await page.waitForTimeout(1400);
      await smoothScroll(page, 280, 8, 70);
      await page.waitForTimeout(1000);
    }
  } catch(e) {}

  // Courses tab
  console.log('📍 Step 6: Interactive Courses Tab (+25 to +100 Coins)...');
  try {
    const coursesTab = await page.locator('[data-tab="courses"], button:has-text("Courses")').first();
    if (await coursesTab.isVisible()) {
      await coursesTab.click();
      await page.waitForTimeout(1400);
      await smoothScroll(page, 300, 8, 70);
      await page.waitForTimeout(1000);
    }
  } catch(e) {}

  // Meditation tab
  console.log('📍 Step 7: Guided Mindfulness & Meditation Player...');
  try {
    const medTab = await page.locator('[data-tab="meditation"], button:has-text("Meditation")').first();
    if (await medTab.isVisible()) {
      await medTab.click();
      await page.waitForTimeout(1400);
      await smoothScroll(page, 260, 8, 70);
      await page.waitForTimeout(1000);
    }
  } catch(e) {}

  // Marketplace
  console.log('📍 Step 8: Rewards Marketplace (redeem.html)...');
  await page.goto('https://focus-flow-d8b48.web.app/redeem.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await smoothScroll(page, 350, 10, 70);
  await page.waitForTimeout(1000);
  await smoothScroll(page, 350, 10, 70);
  await page.waitForTimeout(1000);

  // FocusFlow AI Hub
  console.log('📍 Step 9: FocusFlow AI Hub (focusflow.html)...');
  await page.goto('https://focus-flow-d8b48.web.app/focusflow.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await smoothScroll(page, 300, 8, 70);
  await page.waitForTimeout(1400);

  isCapturing = false;
  await client.send('Page.stopScreencast');
  await page.close();
  await context.close();
  await browser.close();

  console.log(`✅ Recording complete! Captured ${frameCount} frames in ${FRAMES_DIR}`);
})().catch(err => {
  console.error('Fatal recording error:', err);
  process.exit(1);
});

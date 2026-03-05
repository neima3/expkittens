const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../output/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function takeScreenshots(prefix) {
  const browser = await chromium.launch();

  // Desktop
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:3005');
  await desktopPage.waitForTimeout(1500);
  await desktopPage.screenshot({ path: path.join(outDir, `${prefix}-desktop-home.png`), fullPage: false });
  console.log(`Saved: ${prefix}-desktop-home.png`);

  // Navigate to setup
  await desktopPage.click('#start-ai-btn');
  await desktopPage.waitForTimeout(500);
  await desktopPage.screenshot({ path: path.join(outDir, `${prefix}-desktop-setup.png`) });
  console.log(`Saved: ${prefix}-desktop-setup.png`);

  // Create a game on desktop
  await desktopPage.fill('#player-name-input', 'DesktopTester');
  await desktopPage.click('#create-game-btn');
  await desktopPage.waitForURL(/\/game\/.+/, { timeout: 10000 });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: path.join(outDir, `${prefix}-desktop-game.png`), fullPage: false });
  console.log(`Saved: ${prefix}-desktop-game.png`);
  await desktopContext.close();

  // Mobile
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3005');
  await mobilePage.waitForTimeout(1500);
  await mobilePage.screenshot({ path: path.join(outDir, `${prefix}-mobile-home.png`) });
  console.log(`Saved: ${prefix}-mobile-home.png`);

  // Create a game on mobile
  await mobilePage.click('#start-ai-btn');
  await mobilePage.waitForTimeout(500);
  await mobilePage.fill('#player-name-input', 'MobileTester');
  await mobilePage.click('#create-game-btn');
  await mobilePage.waitForURL(/\/game\/.+/, { timeout: 10000 });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(outDir, `${prefix}-mobile-game.png`) });
  console.log(`Saved: ${prefix}-mobile-game.png`);
  await mobileContext.close();

  await browser.close();
  console.log('Done!');
}

takeScreenshots(process.argv[2] || 'before').catch(console.error);

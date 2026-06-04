// @ts-check
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('http://localhost:3737');
  await page.waitForTimeout(6000);

  // タブバーの◈をPlaywright locatorでクリック
  try {
    await page.getByText('◈').click({ timeout: 3000 });
  } catch {
    // フォールバック：2番目のタブ位置をクリック
    await page.mouse.click(146, 858);
  }
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'docs/design/app_knowledge.png' });
  console.log('saved');
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });

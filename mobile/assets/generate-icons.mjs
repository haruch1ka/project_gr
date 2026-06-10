import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const configs = [
  {
    name: 'icon.png',
    size: 1024,
    svg: readFileSync(join(__dirname, 'icon.svg'), 'utf8'),
  },
  {
    name: 'android-icon-foreground.png',
    size: 1024,
    svg: `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      <polyline points="300,690 360,620 430,660 520,560 600,600 660,500 760,360" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"></polyline>
      <circle cx="300" cy="690" r="16" fill="#fff" opacity="0.5"></circle>
      <circle cx="520" cy="560" r="22" fill="#fff" opacity="0.8"></circle>
      <circle cx="660" cy="500" r="28" fill="#fff"></circle>
      <g fill="#FFD885"><path d="M760 300 L772 348 L820 360 L772 372 L760 420 L748 372 L700 360 L748 348 Z"></path></g>
      <circle cx="760" cy="360" r="13" fill="#fff"></circle>
    </svg>`,
  },
  {
    name: 'android-icon-background.png',
    size: 1024,
    svg: `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      <defs>
        <linearGradient id="tb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#6890DF"></stop>
          <stop offset="1" stop-color="#20CFAE"></stop>
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#tb)"></rect>
    </svg>`,
  },
  {
    name: 'android-icon-monochrome.png',
    size: 1024,
    svg: `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
      <polyline points="300,690 360,620 430,660 520,560 600,600 660,500 760,360" fill="none" stroke="#000000" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></polyline>
      <circle cx="300" cy="690" r="16" fill="#000"></circle>
      <circle cx="520" cy="560" r="22" fill="#000"></circle>
      <circle cx="660" cy="500" r="28" fill="#000"></circle>
      <path d="M760 300 L772 348 L820 360 L772 372 L760 420 L748 372 L700 360 L748 348 Z" fill="#000"></path>
      <circle cx="760" cy="360" r="13" fill="#000"></circle>
    </svg>`,
  },
  {
    name: 'splash-icon.png',
    size: 1024,
    svg: readFileSync(join(__dirname, 'icon.svg'), 'utf8'),
  },
  {
    name: 'favicon.png',
    size: 48,
    svg: readFileSync(join(__dirname, 'icon.svg'), 'utf8'),
  },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const config of configs) {
  await page.setViewportSize({ width: config.size, height: config.size });
  const scaledSvg = config.svg
    .replace(/width="1024"/, `width="${config.size}"`)
    .replace(/height="1024"/, `height="${config.size}"`);
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent">${scaledSvg}</body></html>`;
  await page.setContent(html);
  const screenshot = await page.screenshot({
    clip: { x: 0, y: 0, width: config.size, height: config.size },
    omitBackground: true,
  });
  writeFileSync(join(__dirname, config.name), screenshot);
  console.log(`生成完了: ${config.name} (${config.size}x${config.size})`);
}

await browser.close();
console.log('すべてのアイコン生成完了');

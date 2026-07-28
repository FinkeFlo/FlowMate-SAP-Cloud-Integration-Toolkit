import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const profileDir = path.resolve(
  process.env.FLOWMATE_PLAYWRIGHT_PROFILE_DIR || '.playwright-profile/sap-cpi',
);
const targetUrl =
  process.env.FLOWMATE_PLAYWRIGHT_URL ||
  'https://your-company.integrationsuite.cfapps.eu10.hana.ondemand.com/shell/home';
const headless = process.env.FLOWMATE_PLAYWRIGHT_HEADLESS === 'true';
const keepOpen = process.env.FLOWMATE_PLAYWRIGHT_KEEP_OPEN !== 'false';
const waitMs = Number.parseInt(
  process.env.FLOWMATE_PLAYWRIGHT_WAIT_MS || '0',
  10,
);

await mkdir(profileDir, { recursive: true });

const context = await chromium.launchPersistentContext(profileDir, {
  channel: 'chrome',
  headless,
  viewport: null,
});

const closeContext = async () => {
  await context.close();
  process.exit(0);
};

process.on('SIGINT', () => {
  void closeContext();
});

const page = context.pages()[0] || (await context.newPage());
await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });

console.log(`Opened: ${targetUrl}`);
console.log(`Profile: ${profileDir}`);

if (keepOpen && !headless) {
  console.log('Browser remains open for manual login/session reuse. Press Ctrl+C to close.');
  await new Promise(() => {});
} else if (waitMs > 0) {
  await page.waitForTimeout(waitMs);
  await closeContext();
} else {
  await closeContext();
}

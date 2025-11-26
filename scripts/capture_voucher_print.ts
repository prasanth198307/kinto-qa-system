import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:5000';
const SCREENSHOT_DIR = './docs/user_manual/screenshots';
const OUTPUT_FILE = '29_Expense_Voucher_Print.png';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureExpenseVoucherPrint() {
  console.log('Starting expense voucher print screenshot capture...');
  
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    console.log('Navigating to login page...');
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
    await delay(2000);

    console.log('Logging in with admin credentials...');
    await page.waitForSelector('input[data-testid="input-username-login"]', { timeout: 30000 });
    await page.fill('input[data-testid="input-username-login"]', 'admin');
    await page.fill('input[data-testid="input-password-login"]', 'Admin@123');
    await page.click('button[data-testid="button-login"]');
    await delay(4000);

    console.log('Navigating to expense voucher print page...');
    await page.goto(`${BASE_URL}/cash-register/vouchers/print?mode=all`, { waitUntil: 'networkidle' });
    
    console.log('Waiting for page to fully load (3 seconds)...');
    await delay(3000);

    console.log('Taking screenshot...');
    const screenshotPath = path.join(SCREENSHOT_DIR, OUTPUT_FILE);
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`Screenshot saved to: ${screenshotPath}`);
    console.log('Screenshot capture complete!');
    
  } catch (error) {
    console.error('Error during screenshot capture:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

captureExpenseVoucherPrint().catch(console.error);

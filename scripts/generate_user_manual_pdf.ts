import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generatePDF() {
  const htmlPath = path.resolve(__dirname, '../docs/user_manual/KINTO_User_Manual.html');
  const pdfPath = path.resolve(__dirname, '../docs/user_manual/KINTO_User_Manual.pdf');
  
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log(`Loading HTML file: ${htmlPath}`);
  await page.goto(`file://${htmlPath}`, {
    waitUntil: 'networkidle'
  });
  
  console.log('Waiting for page to fully render...');
  await page.waitForTimeout(2000);
  
  console.log(`Generating PDF: ${pdfPath}`);
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%; color: #666;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
  });
  
  await browser.close();
  console.log('PDF generated successfully!');
}

generatePDF().catch(console.error);

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function generatePDFFromHTML(htmlPath: string, pdfPath: string, title: string) {
  console.log(`\n📄 Generating ${title}...`);
  console.log(`   HTML: ${htmlPath}`);
  console.log(`   PDF:  ${pdfPath}`);
  
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Read HTML file and convert to file URL
  const htmlAbsPath = path.resolve(htmlPath);
  const htmlContent = fs.readFileSync(htmlAbsPath, 'utf-8');
  
  // Set content with base URL for resolving relative paths
  const baseURL = `file://${path.dirname(htmlAbsPath)}/`;
  await page.setContent(htmlContent, { baseURL, waitUntil: 'networkidle' });
  
  // Wait for any images to load
  await page.waitForTimeout(2000);
  
  // Generate PDF
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '20mm',
      right: '20mm'
    },
    printBackground: true,
    preferCSSPageSize: false
  });
  
  await browser.close();
  
  // Check file size
  const stats = fs.statSync(pdfPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   ✅ Generated: ${fileSizeMB} MB`);
}

async function main() {
  console.log('🚀 Starting PDF generation for Telugu and Hindi manuals...\n');
  
  try {
    // Generate Telugu PDF
    await generatePDFFromHTML(
      'docs/deployment/KINTO_End_User_Manual_Telugu.html',
      'docs/deployment/KINTO_End_User_Manual_Telugu.pdf',
      'Telugu Manual'
    );
    
    // Generate Hindi PDF
    await generatePDFFromHTML(
      'docs/deployment/KINTO_End_User_Manual_Hindi.html',
      'docs/deployment/KINTO_End_User_Manual_Hindi.pdf',
      'Hindi Manual'
    );
    
    console.log('\n✅ All PDFs generated successfully!');
    console.log('\nGenerated files:');
    console.log('   1. KINTO_End_User_Manual_Telugu.pdf');
    console.log('   2. KINTO_End_User_Manual_Hindi.pdf');
    
  } catch (error) {
    console.error('\n❌ Error generating PDFs:', error);
    process.exit(1);
  }
}

main();

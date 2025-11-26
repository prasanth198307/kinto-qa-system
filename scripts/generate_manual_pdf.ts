import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const MANUAL_DIR = path.join(process.cwd(), 'docs', 'user_manual');
const MARKDOWN_FILE = path.join(MANUAL_DIR, 'KINTO_User_Manual.md');
const HTML_FILE = path.join(MANUAL_DIR, 'KINTO_User_Manual.html');
const PDF_FILE = path.join(MANUAL_DIR, 'KINTO_User_Manual.pdf');

function markdownToHtml(markdown: string): string {
  let html = markdown;
  
  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert images - use relative path from HTML file location
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    const imagePath = path.join(MANUAL_DIR, src);
    if (fs.existsSync(imagePath)) {
      const imageData = fs.readFileSync(imagePath);
      const base64 = imageData.toString('base64');
      return `<img src="data:image/png;base64,${base64}" alt="${alt}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 4px; margin: 20px 0;" />`;
    }
    return `<p style="color: red;">[Image not found: ${src}]</p>`;
  });
  
  // Convert unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Convert ordered lists  
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // Convert horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  
  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Convert paragraphs (lines that aren't already HTML)
  html = html.split('\n\n').map(block => {
    if (!block.startsWith('<') && block.trim() !== '') {
      return `<p>${block}</p>`;
    }
    return block;
  }).join('\n');
  
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  
  return html;
}

async function generatePdf() {
  console.log('Reading markdown file...');
  const markdown = fs.readFileSync(MARKDOWN_FILE, 'utf-8');
  
  console.log('Converting markdown to HTML...');
  const content = markdownToHtml(markdown);
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>KINTO Smart Ops - User Manual</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }
    h1 {
      color: #1a365d;
      font-size: 28px;
      margin: 30px 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #1a365d;
    }
    h2 {
      color: #2c5282;
      font-size: 22px;
      margin: 25px 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    h3 {
      color: #3182ce;
      font-size: 18px;
      margin: 20px 0 10px 0;
    }
    p {
      margin: 10px 0;
      text-align: justify;
    }
    ul, ol {
      margin: 10px 0 10px 25px;
    }
    li {
      margin: 5px 0;
    }
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 30px 0;
    }
    img {
      max-width: 100%;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    strong {
      color: #1a365d;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
    }
    .cover-page {
      text-align: center;
      padding: 100px 20px;
      page-break-after: always;
    }
    .cover-page h1 {
      font-size: 36px;
      border: none;
      margin-bottom: 20px;
    }
    .cover-page .subtitle {
      font-size: 20px;
      color: #666;
      margin-bottom: 40px;
    }
    .cover-page .company {
      font-size: 18px;
      color: #333;
      margin-top: 60px;
    }
    .cover-page .date {
      font-size: 16px;
      color: #666;
      margin-top: 20px;
    }
    @media print {
      body {
        padding: 20px;
      }
      h2 {
        page-break-after: avoid;
      }
      img {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>
  `;
  
  // Save HTML file for reference
  fs.writeFileSync(HTML_FILE, htmlContent);
  console.log('HTML file saved to:', HTML_FILE);
  
  // Generate PDF using Playwright
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Loading HTML content...');
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  
  console.log('Generating PDF...');
  await page.pdf({
    path: PDF_FILE,
    format: 'A4',
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '15mm',
      right: '15mm'
    },
    printBackground: true,
  });
  
  await browser.close();
  console.log('PDF generated successfully:', PDF_FILE);
  
  // Get file size
  const stats = fs.statSync(PDF_FILE);
  console.log('PDF size:', Math.round(stats.size / 1024), 'KB');
}

generatePdf().catch(console.error);

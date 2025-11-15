import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function generatePlanPDF() {
  console.log('🚀 Generating Multilingual Implementation Plan PDF...\n');
  
  const mdPath = 'docs/deployment/Multilingual_Implementation_Plan.md';
  const pdfPath = 'docs/deployment/Multilingual_Implementation_Plan.pdf';
  
  // Read the markdown content
  const mdContent = fs.readFileSync(mdPath, 'utf-8');
  
  // Convert markdown to HTML with styling
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KINTO Smart Ops - Multilingual Implementation Plan</title>
  <style>
    @page {
      margin: 2cm;
      size: A4;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Liberation Sans', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 100%;
      padding: 0;
      margin: 0;
    }
    
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
      margin-top: 30px;
      font-size: 28px;
      page-break-after: avoid;
    }
    
    h2 {
      color: #2563eb;
      margin-top: 25px;
      margin-bottom: 15px;
      font-size: 22px;
      page-break-after: avoid;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }
    
    h3 {
      color: #1e40af;
      margin-top: 20px;
      margin-bottom: 12px;
      font-size: 18px;
      page-break-after: avoid;
    }
    
    h4 {
      color: #374151;
      margin-top: 15px;
      margin-bottom: 10px;
      font-size: 16px;
      page-break-after: avoid;
    }
    
    p {
      margin: 10px 0;
      text-align: justify;
    }
    
    ul, ol {
      margin: 10px 0;
      padding-left: 30px;
    }
    
    li {
      margin: 5px 0;
    }
    
    code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #dc2626;
    }
    
    pre {
      background-color: #1f2937;
      color: #f3f4f6;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.85em;
      line-height: 1.4;
      page-break-inside: avoid;
    }
    
    pre code {
      background: none;
      color: inherit;
      padding: 0;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
      page-break-inside: avoid;
      font-size: 0.9em;
    }
    
    th, td {
      border: 1px solid #d1d5db;
      padding: 10px;
      text-align: left;
    }
    
    th {
      background-color: #2563eb;
      color: white;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    blockquote {
      border-left: 4px solid #2563eb;
      padding-left: 20px;
      margin: 15px 0;
      color: #4b5563;
      font-style: italic;
    }
    
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 30px 0;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      border-radius: 8px;
    }
    
    .header h1 {
      color: white;
      border: none;
      margin: 0;
      font-size: 32px;
    }
    
    .header p {
      margin: 10px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    
    .toc {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
      page-break-inside: avoid;
    }
    
    .toc h2 {
      margin-top: 0;
      color: #1f2937;
    }
    
    .toc ul {
      list-style: none;
      padding-left: 0;
    }
    
    .toc li {
      padding: 5px 0;
    }
    
    .toc a {
      color: #2563eb;
      text-decoration: none;
    }
    
    .highlight {
      background-color: #fef3c7;
      padding: 15px;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
      margin: 15px 0;
      page-break-inside: avoid;
    }
    
    .success {
      color: #059669;
      font-weight: 600;
    }
    
    .warning {
      color: #d97706;
      font-weight: 600;
    }
    
    .error {
      color: #dc2626;
      font-weight: 600;
    }
    
    strong {
      color: #1f2937;
    }
    
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>KINTO Smart Ops</h1>
    <p>Multilingual Implementation Plan</p>
    <p>Full UI + Master Data Translation (English • Telugu • Hindi)</p>
  </div>
  
  <div id="content">
${convertMarkdownToHTML(mdContent)}
  </div>
</body>
</html>
  `;
  
  // Launch browser and generate PDF
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: {
      top: '1.5cm',
      right: '1.5cm',
      bottom: '1.5cm',
      left: '1.5cm'
    },
    printBackground: true,
    preferCSSPageSize: true
  });
  
  await browser.close();
  
  const stats = fs.statSync(pdfPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`✅ PDF Generated Successfully!`);
  console.log(`   Location: ${pdfPath}`);
  console.log(`   Size: ${fileSizeMB} MB\n`);
}

function convertMarkdownToHTML(markdown: string): string {
  let html = markdown;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  
  // Bold and Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr>');
  
  // Lists
  const lines = html.split('\n');
  let inList = false;
  let listType = '';
  let result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      result.push('<li>' + line.replace(/^\d+\.\s/, '') + '</li>');
    }
    // Unordered list
    else if (/^[-*]\s/.test(line)) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      result.push('<li>' + line.replace(/^[-*]\s/, '') + '</li>');
    }
    // Checkbox list
    else if (/^- \[[ x]\]\s/.test(line)) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      const checked = line.includes('[x]');
      const text = line.replace(/^- \[[ x]\]\s/, '');
      result.push(`<li>${checked ? '✅' : '☐'} ${text}</li>`);
    }
    else {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
        listType = '';
      }
      result.push(line);
    }
  }
  
  if (inList) {
    result.push(`</${listType}>`);
  }
  
  html = result.join('\n');
  
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  // Clean up empty paragraphs and fix spacing
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
  html = html.replace(/<p>(<[ou]l>)/g, '$1');
  html = html.replace(/(<\/[ou]l>)<\/p>/g, '$1');
  html = html.replace(/<p>(<table>)/g, '$1');
  html = html.replace(/(<\/table>)<\/p>/g, '$1');
  
  return html;
}

generatePlanPDF().catch(console.error);

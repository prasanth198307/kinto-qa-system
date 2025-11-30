const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const inputFile = path.join(__dirname, '../docs/KINTO_Feature_Documentation.md');
const outputFile = path.join(__dirname, '../docs/KINTO_Feature_Documentation.pdf');

// Read markdown content
const markdown = fs.readFileSync(inputFile, 'utf8');

// Create PDF document
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'KINTO Smart Ops - Feature Documentation',
    Author: 'Inmoisure Private Limited',
    Subject: 'Complete Feature Documentation',
    Keywords: 'KINTO, Operations, QA, Manufacturing',
    CreationDate: new Date()
  }
});

// Pipe to file
const writeStream = fs.createWriteStream(outputFile);
doc.pipe(writeStream);

// Parse and render markdown
const lines = markdown.split('\n');
let inCodeBlock = false;
let inTable = false;
let tableHeaders = [];

// Define styles
const styles = {
  h1: { fontSize: 24, font: 'Helvetica-Bold', spacing: 20, color: '#1a365d' },
  h2: { fontSize: 18, font: 'Helvetica-Bold', spacing: 15, color: '#2c5282' },
  h3: { fontSize: 14, font: 'Helvetica-Bold', spacing: 10, color: '#2d3748' },
  h4: { fontSize: 12, font: 'Helvetica-Bold', spacing: 8, color: '#4a5568' },
  body: { fontSize: 10, font: 'Helvetica', spacing: 5, color: '#2d3748' },
  code: { fontSize: 9, font: 'Courier', spacing: 3, color: '#1a202c', bgColor: '#f7fafc' },
  quote: { fontSize: 10, font: 'Helvetica-Oblique', spacing: 5, color: '#4a5568' },
  tableHeader: { fontSize: 9, font: 'Helvetica-Bold', color: '#1a365d' },
  tableCell: { fontSize: 9, font: 'Helvetica', color: '#2d3748' }
};

let y = doc.y;
const pageWidth = doc.page.width - 100;
const pageHeight = doc.page.height - 100;

function checkNewPage(neededSpace = 50) {
  if (doc.y + neededSpace > pageHeight) {
    doc.addPage();
  }
}

function renderLine(line) {
  // Skip image references for now
  if (line.includes('![')) {
    checkNewPage(30);
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#718096')
       .text('[Screenshot: See attached file]', { continued: false });
    doc.moveDown(0.5);
    return;
  }

  // Handle code blocks
  if (line.startsWith('```')) {
    inCodeBlock = !inCodeBlock;
    return;
  }

  if (inCodeBlock) {
    checkNewPage(15);
    doc.fontSize(styles.code.fontSize)
       .font(styles.code.font)
       .fillColor(styles.code.color)
       .text(line, { continued: false });
    return;
  }

  // Handle horizontal rules
  if (line.match(/^-{3,}$/)) {
    checkNewPage(20);
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y)
       .lineTo(doc.page.width - 50, doc.y)
       .stroke('#e2e8f0');
    doc.moveDown(0.5);
    return;
  }

  // Handle headers
  if (line.startsWith('# ')) {
    checkNewPage(40);
    doc.moveDown(1);
    doc.fontSize(styles.h1.fontSize)
       .font(styles.h1.font)
       .fillColor(styles.h1.color)
       .text(line.replace(/^# /, ''), { continued: false });
    doc.moveDown(0.5);
    return;
  }

  if (line.startsWith('## ')) {
    checkNewPage(35);
    doc.moveDown(0.8);
    doc.fontSize(styles.h2.fontSize)
       .font(styles.h2.font)
       .fillColor(styles.h2.color)
       .text(line.replace(/^## /, ''), { continued: false });
    doc.moveDown(0.3);
    return;
  }

  if (line.startsWith('### ')) {
    checkNewPage(30);
    doc.moveDown(0.5);
    doc.fontSize(styles.h3.fontSize)
       .font(styles.h3.font)
       .fillColor(styles.h3.color)
       .text(line.replace(/^### /, ''), { continued: false });
    doc.moveDown(0.3);
    return;
  }

  if (line.startsWith('#### ')) {
    checkNewPage(25);
    doc.moveDown(0.3);
    doc.fontSize(styles.h4.fontSize)
       .font(styles.h4.font)
       .fillColor(styles.h4.color)
       .text(line.replace(/^#### /, ''), { continued: false });
    doc.moveDown(0.2);
    return;
  }

  // Handle blockquotes
  if (line.startsWith('> ')) {
    checkNewPage(20);
    doc.fontSize(styles.quote.fontSize)
       .font(styles.quote.font)
       .fillColor(styles.quote.color)
       .text('  ' + line.replace(/^> /, ''), { continued: false });
    doc.moveDown(0.3);
    return;
  }

  // Handle lists
  if (line.match(/^[-*] /)) {
    checkNewPage(15);
    doc.fontSize(styles.body.fontSize)
       .font(styles.body.font)
       .fillColor(styles.body.color)
       .text('  • ' + line.replace(/^[-*] /, ''), { continued: false });
    return;
  }

  if (line.match(/^\d+\. /)) {
    checkNewPage(15);
    doc.fontSize(styles.body.fontSize)
       .font(styles.body.font)
       .fillColor(styles.body.color)
       .text('  ' + line, { continued: false });
    return;
  }

  // Handle table rows
  if (line.includes('|')) {
    const cells = line.split('|').filter(c => c.trim());
    
    // Skip separator rows
    if (cells.every(c => c.match(/^[-:]+$/))) {
      return;
    }

    checkNewPage(20);
    
    // Simple table rendering
    const cellWidth = pageWidth / cells.length;
    const startX = 50;
    const startY = doc.y;

    cells.forEach((cell, index) => {
      const isHeader = tableHeaders.length === 0;
      const style = isHeader ? styles.tableHeader : styles.tableCell;
      
      doc.fontSize(style.fontSize)
         .font(style.font)
         .fillColor(style.color)
         .text(cell.trim(), startX + (index * cellWidth), startY, {
           width: cellWidth - 10,
           align: 'left'
         });
    });

    if (tableHeaders.length === 0) {
      tableHeaders = cells;
    }

    doc.y = startY + 15;
    return;
  } else {
    // Reset table state when not in table
    if (tableHeaders.length > 0) {
      tableHeaders = [];
      doc.moveDown(0.5);
    }
  }

  // Handle empty lines
  if (line.trim() === '') {
    doc.moveDown(0.3);
    return;
  }

  // Handle regular text (with inline formatting removed)
  const cleanText = line
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold markers
    .replace(/\*([^*]+)\*/g, '$1')       // Remove italic markers
    .replace(/`([^`]+)`/g, '$1')         // Remove code markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Convert links to text

  if (cleanText.trim()) {
    checkNewPage(15);
    doc.fontSize(styles.body.fontSize)
       .font(styles.body.font)
       .fillColor(styles.body.color)
       .text(cleanText, { continued: false });
  }
}

// Add cover page
doc.fontSize(32).font('Helvetica-Bold').fillColor('#1a365d')
   .text('KINTO Smart Ops', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(24).font('Helvetica').fillColor('#2c5282')
   .text('Feature Documentation', { align: 'center' });
doc.moveDown(2);
doc.fontSize(14).font('Helvetica').fillColor('#4a5568')
   .text('Complete User Guide', { align: 'center' });
doc.moveDown(3);
doc.fontSize(12).font('Helvetica').fillColor('#718096')
   .text('Inmoisure Private Limited', { align: 'center' })
   .text('GSTIN: 37AAHCI5047B1ZR', { align: 'center' });
doc.moveDown(2);
doc.fontSize(10).fillColor('#a0aec0')
   .text('Last Updated: November 2024', { align: 'center' });

doc.addPage();

// Render each line
lines.forEach(line => {
  renderLine(line);
});

// Finalize PDF
doc.end();

writeStream.on('finish', () => {
  console.log('PDF created successfully:', outputFile);
});

writeStream.on('error', (err) => {
  console.error('Error creating PDF:', err);
});

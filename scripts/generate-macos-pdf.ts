import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

function generateMacOSPDF() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });

  const outputPath = path.join(process.cwd(), 'public', 'KINTO_QA_macOS_Deployment_Guide.pdf');
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Read the markdown file
  const mdPath = path.join(process.cwd(), 'public', 'MACOS_DEPLOYMENT_GUIDE.md');
  const content = fs.readFileSync(mdPath, 'utf-8');

  // Title Page
  doc.fontSize(24).font('Helvetica-Bold').text('KINTO QA Management System', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(20).text('macOS Deployment Guide', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(12).font('Helvetica').text('Complete guide for deploying on your MacBook', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text('Last Updated: November 4, 2025', { align: 'center' });
  
  doc.moveDown(3);
  
  // Process markdown content
  const lines = content.split('\n');
  let skipTitle = true;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip the first few lines (title section already handled)
    if (skipTitle && line.startsWith('---')) {
      skipTitle = false;
      continue;
    }
    if (skipTitle) continue;
    
    // Check if we need a new page
    if (doc.y > 700) {
      doc.addPage();
    }
    
    // Heading level 1
    if (line.startsWith('# ')) {
      doc.addPage();
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#667eea');
      doc.text(line.replace('# ', '').trim(), { continued: false });
      doc.fillColor('#000000');
      doc.moveDown(0.5);
      continue;
    }
    
    // Heading level 2
    if (line.startsWith('## ')) {
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#667eea');
      doc.text(line.replace('## ', '').trim(), { continued: false });
      doc.fillColor('#000000');
      doc.moveDown(0.3);
      continue;
    }
    
    // Heading level 3
    if (line.startsWith('### ')) {
      doc.moveDown(0.3);
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text(line.replace('### ', '').trim(), { continued: false });
      doc.moveDown(0.2);
      continue;
    }
    
    // Heading level 4
    if (line.startsWith('#### ')) {
      doc.moveDown(0.2);
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(line.replace('#### ', '').trim(), { continued: false });
      doc.moveDown(0.2);
      continue;
    }
    
    // Horizontal rule
    if (line.startsWith('---')) {
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);
      continue;
    }
    
    // Code blocks
    if (line.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      
      doc.fontSize(9).font('Courier');
      doc.fillColor('#1a1a1a').rect(doc.x - 5, doc.y - 5, 495, codeLines.length * 12 + 10).fill('#f5f5f5');
      doc.fillColor('#000000');
      
      codeLines.forEach(codeLine => {
        if (doc.y > 750) {
          doc.addPage();
        }
        doc.text(codeLine, { continued: false });
      });
      
      doc.font('Helvetica').fontSize(10);
      doc.moveDown(0.5);
      continue;
    }
    
    // Bullet points
    if (line.match(/^[\s]*[-*]\s+/)) {
      const indent = (line.match(/^[\s]*/)?.[0].length || 0) * 2;
      const text = line.replace(/^[\s]*[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
      
      doc.fontSize(10).font('Helvetica');
      doc.text('• ' + text, { indent: indent, continued: false });
      continue;
    }
    
    // Numbered lists
    if (line.match(/^[\s]*\d+\.\s+/)) {
      const text = line.replace(/^[\s]*\d+\.\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
      doc.fontSize(10).font('Helvetica');
      doc.text(line.match(/^[\s]*\d+\./)?.[0] + ' ' + text, { continued: false });
      continue;
    }
    
    // Bold text in paragraphs
    if (line.includes('**') && !line.startsWith('#')) {
      doc.fontSize(10).font('Helvetica');
      const parts = line.split('**');
      for (let j = 0; j < parts.length; j++) {
        if (j % 2 === 0) {
          doc.font('Helvetica').text(parts[j], { continued: j < parts.length - 1 });
        } else {
          doc.font('Helvetica-Bold').text(parts[j], { continued: j < parts.length - 1 });
        }
      }
      doc.text('');
      continue;
    }
    
    // Empty lines
    if (line.trim() === '') {
      doc.moveDown(0.3);
      continue;
    }
    
    // Regular paragraphs
    if (line.trim().length > 0 && !line.startsWith('#')) {
      doc.fontSize(10).font('Helvetica');
      doc.text(line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1'), { 
        align: 'left',
        continued: false 
      });
    }
  }

  doc.end();

  stream.on('finish', () => {
    console.log('✅ PDF generated successfully:', outputPath);
  });
}

generateMacOSPDF();

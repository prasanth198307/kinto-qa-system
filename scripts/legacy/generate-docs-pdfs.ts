import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Convert markdown to simple formatted text for PDF
function formatMarkdownForPDF(markdown: string): Array<{ text: string; style: string }> {
  const lines = markdown.split('\n');
  const formatted: Array<{ text: string; style: string }> = [];
  
  for (let line of lines) {
    line = line.trim();
    
    // Skip empty lines
    if (!line) {
      formatted.push({ text: '\n', style: 'normal' });
      continue;
    }
    
    // Headers
    if (line.startsWith('# ')) {
      formatted.push({ text: line.substring(2), style: 'h1' });
    } else if (line.startsWith('## ')) {
      formatted.push({ text: line.substring(3), style: 'h2' });
    } else if (line.startsWith('### ')) {
      formatted.push({ text: line.substring(4), style: 'h3' });
    } else if (line.startsWith('#### ')) {
      formatted.push({ text: line.substring(5), style: 'h4' });
    }
    // Lists
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      formatted.push({ text: '  • ' + line.substring(2), style: 'list' });
    }
    // Numbered lists
    else if (/^\d+\.\s/.test(line)) {
      formatted.push({ text: '  ' + line, style: 'list' });
    }
    // Code blocks
    else if (line.startsWith('```')) {
      formatted.push({ text: '', style: 'code' });
    }
    // Horizontal rule
    else if (line === '---') {
      formatted.push({ text: '\n─────────────────────────────────────\n', style: 'hr' });
    }
    // Normal text
    else {
      // Remove inline markdown
      let text = line
        .replace(/\*\*(.+?)\*\*/g, '$1')  // Bold
        .replace(/\*(.+?)\*/g, '$1')      // Italic
        .replace(/`(.+?)`/g, '$1')        // Inline code
        .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Links
      
      formatted.push({ text, style: 'normal' });
    }
  }
  
  return formatted;
}

function generatePDF(inputPath: string, outputPath: string) {
  console.log(`Generating PDF: ${outputPath}`);
  
  const markdown = fs.readFileSync(inputPath, 'utf-8');
  const formatted = formatMarkdownForPDF(markdown);
  
  const doc = new PDFDocument({
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    },
    size: 'A4'
  });
  
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);
  
  // Title page
  const title = formatted[0]?.text || 'Documentation';
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .text(title, { align: 'center' });
  
  doc.moveDown(2);
  doc.fontSize(12)
     .font('Helvetica')
     .text('KINTO QA Management System', { align: 'center' });
  
  doc.moveDown(1);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  
  doc.addPage();
  
  // Content
  for (let i = 1; i < formatted.length; i++) {
    const item = formatted[i];
    
    switch (item.style) {
      case 'h1':
        doc.addPage();
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text(item.text);
        doc.moveDown(0.5);
        break;
        
      case 'h2':
        doc.moveDown(1);
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#374151')
           .text(item.text);
        doc.moveDown(0.3);
        break;
        
      case 'h3':
        doc.moveDown(0.8);
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#4b5563')
           .text(item.text);
        doc.moveDown(0.2);
        break;
        
      case 'h4':
        doc.moveDown(0.5);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#6b7280')
           .text(item.text);
        doc.moveDown(0.2);
        break;
        
      case 'list':
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#000000')
           .text(item.text);
        break;
        
      case 'code':
        doc.fontSize(9)
           .font('Courier')
           .fillColor('#1e3a8a')
           .text(item.text);
        break;
        
      case 'hr':
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#9ca3af')
           .text(item.text);
        break;
        
      case 'normal':
      default:
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#000000')
           .text(item.text);
        break;
    }
  }
  
  // Add page numbers
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text(
         `Page ${i + 1} of ${pages.count}`,
         50,
         doc.page.height - 50,
         { align: 'center' }
       );
  }
  
  doc.end();
  
  return new Promise<void>((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`✓ PDF generated: ${outputPath}`);
      resolve();
    });
    stream.on('error', reject);
  });
}

async function main() {
  const publicDir = path.join(process.cwd(), 'public');
  
  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const docs = [
    {
      input: 'DEPLOYMENT_GUIDE.md',
      output: path.join(publicDir, 'KINTO_QA_Deployment_Guide.pdf')
    },
    {
      input: 'SYSTEM_DESIGN.md',
      output: path.join(publicDir, 'KINTO_QA_System_Design.pdf')
    },
    {
      input: 'MOBILE_APK_BUILD_GUIDE.md',
      output: path.join(publicDir, 'KINTO_QA_Android_APK_Guide.pdf')
    },
    {
      input: 'MOBILE_IPA_BUILD_GUIDE.md',
      output: path.join(publicDir, 'KINTO_QA_iOS_IPA_Guide.pdf')
    }
  ];
  
  // Generate PDFs
  for (const doc of docs) {
    try {
      await generatePDF(doc.input, doc.output);
    } catch (error) {
      console.error(`Error generating ${doc.output}:`, error);
    }
  }
  
  // Copy database schema SQL to public
  const dbSchemaSource = 'database_schema.sql';
  const dbSchemaTarget = path.join(publicDir, 'database_schema.sql');
  
  if (fs.existsSync(dbSchemaSource)) {
    fs.copyFileSync(dbSchemaSource, dbSchemaTarget);
    console.log(`✓ Copied: ${dbSchemaTarget}`);
  }
  
  // Copy markdown files to public
  for (const doc of docs) {
    const mdTarget = path.join(publicDir, path.basename(doc.input));
    if (fs.existsSync(doc.input)) {
      fs.copyFileSync(doc.input, mdTarget);
      console.log(`✓ Copied: ${mdTarget}`);
    }
  }
  
  // Generate Word document version using docx (if needed in future)
  console.log('\n✓ All documentation generated successfully!');
  console.log('\nGenerated files in public/:');
  console.log('  - KINTO_QA_Deployment_Guide.pdf');
  console.log('  - KINTO_QA_System_Design.pdf');
  console.log('  - KINTO_QA_Android_APK_Guide.pdf');
  console.log('  - KINTO_QA_iOS_IPA_Guide.pdf');
  console.log('  - database_schema.sql');
  console.log('  - All markdown source files');
}

main().catch(console.error);

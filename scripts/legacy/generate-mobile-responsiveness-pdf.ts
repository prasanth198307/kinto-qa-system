import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

function generateMobileResponsivenessPDF() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });

  const outputPath = path.join(process.cwd(), 'public', 'KINTO_QA_Mobile_Responsiveness_Guide.pdf');
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Title Page
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#667eea');
  doc.text('KINTO QA Management System', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(20).text('Mobile Responsiveness Guide', { align: 'center' });
  doc.moveDown(1);
  doc.fillColor('#000000').fontSize(14).font('Helvetica');
  doc.text('How Your App Adapts to Mobile Devices', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).text('APK & IPA Native Apps vs Mobile Browser', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text('Last Updated: November 4, 2025', { align: 'center' });

  doc.addPage();

  // Section 1: Overview
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#667eea');
  doc.text('Overview', { continued: false });
  doc.fillColor('#000000').moveDown(0.5);

  doc.fontSize(10).font('Helvetica');
  doc.text('The KINTO QA Management System is designed with mobile-first principles and is fully responsive across all devices. This guide explains how the application dynamically adapts when converted to native mobile apps (APK for Android and IPA for iOS).', { align: 'left' });
  doc.moveDown(1);

  // Key Point Box
  doc.fontSize(11).font('Helvetica-Bold');
  doc.fillColor('#1a365d').rect(50, doc.y, 495, 60).fillAndStroke('#ebf8ff', '#3182ce');
  doc.fillColor('#1a365d');
  doc.text('✓ Yes! Your app will dynamically fit on mobile devices in both APK/IPA formats', 55, doc.y - 50, { width: 485 });
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('The same responsive design that works in mobile browsers works perfectly in native apps.', 55, doc.y, { width: 485 });
  doc.fillColor('#000000');
  doc.moveDown(3);

  // Section 2: Current Mobile Configuration
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#667eea');
  doc.text('Current Mobile Responsiveness Status', { continued: false });
  doc.fillColor('#000000').moveDown(0.5);

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('1. Proper Viewport Configuration ✓');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Your application includes the correct viewport meta tag in client/index.html:');
  doc.moveDown(0.3);

  doc.fontSize(9).font('Courier');
  doc.fillColor('#1a1a1a').rect(doc.x - 5, doc.y - 5, 495, 50).fill('#f5f5f5');
  doc.fillColor('#000000');
  doc.text('<meta name="viewport" content="width=device-width,');
  doc.text('      initial-scale=1.0, maximum-scale=1,');
  doc.text('      user-scalable=no" />');
  doc.text('<meta name="apple-mobile-web-app-capable" content="yes" />');
  doc.moveDown(0.5);

  doc.fontSize(10).font('Helvetica');
  doc.text('This ensures:');
  doc.moveDown(0.2);
  doc.text('  • Dynamic scaling based on device width', { indent: 10 });
  doc.text('  • Native app feel (no browser chrome)', { indent: 10 });
  doc.text('  • Proper touch interactions (no zoom issues)', { indent: 10 });
  doc.moveDown(1);

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('2. Mobile-First Design System ✓');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('The application uses responsive breakpoints:');
  doc.moveDown(0.3);

  doc.text('  • Mobile (<768px): Single column, full width, touch-optimized', { indent: 10 });
  doc.text('  • Tablet (768px+): 2 column layouts', { indent: 10 });
  doc.text('  • Desktop (1024px+): 3-4 column layouts', { indent: 10 });
  doc.moveDown(1);

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('3. Touch-Optimized Controls ✓');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('All interactive elements meet minimum touch target requirements:');
  doc.moveDown(0.3);
  doc.text('  • Minimum button height: 44px (iOS standard)', { indent: 10 });
  doc.text('  • Large radio buttons for Pass/Fail', { indent: 10 });
  doc.text('  • Full-width forms on mobile', { indent: 10 });
  doc.text('  • Bottom padding for fixed navigation', { indent: 10 });

  // Section 3: How Native Apps Work
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#667eea');
  doc.text('How It Works in Native Apps (APK/IPA)', { continued: false });
  doc.fillColor('#000000').moveDown(0.5);

  doc.fontSize(10).font('Helvetica');
  doc.text('When you convert your web app to APK/IPA using Capacitor (covered in the mobile build guides), the following happens:');
  doc.moveDown(0.5);

  // Flow diagram
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Conversion Flow:', { indent: 10 });
  doc.moveDown(0.3);
  doc.font('Helvetica');
  doc.text('1. Web App (HTML/CSS/JavaScript)', { indent: 20 });
  doc.text('   ↓', { indent: 20 });
  doc.text('2. Capacitor Wrapper', { indent: 20 });
  doc.text('   ↓', { indent: 20 });
  doc.text('3. Native WebView (Android/iOS)', { indent: 20 });
  doc.text('   ↓', { indent: 20 });
  doc.text('4. Native App (APK/IPA)', { indent: 20 });
  doc.moveDown(1);

  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('Key Points:');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('• Same HTML/CSS: The native app uses the exact same code as the web version', { indent: 10 });
  doc.text('• Native WebView: Android/iOS render the HTML in a native container', { indent: 10 });
  doc.text('• Viewport Works: The viewport meta tag tells the WebView how to scale', { indent: 10 });
  doc.text('• Tailwind Classes: Responsive utilities like "md:grid-cols-2" work perfectly', { indent: 10 });
  doc.text('• Touch Events: Native touch events are automatically mapped to web events', { indent: 10 });

  // Section 4: Comparison Table
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#667eea');
  doc.text('Mobile Browser vs Native App Comparison', { continued: false });
  doc.fillColor('#000000').moveDown(0.5);

  const tableData = [
    { feature: 'Responsiveness', browser: 'Yes (same code)', native: 'Yes (same code)' },
    { feature: 'Viewport Scaling', browser: 'Auto-scales', native: 'Auto-scales' },
    { feature: 'Tailwind Classes', browser: 'Works', native: 'Works' },
    { feature: 'Touch Targets', browser: '44px minimum', native: '44px minimum' },
    { feature: 'Browser Chrome', browser: 'Address bar visible', native: 'Full screen' },
    { feature: 'App-like Feel', browser: 'Feels like website', native: 'Feels like native app' },
    { feature: 'Offline Support', browser: 'Limited', native: 'Better with Capacitor' },
    { feature: 'Device APIs', browser: 'Limited', native: 'Camera, Files, etc.' },
    { feature: 'Installation', browser: 'PWA only', native: 'From App Store' }
  ];

  let tableY = doc.y;
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('Feature', 55, tableY, { width: 150 });
  doc.text('Mobile Browser', 210, tableY, { width: 150 });
  doc.text('Native App (APK/IPA)', 365, tableY, { width: 150 });
  
  tableY += 15;
  doc.moveTo(50, tableY).lineTo(545, tableY).stroke();
  tableY += 5;

  doc.fontSize(9).font('Helvetica');
  tableData.forEach((row, index) => {
    if (tableY > 750) {
      doc.addPage();
      tableY = 50;
    }
    
    doc.text(row.feature, 55, tableY, { width: 150 });
    doc.text(row.browser, 210, tableY, { width: 150 });
    doc.text(row.native, 365, tableY, { width: 150 });
    tableY += 20;
    
    if (index < tableData.length - 1) {
      doc.moveTo(50, tableY).lineTo(545, tableY).stroke('#e5e7eb');
      tableY += 5;
    }
  });

  // Section 5: Responsive Examples
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#667eea');
  doc.text('How Your App Uses Responsive Design', { continued: false });
  doc.fillColor('#000000').moveDown(0.5);

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('1. Responsive Tailwind Classes');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Your app uses responsive utilities throughout the codebase:');
  doc.moveDown(0.3);

  doc.fontSize(9).font('Courier');
  doc.fillColor('#1a1a1a').rect(doc.x - 5, doc.y - 5, 495, 35).fill('#f5f5f5');
  doc.fillColor('#000000');
  doc.text('// Grid: 1 column mobile, 2 tablet, 4 desktop');
  doc.text('<div className="grid grid-cols-1 md:grid-cols-2');
  doc.text('             lg:grid-cols-4 gap-6">');
  doc.moveDown(0.5);

  doc.fontSize(10).font('Helvetica');
  doc.text('This automatically adapts:');
  doc.moveDown(0.2);
  doc.text('  • On phones (< 768px): Shows 1 column', { indent: 10 });
  doc.text('  • On tablets (≥ 768px): Shows 2 columns', { indent: 10 });
  doc.text('  • On desktops (≥ 1024px): Shows 4 columns', { indent: 10 });
  doc.moveDown(1);

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('2. Touch-Optimized Controls');
  doc.moveDown(0.3);
  doc.fontSize(9).font('Courier');
  doc.fillColor('#1a1a1a').rect(doc.x - 5, doc.y - 5, 495, 22).fill('#f5f5f5');
  doc.fillColor('#000000');
  doc.text('// Minimum 44px height for touch targets');
  doc.text('<Button className="min-h-11">Submit</Button>');
  doc.moveDown(0.5);

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('3. Mobile-Specific Layouts');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Checklist forms are optimized for mobile with:');
  doc.moveDown(0.2);
  doc.text('  • Full-width task cards', { indent: 10 });
  doc.text('  • Large Pass/Fail radio buttons', { indent: 10 });
  doc.text('  • Camera button for photo uploads', { indent: 10 });
  doc.text('  • Touch-friendly spacing', { indent: 10 });

  // Section 6: Visual Adaptation
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#667eea');
  doc.text('Visual Example: Same Code, Different Devices', { continued: false });
  doc.fillColor('#000000').moveDown(0.5);

  doc.fontSize(10).font('Helvetica');
  doc.text('Your app automatically adapts to different screen sizes:');
  doc.moveDown(0.5);

  // iPhone example
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('📱 iPhone 12 (390px width)');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('  • Grid: 1 column (grid-cols-1)', { indent: 10 });
  doc.text('  • Cards: Full width with padding', { indent: 10 });
  doc.text('  • Buttons: 44px height minimum', { indent: 10 });
  doc.text('  • Navigation: Fixed header at top', { indent: 10 });
  doc.moveDown(0.7);

  // iPad example
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('📱 iPad Pro (1024px width)');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('  • Grid: 4 columns (lg:grid-cols-4)', { indent: 10 });
  doc.text('  • Cards: Wider with margins', { indent: 10 });
  doc.text('  • Buttons: Same 44px height', { indent: 10 });
  doc.text('  • Navigation: Sidebar possible', { indent: 10 });
  doc.moveDown(0.7);

  // Desktop example
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('💻 Desktop (1920px width)');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('  • Grid: 4 columns (lg:grid-cols-4)', { indent: 10 });
  doc.text('  • Cards: Max-width centered', { indent: 10 });
  doc.text('  • Buttons: Hover states enabled', { indent: 10 });
  doc.text('  • Navigation: Full sidebar', { indent: 10 });

  // Section 7: Capacitor Configuration
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#667eea');
  doc.text('How Capacitor Preserves Responsiveness', { continued: false });
  doc.fillColor('#000000').moveDown(0.5);

  doc.fontSize(10).font('Helvetica');
  doc.text('When you build APK/IPA using Capacitor (detailed in the mobile build guides), the framework ensures:');
  doc.moveDown(0.5);

  doc.text('✓ Viewport meta tags are respected by the native WebView', { indent: 10 });
  doc.text('✓ CSS media queries work exactly as in browsers', { indent: 10 });
  doc.text('✓ Touch events are properly mapped from native to web', { indent: 10 });
  doc.text('✓ Device-specific optimizations are applied automatically', { indent: 10 });
  doc.moveDown(1);

  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('Capacitor Configuration Example:');
  doc.moveDown(0.3);

  doc.fontSize(9).font('Courier');
  doc.fillColor('#1a1a1a').rect(doc.x - 5, doc.y - 5, 495, 70).fill('#f5f5f5');
  doc.fillColor('#000000');
  doc.text('// capacitor.config.ts');
  doc.text('const config: CapacitorConfig = {');
  doc.text('  appId: "com.kinto.qa",');
  doc.text('  appName: "KINTO QA",');
  doc.text('  webDir: "dist/public",');
  doc.text('  server: {');
  doc.text('    androidScheme: "https"');
  doc.text('  }');
  doc.text('};');
  doc.moveDown(0.5);

  doc.fontSize(10).font('Helvetica');
  doc.text('This configuration ensures all responsive features work in the native app.');

  // Section 8: Testing
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#667eea');
  doc.text('Testing Responsiveness', { continued: false });
  doc.fillColor('#000000').moveDown(0.5);

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('Before Building APK/IPA:');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');

  doc.text('1. Chrome DevTools Testing:');
  doc.moveDown(0.2);
  doc.text('   • Press F12 to open Developer Tools', { indent: 15 });
  doc.text('   • Click the mobile device icon', { indent: 15 });
  doc.text('   • Select devices (iPhone 12, Pixel 5, iPad)', { indent: 15 });
  doc.text('   • Test all screens and interactions', { indent: 15 });
  doc.moveDown(0.5);

  doc.text('2. Real Device Testing:');
  doc.moveDown(0.2);
  doc.text('   • Find your Mac\'s IP address (from Terminal)', { indent: 15 });
  doc.text('   • Open http://YOUR-IP:5000 on your phone', { indent: 15 });
  doc.text('   • Test touch interactions', { indent: 15 });
  doc.text('   • Verify all layouts adapt properly', { indent: 15 });
  doc.moveDown(1);

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('After Building APK/IPA:');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Follow the mobile build guides to:');
  doc.moveDown(0.2);
  doc.text('  • Android: Test on Android emulator or physical device', { indent: 10 });
  doc.text('  • iOS: Test on iOS Simulator or physical device', { indent: 10 });
  doc.text('  • Verify same responsive behavior as browser', { indent: 10 });

  // Section 9: What You Don't Need
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#667eea');
  doc.text('What You DON\'T Need to Do', { continued: false });
  doc.fillColor('#000000').moveDown(0.5);

  doc.fontSize(10).font('Helvetica');
  doc.text('Your application is already fully configured for mobile responsiveness. You do NOT need to:');
  doc.moveDown(0.5);

  doc.text('✗ Write separate mobile layouts', { indent: 10 });
  doc.text('✗ Create different CSS files for native apps', { indent: 10 });
  doc.text('✗ Change HTML structure for mobile', { indent: 10 });
  doc.text('✗ Add special viewport code', { indent: 10 });
  doc.text('✗ Modify Tailwind breakpoints', { indent: 10 });
  doc.text('✗ Use mobile-specific frameworks', { indent: 10 });
  doc.moveDown(1);

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#38a169');
  doc.text('Everything is already configured and ready!', { align: 'center' });
  doc.fillColor('#000000');

  // Section 10: Next Steps
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#667eea');
  doc.text('Next Steps', { continued: false });
  doc.fillColor('#000000').moveDown(0.5);

  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('1. Deploy on Your MacBook');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Follow the macOS Deployment Guide (KINTO_QA_macOS_Deployment_Guide.pdf) to run the application locally on your MacBook.');
  doc.moveDown(0.7);

  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('2. Test on Mobile Browsers');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Access your local deployment from your iPhone/iPad/Android phone using your Mac\'s IP address to verify responsiveness.');
  doc.moveDown(0.7);

  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('3. Build Native Apps (Optional)');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('When ready, follow these guides to create native mobile apps:');
  doc.moveDown(0.2);
  doc.text('  • MOBILE_APK_BUILD_GUIDE.md - For Android (APK)', { indent: 10 });
  doc.text('  • MOBILE_IPA_BUILD_GUIDE.md - For iOS (IPA)', { indent: 10 });
  doc.moveDown(1);

  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('4. Distribute Your Apps');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('  • Android: Publish to Google Play Store', { indent: 10 });
  doc.text('  • iOS: Publish to Apple App Store', { indent: 10 });
  doc.text('  • Or distribute internally to your organization', { indent: 10 });

  // Summary Box
  doc.moveDown(2);
  doc.fontSize(11).font('Helvetica-Bold');
  doc.fillColor('#1a365d').rect(50, doc.y, 495, 100).fillAndStroke('#ebf8ff', '#3182ce');
  doc.fillColor('#1a365d');
  doc.text('Summary', 55, doc.y - 90, { width: 485 });
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('✓ Your app is already mobile-responsive', 55, doc.y, { width: 485 });
  doc.text('✓ Viewport is properly configured', 55, doc.y + 15, { width: 485 });
  doc.text('✓ Tailwind responsive classes are in place', 55, doc.y + 30, { width: 485 });
  doc.text('✓ Touch targets are optimized (44px minimum)', 55, doc.y + 45, { width: 485 });
  doc.text('✓ Screens will dynamically fit in APK/IPA apps', 55, doc.y + 60, { width: 485 });
  doc.fillColor('#000000');

  // Footer
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#667eea');
  doc.text('Additional Resources', { continued: false });
  doc.fillColor('#000000').moveDown(0.5);

  doc.fontSize(10).font('Helvetica');
  doc.text('All documentation is available at /download.html:');
  doc.moveDown(0.5);

  doc.text('• macOS Deployment Guide - Deploy on your MacBook', { indent: 10 });
  doc.text('• Android APK Build Guide - Create Android apps', { indent: 10 });
  doc.text('• iOS IPA Build Guide - Create iOS apps', { indent: 10 });
  doc.text('• System Design Document - Architecture details', { indent: 10 });
  doc.text('• Database Schema - Complete SQL script', { indent: 10 });
  doc.moveDown(2);

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#38a169');
  doc.text('Your KINTO QA app is ready for mobile!', { align: 'center' });
  doc.fillColor('#000000').moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text('The responsive design will work seamlessly across all devices and platforms.', { align: 'center' });

  doc.end();

  stream.on('finish', () => {
    console.log('✅ Mobile Responsiveness PDF generated:', outputPath);
  });
}

generateMobileResponsivenessPDF();

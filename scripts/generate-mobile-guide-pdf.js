import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createMobileGuidePDF() {
  const doc = new PDFDocument({
    margins: {
      top: 50,
      bottom: 50,
      left: 60,
      right: 60
    },
    size: 'A4'
  });

  const outputPath = path.join(__dirname, '..', 'public', 'KINTO_QA_Mobile_App_Guide.pdf');
  doc.pipe(fs.createWriteStream(outputPath));

  // Helper functions
  function addTitle(text) {
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1a1a1a').text(text, { align: 'center' });
    doc.moveDown(0.5);
  }

  function addHeading1(text) {
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#2563eb').text(text);
    doc.moveDown(0.5);
  }

  function addHeading2(text) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text(text);
    doc.moveDown(0.3);
  }

  function addParagraph(text) {
    doc.fontSize(11).font('Helvetica').fillColor('#4a4a4a').text(text, { align: 'left' });
    doc.moveDown(0.5);
  }

  function addBullet(text) {
    doc.fontSize(11).font('Helvetica').fillColor('#4a4a4a').text('• ' + text, { indent: 20 });
  }

  function addCode(text) {
    doc.fontSize(9).font('Courier').fillColor('#000000').text(text, {
      indent: 20,
      continued: false
    });
    doc.moveDown(0.3);
  }

  function addPageBreak() {
    doc.addPage();
  }

  // Cover Page
  doc.moveDown(5);
  doc.fontSize(32).font('Helvetica-Bold').fillColor('#1a1a1a')
    .text('KINTO QA', { align: 'center' });
  doc.fontSize(28).fillColor('#2563eb')
    .text('Mobile App Development', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(20).font('Helvetica').fillColor('#4a4a4a')
    .text('Converting Web App to Android APK & iOS IPA', { align: 'center' });
  doc.moveDown(4);
  doc.fontSize(12).fillColor('#6b6b6b')
    .text('Using Capacitor by Ionic Framework', { align: 'center' });
  doc.moveDown(0.5);
  doc.text('Version 1.0 | November 2025', { align: 'center' });

  addPageBreak();

  // Table of Contents
  addHeading1('Table of Contents');
  doc.moveDown(0.5);
  addParagraph('1. Introduction to Capacitor');
  addParagraph('2. Prerequisites');
  addParagraph('3. Installing Capacitor');
  addParagraph('4. Configuring Your Project');
  addParagraph('5. Building Android APK');
  addParagraph('6. Building iOS IPA');
  addParagraph('7. Adding Native Features');
  addParagraph('8. Development Workflow');
  addParagraph('9. Troubleshooting');
  addParagraph('Appendix A: Quick Command Reference');
  addParagraph('Appendix B: Recommended Plugins');

  addPageBreak();

  // 1. Introduction
  addHeading1('1. Introduction to Capacitor');
  addParagraph('Capacitor is a cross-platform native runtime by Ionic that allows you to convert your existing React web application into native mobile apps for Android (APK) and iOS (IPA) without rewriting your code.');
  doc.moveDown(0.3);
  
  addHeading2('Why Capacitor?');
  addBullet('Wraps your existing React app - no rewrite needed');
  addBullet('Access to native device features (camera, GPS, filesystem)');
  addBullet('Builds APK and IPA from the same codebase');
  addBullet('Native performance with WebView technology');
  addBullet('Active community and regular updates');
  doc.moveDown(0.5);

  addHeading2('How It Works');
  addParagraph('Capacitor wraps your web application in a native WebView component and provides JavaScript APIs to access native device features. Your existing React code runs unchanged inside the native app.');

  addPageBreak();

  // 2. Prerequisites
  addHeading1('2. Prerequisites');
  
  addHeading2('For Android Development:');
  addBullet('Java JDK 11 or higher');
  addBullet('Android Studio (latest version)');
  addBullet('Android SDK (API level 22+)');
  addBullet('Node.js 16+ and npm');
  addBullet('ANDROID_HOME environment variable set');
  doc.moveDown(0.5);

  addHeading2('For iOS Development:');
  addBullet('macOS (required for iOS builds)');
  addBullet('Xcode 14 or higher');
  addBullet('CocoaPods package manager');
  addBullet('Xcode Command Line Tools');
  addBullet('Apple Developer account ($99/year for distribution)');
  doc.moveDown(0.5);

  addHeading2('Check Your Environment:');
  addCode('node --version    # Should be 16+');
  addCode('npm --version');
  addCode('java -version     # Should be 11+');

  addPageBreak();

  // 3. Installing Capacitor
  addHeading1('3. Installing Capacitor');
  
  addHeading2('Step 1: Install Core Packages');
  addCode('npm install @capacitor/core @capacitor/cli');
  doc.moveDown(0.5);

  addHeading2('Step 2: Initialize Capacitor');
  addCode('npx cap init');
  doc.moveDown(0.3);
  addParagraph('You will be prompted for:');
  addBullet('App name: "KINTO QA"');
  addBullet('App ID: "com.kinto.qa" (reverse domain notation)');
  addBullet('Web directory: "dist/public" (your build output)');
  doc.moveDown(0.5);

  addHeading2('Step 3: Install Platform Packages');
  addCode('npm install @capacitor/android @capacitor/ios');
  doc.moveDown(0.5);

  addHeading2('Step 4: Add Platforms');
  addCode('npx cap add android');
  addCode('npx cap add ios');
  doc.moveDown(0.3);
  addParagraph('This creates android/ and ios/ folders with native projects.');

  addPageBreak();

  // 4. Configuration
  addHeading1('4. Configuring Your Project');
  
  addHeading2('capacitor.config.ts');
  addParagraph('After initialization, you will have a capacitor.config.ts file:');
  doc.moveDown(0.3);
  addCode('import type { CapacitorConfig } from \'@capacitor/cli\';');
  addCode('');
  addCode('const config: CapacitorConfig = {');
  addCode('  appId: \'com.kinto.qa\',');
  addCode('  appName: \'KINTO QA\',');
  addCode('  webDir: \'dist/public\',');
  addCode('  server: {');
  addCode('    androidScheme: \'https\'');
  addCode('  }');
  addCode('};');
  addCode('');
  addCode('export default config;');
  doc.moveDown(0.5);

  addHeading2('Update API Endpoints');
  addParagraph('Configure your app to connect to your backend server:');
  doc.moveDown(0.3);
  addCode('const API_URL = import.meta.env.VITE_API_URL ||');
  addCode('  \'https://your-production-server.com\';');
  doc.moveDown(0.5);

  addHeading2('Build Your Web App');
  addParagraph('Before adding to mobile platforms, build your React app:');
  addCode('npm run build');
  doc.moveDown(0.5);

  addHeading2('Sync Web Assets');
  addParagraph('Copy web assets to native projects:');
  addCode('npx cap sync');

  addPageBreak();

  // 5. Building Android APK
  addHeading1('5. Building Android APK');
  
  addHeading2('Method 1: Using Android Studio (Recommended)');
  doc.moveDown(0.3);
  addParagraph('Step 1: Open Android Studio');
  addCode('npx cap open android');
  doc.moveDown(0.3);

  addParagraph('Step 2: Wait for Gradle sync to complete');
  doc.moveDown(0.3);

  addParagraph('Step 3: Build Debug APK');
  addBullet('Go to Build → Build Bundle(s) / APK(s) → Build APK(s)');
  addBullet('Wait for build to complete');
  addBullet('APK location: android/app/build/outputs/apk/debug/app-debug.apk');
  doc.moveDown(0.5);

  addParagraph('Step 4: Build Release APK (Production)');
  addBullet('Go to Build → Generate Signed Bundle / APK');
  addBullet('Select APK and click Next');
  addBullet('Create or select existing keystore');
  addBullet('Fill in keystore details and build');
  doc.moveDown(0.5);

  addHeading2('Method 2: Command Line');
  addCode('cd android');
  addCode('./gradlew assembleDebug      # Debug APK');
  addCode('./gradlew assembleRelease    # Release APK');
  doc.moveDown(0.5);

  addHeading2('Creating a Keystore');
  addParagraph('For production release, create a keystore:');
  addCode('keytool -genkey -v -keystore kinto-qa.keystore \\');
  addCode('  -alias kinto-qa -keyalg RSA -keysize 2048 \\');
  addCode('  -validity 10000');
  doc.moveDown(0.3);
  addParagraph('Store the keystore file and password securely!');

  addPageBreak();

  // 6. Building iOS IPA
  addHeading1('6. Building iOS IPA');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#dc2626')
    .text('⚠️ Important: iOS builds require macOS with Xcode installed');
  doc.moveDown(0.5);
  doc.font('Helvetica').fillColor('#4a4a4a');

  addHeading2('Step 1: Install CocoaPods');
  addCode('sudo gem install cocoapods');
  addCode('pod repo update');
  doc.moveDown(0.5);

  addHeading2('Step 2: Open Xcode');
  addCode('npx cap open ios');
  doc.moveDown(0.5);

  addHeading2('Step 3: Configure Signing');
  addParagraph('In Xcode:');
  addBullet('Select your project in the left sidebar');
  addBullet('Go to Signing & Capabilities tab');
  addBullet('Select your Team (requires Apple Developer account)');
  addBullet('Choose Automatically manage signing');
  doc.moveDown(0.5);

  addHeading2('Step 4: Build for Testing (Simulator)');
  addBullet('Select a simulator device');
  addBullet('Click Product → Run (or press Cmd+R)');
  doc.moveDown(0.5);

  addHeading2('Step 5: Build IPA for Distribution');
  addParagraph('For App Store or Ad Hoc distribution:');
  addBullet('Connect a real device or select Generic iOS Device');
  addBullet('Click Product → Archive');
  addBullet('Wait for archive to complete');
  addBullet('In Organizer, click Distribute App');
  addBullet('Choose distribution method:');
  doc.fontSize(10).text('   - App Store: For public distribution', { indent: 40 });
  doc.text('   - Ad Hoc: For internal testing (max 100 devices)', { indent: 40 });
  doc.text('   - Enterprise: For in-house distribution (requires Enterprise account)', { indent: 40 });
  doc.moveDown(0.5);
  doc.fontSize(11);

  addHeading2('Step 6: Export IPA');
  addBullet('Follow the wizard to export IPA file');
  addBullet('IPA will be saved to your chosen location');

  addPageBreak();

  // 7. Adding Native Features
  addHeading1('7. Adding Native Features');
  
  addHeading2('Camera Access');
  addParagraph('For capturing photos in checklists:');
  addCode('npm install @capacitor/camera');
  doc.moveDown(0.3);
  addParagraph('Usage example:');
  addCode('import { Camera, CameraResultType } from \'@capacitor/camera\';');
  addCode('');
  addCode('const takePicture = async () => {');
  addCode('  const image = await Camera.getPhoto({');
  addCode('    quality: 90,');
  addCode('    allowEditing: false,');
  addCode('    resultType: CameraResultType.Uri');
  addCode('  });');
  addCode('  return image.webPath;');
  addCode('};');
  doc.moveDown(0.5);

  addHeading2('Barcode Scanner');
  addParagraph('For scanning equipment barcodes:');
  addCode('npm install @capacitor-community/barcode-scanner');
  doc.moveDown(0.5);

  addHeading2('File System');
  addParagraph('For offline data storage:');
  addCode('npm install @capacitor/filesystem');
  doc.moveDown(0.5);

  addHeading2('Push Notifications');
  addParagraph('For maintenance alerts:');
  addCode('npm install @capacitor/push-notifications');
  doc.moveDown(0.5);

  addHeading2('Device Info');
  addParagraph('For detecting platform:');
  addCode('npm install @capacitor/device');
  doc.moveDown(0.3);
  addCode('import { Device } from \'@capacitor/device\';');
  addCode('const info = await Device.getInfo();');
  addCode('console.log(\'Platform:\', info.platform);');

  addPageBreak();

  // 8. Development Workflow
  addHeading1('8. Development Workflow');
  
  addHeading2('Live Reload During Development');
  addParagraph('Configure live reload in capacitor.config.ts:');
  doc.moveDown(0.3);
  addCode('const config: CapacitorConfig = {');
  addCode('  // ... other config');
  addCode('  server: {');
  addCode('    url: \'http://192.168.1.100:5000\',  // Your local IP');
  addCode('    cleartext: true');
  addCode('  }');
  addCode('};');
  doc.moveDown(0.5);

  addHeading2('Testing on Emulators/Simulators');
  addCode('npx cap run android    # Run on Android emulator');
  addCode('npx cap run ios        # Run on iOS simulator');
  doc.moveDown(0.5);

  addHeading2('Regular Development Flow');
  addParagraph('1. Make changes to your React code');
  addParagraph('2. Build your web app: npm run build');
  addParagraph('3. Sync to native: npx cap sync');
  addParagraph('4. Test on device/emulator');
  doc.moveDown(0.5);

  addHeading2('Debugging');
  addParagraph('Android - Use Chrome DevTools:');
  addBullet('Open chrome://inspect in Chrome');
  addBullet('Select your device');
  addBullet('Click Inspect');
  doc.moveDown(0.3);

  addParagraph('iOS - Use Safari Web Inspector:');
  addBullet('Enable Web Inspector in iOS Settings → Safari → Advanced');
  addBullet('Open Safari → Develop → [Your Device]');
  addBullet('Select your app');

  addPageBreak();

  // 9. Troubleshooting
  addHeading1('9. Troubleshooting');
  
  addHeading2('Android Issues');
  doc.moveDown(0.3);
  addParagraph('Java Version Error:');
  addCode('java -version  # Check version (should be 11+)');
  addCode('export JAVA_HOME=/path/to/jdk-11');
  doc.moveDown(0.3);

  addParagraph('Gradle Build Failed:');
  addCode('cd android');
  addCode('./gradlew clean');
  addCode('./gradlew build --stacktrace');
  doc.moveDown(0.3);

  addParagraph('SDK Not Found:');
  addCode('export ANDROID_HOME=/path/to/Android/sdk');
  addCode('export PATH=$PATH:$ANDROID_HOME/tools');
  doc.moveDown(0.5);

  addHeading2('iOS Issues');
  doc.moveDown(0.3);
  addParagraph('CocoaPods Error:');
  addCode('cd ios/App');
  addCode('pod deintegrate');
  addCode('pod install');
  doc.moveDown(0.3);

  addParagraph('Code Signing Error:');
  addBullet('Verify Apple Developer account is active');
  addBullet('Check Team selection in Xcode');
  addBullet('Try Automatically manage signing');
  doc.moveDown(0.3);

  addParagraph('Build Failed:');
  addCode('xcodebuild clean');
  addCode('rm -rf ~/Library/Developer/Xcode/DerivedData/*');
  doc.moveDown(0.5);

  addHeading2('General Issues');
  doc.moveDown(0.3);
  addParagraph('White Screen on Launch:');
  addBullet('Check webDir path in capacitor.config.ts');
  addBullet('Verify build output exists in dist/public');
  addBullet('Run npx cap sync again');
  doc.moveDown(0.3);

  addParagraph('API Not Connecting:');
  addBullet('Update API_URL to production server');
  addBullet('Check CORS configuration on server');
  addBullet('Verify network permissions in AndroidManifest.xml');

  addPageBreak();

  // Appendix A
  addHeading1('Appendix A: Quick Command Reference');
  
  addHeading2('Installation:');
  addCode('npm install @capacitor/core @capacitor/cli');
  addCode('npx cap init');
  addCode('npm install @capacitor/android @capacitor/ios');
  addCode('npx cap add android');
  addCode('npx cap add ios');
  doc.moveDown(0.5);

  addHeading2('Build & Sync:');
  addCode('npm run build              # Build web app');
  addCode('npx cap sync               # Sync to native projects');
  addCode('npx cap copy               # Copy web assets only');
  doc.moveDown(0.5);

  addHeading2('Open IDE:');
  addCode('npx cap open android       # Open Android Studio');
  addCode('npx cap open ios           # Open Xcode');
  doc.moveDown(0.5);

  addHeading2('Run on Device:');
  addCode('npx cap run android        # Run on Android');
  addCode('npx cap run ios            # Run on iOS');
  doc.moveDown(0.5);

  addHeading2('Build APK (Command Line):');
  addCode('cd android');
  addCode('./gradlew assembleDebug');
  addCode('./gradlew assembleRelease');

  addPageBreak();

  // Appendix B
  addHeading1('Appendix B: Recommended Plugins for KINTO QA');
  
  addHeading2('Essential Plugins:');
  doc.moveDown(0.3);
  
  doc.fontSize(11).font('Helvetica-Bold').text('1. Camera');
  doc.font('Helvetica').text('   For capturing checklist photos');
  addCode('   npm install @capacitor/camera');
  doc.moveDown(0.3);

  doc.font('Helvetica-Bold').text('2. Barcode Scanner');
  doc.font('Helvetica').text('   For scanning equipment and parts');
  addCode('   npm install @capacitor-community/barcode-scanner');
  doc.moveDown(0.3);

  doc.font('Helvetica-Bold').text('3. Filesystem');
  doc.font('Helvetica').text('   For offline data storage');
  addCode('   npm install @capacitor/filesystem');
  doc.moveDown(0.3);

  doc.font('Helvetica-Bold').text('4. Network');
  doc.font('Helvetica').text('   For detecting offline/online status');
  addCode('   npm install @capacitor/network');
  doc.moveDown(0.3);

  doc.font('Helvetica-Bold').text('5. Device');
  doc.font('Helvetica').text('   For platform detection');
  addCode('   npm install @capacitor/device');
  doc.moveDown(0.5);

  addHeading2('Optional Plugins:');
  doc.moveDown(0.3);
  
  doc.font('Helvetica-Bold').text('• Push Notifications');
  doc.font('Helvetica').text('  For maintenance alerts and reminders');
  doc.moveDown(0.3);

  doc.font('Helvetica-Bold').text('• Geolocation');
  doc.font('Helvetica').text('  For tracking inspection locations');
  doc.moveDown(0.3);

  doc.font('Helvetica-Bold').text('• Local Notifications');
  doc.font('Helvetica').text('  For offline PM reminders');
  doc.moveDown(2);

  // Footer
  doc.fontSize(12).font('Helvetica').fillColor('#6b6b6b')
    .text('End of Document', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10)
    .text('For more information, visit: https://capacitorjs.com/docs', { align: 'center' });
  doc.text('Capacitor is developed by the Ionic team', { align: 'center' });

  doc.end();

  console.log('✅ Mobile app guide PDF created successfully!');
  console.log(`📄 File location: ${outputPath}`);
  console.log(`📦 File name: KINTO_QA_Mobile_App_Guide.pdf`);
}

createMobileGuidePDF();

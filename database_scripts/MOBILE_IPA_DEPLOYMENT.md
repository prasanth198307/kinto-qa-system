# KINTO QA - iOS IPA Deployment Guide

## Overview

The KINTO QA Management System can be deployed on iOS devices in two ways:
1. **Progressive Web App (PWA)** - Quick deployment, no App Store needed
2. **Native iOS App** - Full native app built with Capacitor

## Option 1: PWA Deployment (Recommended for Quick Setup)

### Prerequisites
- iOS device with Safari browser (iOS 11.3+)
- Access to KINTO QA web URL (e.g., https://your-domain.com)

### Installation Steps

1. **Open the Application**
   - Launch Safari browser on iOS device
   - Navigate to your KINTO QA URL
   - Example: `https://kinto-qa.your-company.com`

2. **Install as App**
   - Tap the Share button (square with arrow)
   - Scroll down and tap "Add to Home Screen"
   - Name it "KINTO QA"
   - Tap "Add"

3. **Launch the App**
   - Find "KINTO QA" icon on home screen
   - Tap to open as standalone app

### PWA Features
- ✅ Offline capability
- ✅ Camera access for QR codes
- ✅ No App Store approval needed
- ✅ Instant updates
- ✅ Works on iPhone and iPad
- ⚠️ Limited background processes (iOS restriction)

---

## Option 2: Native IPA Build (Advanced)

### Prerequisites
- macOS computer with Xcode 14+ installed
- Apple Developer Account ($99/year)
- Node.js 18+ installed
- Project source code access
- iOS device or iOS Simulator for testing

### Step 1: Setup Project

```bash
# Navigate to project directory
cd kinto-qa

# Install dependencies
npm install

# Add Capacitor for iOS
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init "KINTO QA" "com.yourcompany.kintoqa"
```

### Step 2: Configure Capacitor

Create `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.kintoqa',
  appName: 'KINTO QA',
  webDir: 'dist/public',
  server: {
    iosScheme: 'capacitor',
    hostname: 'kintoqa.local'
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false
  }
};

export default config;
```

### Step 3: Build Web Assets

```bash
# Build production version
npm run build

# Add iOS platform
npx cap add ios

# Copy assets to iOS
npx cap copy ios

# Sync everything
npx cap sync ios
```

### Step 4: Configure Xcode Project

```bash
# Open project in Xcode
npx cap open ios
```

In Xcode:

1. **Select Project** → Select App target
2. **General Tab:**
   - Set Display Name: "KINTO QA"
   - Set Bundle Identifier: com.yourcompany.kintoqa
   - Select Team: Your Apple Developer team
   - Set Version: 1.0.0
   - Set Build: 1

3. **Signing & Capabilities:**
   - Enable "Automatically manage signing"
   - Select your development team
   - Verify provisioning profile is created

### Step 5: Configure Info.plist

Add permissions in `ios/App/App/Info.plist`:

```xml
<dict>
    <!-- Camera permission -->
    <key>NSCameraUsageDescription</key>
    <string>KINTO QA needs camera access to scan QR codes and capture images for quality checks</string>
    
    <!-- Photo library permission -->
    <key>NSPhotoLibraryUsageDescription</key>
    <string>KINTO QA needs photo library access to attach images to reports</string>
    
    <!-- Location permission (if needed) -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>KINTO QA uses your location to tag machine locations</string>
    
    <!-- Network usage -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
    
    <!-- Supported interface orientations -->
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
</dict>
```

### Step 6: App Icons and Launch Screen

#### App Icons

1. Create app icons for all sizes in Xcode:
   - Navigate to `Assets.xcassets` → `AppIcon`
   - Add icons for all required sizes:
     - 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024
   - Use 2x and 3x versions for retina displays

#### Launch Screen

Edit `LaunchScreen.storyboard`:
- Add company logo
- Set background color
- Add app name label

### Step 7: Build IPA

#### Development Build (for testing)

```bash
# In Xcode:
# 1. Select your device or simulator
# 2. Product → Build (Cmd+B)
# 3. Product → Run (Cmd+R) to test
```

#### Archive for Distribution

1. **Prepare for Archive**
   - Select "Any iOS Device" as build target
   - Product → Scheme → Edit Scheme
   - Set Build Configuration to "Release"

2. **Create Archive**
   - Product → Archive
   - Wait for build to complete
   - Archives window will open

3. **Export IPA**
   - Select the archive
   - Click "Distribute App"
   - Choose distribution method:

### Distribution Methods

#### Method 1: Ad Hoc Distribution (Internal Testing)

**Best for:** Testing with up to 100 devices

1. **Export Archive:**
   - Select "Ad Hoc" distribution
   - Choose provisioning profile
   - Export IPA

2. **Register Test Devices:**
   - Get device UDIDs from testers
   - Add to Apple Developer portal
   - Regenerate provisioning profile
   - Rebuild IPA

3. **Install on Devices:**
   ```bash
   # Via Xcode
   Window → Devices and Simulators
   Select device → "+" → Select IPA
   
   # Via command line
   ideviceinstaller -i app.ipa
   ```

#### Method 2: Enterprise Distribution (Company-Wide)

**Requires:** Apple Developer Enterprise Program ($299/year)

1. **Export with Enterprise Profile:**
   - Select "Enterprise" distribution
   - Sign with enterprise certificate
   - Export IPA

2. **Host on Internal Server:**
   ```html
   <!-- manifest.plist -->
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>items</key>
       <array>
           <dict>
               <key>assets</key>
               <array>
                   <dict>
                       <key>kind</key>
                       <string>software-package</string>
                       <key>url</key>
                       <string>https://your-company.com/apps/kintoqa.ipa</string>
                   </dict>
               </array>
               <key>metadata</key>
               <dict>
                   <key>bundle-identifier</key>
                   <string>com.yourcompany.kintoqa</string>
                   <key>bundle-version</key>
                   <string>1.0.0</string>
                   <key>kind</key>
                   <string>software</string>
                   <key>title</key>
                   <string>KINTO QA</string>
               </dict>
           </dict>
       </array>
   </dict>
   </plist>
   ```

3. **Create Download Page:**
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>Install KINTO QA</title>
       <meta name="viewport" content="width=device-width, initial-scale=1">
   </head>
   <body>
       <h1>Install KINTO QA</h1>
       <a href="itms-services://?action=download-manifest&url=https://your-company.com/apps/manifest.plist">
           Install KINTO QA
       </a>
   </body>
   </html>
   ```

#### Method 3: TestFlight (Beta Testing)

**Best for:** Testing with up to 10,000 users

1. **Export for TestFlight:**
   - Select "App Store Connect" distribution
   - Upload to App Store Connect
   - Submit for beta review

2. **Add Beta Testers:**
   - Open App Store Connect
   - Select your app → TestFlight
   - Add internal testers (up to 100)
   - Add external testers (up to 10,000)
   - Send invitations

3. **Testers Install:**
   - Receive email invitation
   - Install TestFlight app
   - Install KINTO QA via TestFlight

#### Method 4: App Store Distribution

**Best for:** Public release

1. **Prepare App Store Listing:**
   - App name and description
   - Keywords
   - Screenshots (all device sizes)
   - App icon (1024x1024)
   - Privacy policy URL
   - Support URL

2. **Export and Upload:**
   - Select "App Store" distribution
   - Upload via Xcode Organizer
   - Or use Application Loader

3. **Submit for Review:**
   - Complete all app information
   - Submit for review
   - Wait for approval (1-3 days typically)

4. **Release:**
   - Choose automatic or manual release
   - App goes live on App Store

---

## Configuration

### Environment Variables

Create `.env.production`:

```env
# API Configuration
VITE_API_URL=https://api.your-company.com

# App Configuration
VITE_APP_NAME=KINTO QA
VITE_APP_VERSION=1.0.0
VITE_APP_BUILD=1
```

### App Configuration

Edit `ios/App/App/config.json`:

```json
{
  "name": "KINTO QA",
  "version": "1.0.0",
  "build": "1",
  "apiUrl": "https://api.your-company.com"
}
```

---

## Testing

### Pre-Release Checklist

- [ ] Test on iPhone (multiple models)
- [ ] Test on iPad
- [ ] Test on different iOS versions (13, 14, 15, 16, 17)
- [ ] Verify offline functionality
- [ ] Test camera permissions and QR scanning
- [ ] Check network connectivity handling
- [ ] Verify all forms work correctly
- [ ] Test data persistence
- [ ] Check app icon and splash screen
- [ ] Test on both WiFi and cellular
- [ ] Verify notifications work
- [ ] Test app in airplane mode

### Testing Commands

```bash
# Run in simulator
npx cap run ios

# Run on device
npx cap run ios --target="Your iPhone Name"

# Open in Xcode for debugging
npx cap open ios
```

---

## Troubleshooting

### Code Signing Errors

**Error: "No signing certificate found"**
1. Open Xcode
2. Preferences → Accounts
3. Add Apple ID
4. Download certificates

**Error: "Provisioning profile doesn't match"**
1. Enable "Automatically manage signing"
2. Or create matching profile in Apple Developer portal

### Build Errors

**Error: "Command PhaseScriptExecution failed"**
```bash
# Clean build folder
npx cap sync ios
cd ios/App
pod deintegrate
pod install
```

**Error: "Module not found"**
```bash
# Reinstall dependencies
cd ios/App
pod install --repo-update
```

### Runtime Issues

**App crashes on launch**
- Check Info.plist for required permissions
- Review crash logs in Xcode → Window → Devices
- Check API URL is accessible

**Camera not working**
- Add NSCameraUsageDescription to Info.plist
- Request permission at runtime

**API requests failing**
- Use HTTPS (required by iOS App Transport Security)
- Or add ATS exception in Info.plist

---

## Updates and Maintenance

### Updating the App

1. Increment version numbers:
   ```bash
   # In package.json
   "version": "1.0.1"
   
   # In Xcode: General → Version and Build
   ```

2. Build and sync:
   ```bash
   npm run build
   npx cap copy ios
   npx cap sync ios
   ```

3. Archive and distribute new version

### App Store Updates

1. Submit new version to App Store Connect
2. Users receive automatic update notification
3. Or can manually update via App Store

### Enterprise/Ad Hoc Updates

1. Build new IPA
2. Update version on distribution server
3. Notify users to reinstall

---

## Security Considerations

### Code Signing
- ✅ Use valid Apple Developer certificates
- ✅ Keep private keys secure
- ✅ Use proper provisioning profiles
- ✅ Enable app sandboxing

### API Security
- ✅ Use HTTPS only (required by iOS)
- ✅ Implement certificate pinning
- ✅ Store tokens in iOS Keychain
- ✅ Implement session timeout

### Data Protection
- ✅ Enable Data Protection for files
- ✅ Use iOS Keychain for sensitive data
- ✅ Implement biometric authentication
- ✅ Clear cache on logout

---

## Cost Summary

| Method | Cost | Best For |
|--------|------|----------|
| PWA | Free | Quick deployment, no restrictions |
| Personal Developer | $99/year | Small teams, TestFlight testing |
| Enterprise Program | $299/year | Large companies, internal apps |
| App Store | $99/year | Public release |

---

## Support

For technical assistance:
- Check Xcode build logs
- Review device console logs
- Consult Capacitor iOS documentation
- Contact Apple Developer Support
- Contact development team

**Version:** 1.0.0  
**Last Updated:** November 2025

# KINTO QA Management System - iOS IPA Build Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Method 1: Capacitor with Xcode (Recommended)](#method-1-capacitor-with-xcode-recommended)
4. [Method 2: PWA to IPA Conversion](#method-2-pwa-to-ipa-conversion)
5. [Code Signing](#code-signing)
6. [Testing](#testing)
7. [Publishing to App Store](#publishing-to-app-store)
8. [TestFlight Distribution](#testflight-distribution)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

This guide explains how to build an iOS IPA (iOS App Store Package) from the KINTO QA Management System web application. 

**Important Note**: Building iOS apps requires:
- macOS computer (Monterey 12.0 or later)
- Apple Developer Account ($99/year)
- Xcode 14+ installed

### Build Methods

1. **Capacitor with Xcode** (Recommended): Full native capabilities
2. **PWA Wrapper**: Simpler but limited features

---

## Prerequisites

### Required Hardware
- **Mac Computer**: MacBook, iMac, or Mac Mini
- **macOS**: Version 12.0 (Monterey) or later
- **Storage**: At least 50GB free space
- **RAM**: Minimum 8GB (16GB recommended)

### Required Software

#### 1. Xcode
```bash
# Install from Mac App Store
# Or download from: https://developer.apple.com/xcode/

# Verify installation
xcode-select --version

# Install command line tools
xcode-select --install

# Accept license
sudo xcodebuild -license accept
```

#### 2. Node.js and npm
```bash
node --version  # Should be 20.x or higher
npm --version   # Should be 10.x or higher
```

#### 3. CocoaPods (iOS dependency manager)
```bash
# Install CocoaPods
sudo gem install cocoapods

# Verify installation
pod --version
```

#### 4. iOS Simulator (comes with Xcode)
```bash
# List available simulators
xcrun simctl list devices available
```

### Apple Developer Account Setup

1. **Enroll in Apple Developer Program**
   - Go to https://developer.apple.com/programs/
   - Cost: $99/year
   - Approval takes 1-2 days

2. **Create App ID**
   - Login to https://developer.apple.com/account
   - Go to **Certificates, Identifiers & Profiles**
   - Click **Identifiers** → **+** button
   - Select **App IDs** → Continue
   - Fill in:
     - Description: KINTO QA Management
     - Bundle ID: com.kinto.qa (Explicit)
     - Capabilities: Push Notifications, Camera (if needed)
   - Click **Continue** → **Register**

3. **Download Certificates**
   - Go to **Certificates** → **+** button
   - Select **iOS Distribution**
   - Follow CSR generation steps
   - Download and install certificate

---

## Method 1: Capacitor with Xcode (Recommended)

### Step 1: Install Capacitor

```bash
cd /path/to/kinto-qa

# Install Capacitor (if not already installed)
npm install @capacitor/core @capacitor/cli

# Install iOS platform
npm install @capacitor/ios

# Install useful plugins
npm install @capacitor/camera
npm install @capacitor/device
npm install @capacitor/network
npm install @capacitor/splash-screen
npm install @capacitor/status-bar
npm install @capacitor/keyboard
```

### Step 2: Initialize Capacitor

```bash
# Initialize (if not already done)
npx cap init "KINTO QA" "com.kinto.qa" --web-dir=dist/public
```

### Step 3: Configure Capacitor

Edit `capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kinto.qa',
  appName: 'KINTO QA',
  webDir: 'dist/public',
  server: {
    iosScheme: 'https',
    // For development, point to your server
    // url: 'http://192.168.1.100:5000',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1f2937",
      showSpinner: false,
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
```

### Step 4: Build the Web App

```bash
# Build production version
npm run build

# Verify dist/public exists with all assets
ls -la dist/public/
```

### Step 5: Add iOS Platform

```bash
# Add iOS platform
npx cap add ios

# Copy web assets to iOS project
npx cap copy ios

# Sync Capacitor plugins
npx cap sync ios

# Update iOS dependencies
cd ios/App
pod install
cd ../..
```

This creates the `ios/` directory with a complete Xcode project.

### Step 6: Configure iOS Project

#### 6.1 Open Project in Xcode

```bash
# Open iOS project in Xcode
npx cap open ios
```

#### 6.2 Configure Project Settings

In Xcode:
1. Select **App** target in left sidebar
2. Go to **Signing & Capabilities** tab
3. Configure:
   - **Team**: Select your Apple Developer Team
   - **Bundle Identifier**: com.kinto.qa
   - **Signing**: Automatic (recommended) or Manual
   - **Provisioning Profile**: Xcode Managed Profile

#### 6.3 Update App Info

In Xcode:
1. Select **App** target
2. Go to **General** tab
3. Configure:
   - **Display Name**: KINTO QA
   - **Bundle Identifier**: com.kinto.qa
   - **Version**: 1.0
   - **Build**: 1
   - **Deployment Target**: iOS 13.0 or later
   - **Devices**: iPhone, iPad (Universal)

#### 6.4 Configure Info.plist

In Xcode, open `ios/App/App/Info.plist` (or edit as source):

Add required permissions:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- App Configuration -->
    <key>CFBundleDisplayName</key>
    <string>KINTO QA</string>
    
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    
    <key>CFBundleVersion</key>
    <string>1</string>
    
    <!-- Camera Permission -->
    <key>NSCameraUsageDescription</key>
    <string>This app requires camera access to capture photos for quality checklists and documentation.</string>
    
    <!-- Photo Library Permission -->
    <key>NSPhotoLibraryUsageDescription</key>
    <string>This app requires photo library access to save and retrieve quality control images.</string>
    
    <key>NSPhotoLibraryAddUsageDescription</key>
    <string>This app requires permission to save photos to your library.</string>
    
    <!-- Location Permission (if needed) -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>This app requires location access to tag quality reports with location data.</string>
    
    <!-- Network -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <!-- For development only - remove in production -->
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
    
    <!-- Supported Interface Orientations (iPhone) -->
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
    
    <!-- Supported Interface Orientations (iPad) -->
    <key>UISupportedInterfaceOrientations~ipad</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationPortraitUpsideDown</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
</dict>
</plist>
```

### Step 7: Add App Icons

#### Using Xcode Asset Catalog

1. In Xcode, open **Assets.xcassets** (in App folder)
2. Select **AppIcon**
3. Drag and drop icon images for each size:
   - 20x20 @2x, @3x
   - 29x29 @2x, @3x
   - 40x40 @2x, @3x
   - 60x60 @2x, @3x
   - 76x76 @1x, @2x (iPad)
   - 83.5x83.5 @2x (iPad Pro)
   - 1024x1024 @1x (App Store)

#### Generate Icons Automatically

Use online tools:
- https://www.appicon.co/
- https://icon.kitchen/
- https://makeappicon.com/

Or use command line:
```bash
# Install capacitor-assets
npm install @capacitor/assets -D

# Place icon at: resources/icon.png (1024x1024)
# Run generator
npx capacitor-assets generate --ios
```

### Step 8: Build IPA

#### Option A: Build for Simulator (Testing)

In Xcode:
1. Select **Any iOS Device (arm64)** or specific simulator
2. **Product** → **Build** (⌘B)
3. Wait for build to complete

#### Option B: Build for Device (Testing)

1. Connect iPhone/iPad via USB
2. Trust computer on device
3. In Xcode, select your device
4. **Product** → **Run** (⌘R)
5. App installs and runs on device

#### Option C: Archive for Distribution

1. In Xcode, select **Any iOS Device (arm64)**
2. **Product** → **Archive** (⌘⇧B)
3. Wait for archiving to complete
4. **Organizer** window opens automatically
5. Select your archive
6. Click **Distribute App**

Choose distribution method:
- **App Store Connect**: For App Store submission
- **Ad Hoc**: For internal testing (100 devices max)
- **Enterprise**: For enterprise distribution
- **Development**: For development testing

### Step 9: Export IPA

After archiving:

1. In **Organizer**, select archive
2. Click **Distribute App**
3. Select **Ad Hoc** (for testing) or **App Store Connect** (for submission)
4. Choose:
   - **App Thinning**: All compatible device variants
   - **Rebuild from Bitcode**: Yes (if available)
   - **Strip Swift symbols**: Yes
5. Select distribution certificate and provisioning profile
6. Click **Export**
7. Choose save location
8. IPA file will be saved

**IPA Location**: `~/Library/Developer/Xcode/Archives/[date]/[app].xcarchive/Products/Applications/App.ipa`

---

## Method 2: PWA to IPA Conversion

### Using PWA Builder

**Note**: This method has limitations and may not be accepted by App Store.

1. Go to https://www.pwabuilder.com/
2. Enter your deployed app URL (must be HTTPS)
3. Click **Package For Stores**
4. Select **iOS**
5. Configure:
   - App name: KINTO QA
   - Bundle ID: com.kinto.qa
6. Click **Generate Package**
7. Download Xcode project
8. Open in Xcode and follow steps from Method 1

**Limitations**:
- Limited native features
- May not pass App Store review
- Poor performance compared to Capacitor
- No offline database support

---

## Code Signing

### Understanding iOS Code Signing

iOS apps require two items:
1. **Certificate**: Proves your identity
2. **Provisioning Profile**: Links your app, certificate, and devices

### Types of Certificates

| Type | Purpose | Devices | Duration |
|------|---------|---------|----------|
| Development | Testing on your devices | Registered devices only | 1 year |
| Ad Hoc | Beta testing | Up to 100 registered devices | 1 year |
| App Store | App Store distribution | All devices | 1 year |
| Enterprise | Company internal distribution | All devices (enterprise only) | 1 year |

### Automatic Signing (Recommended)

In Xcode:
1. Select **App** target
2. Go to **Signing & Capabilities**
3. Enable **Automatically manage signing**
4. Select your **Team**
5. Xcode handles certificates and profiles

### Manual Signing

#### 1. Create Certificate Signing Request (CSR)

On Mac:
1. Open **Keychain Access**
2. **Keychain Access** → **Certificate Assistant** → **Request a Certificate From a Certificate Authority**
3. Enter email address
4. Select **Saved to disk**
5. Click **Continue**
6. Save CSR file

#### 2. Create Certificate in Developer Portal

1. Go to https://developer.apple.com/account
2. **Certificates, Identifiers & Profiles**
3. Click **Certificates** → **+**
4. Select type (iOS App Development or iOS Distribution)
5. Upload CSR file
6. Download and install certificate (double-click)

#### 3. Create Provisioning Profile

1. In Developer Portal, go to **Profiles**
2. Click **+**
3. Select type (Development, Ad Hoc, or App Store)
4. Select App ID: com.kinto.qa
5. Select certificates
6. Select devices (for Development/Ad Hoc only)
7. Name profile: "KINTO QA Distribution"
8. Download and install (double-click)

#### 4. Configure Xcode for Manual Signing

1. Select **App** target
2. **Signing & Capabilities**
3. Disable **Automatically manage signing**
4. Select **Provisioning Profile** manually

---

## Testing

### Test on iOS Simulator

```bash
# List available simulators
xcrun simctl list devices available

# Build and run on simulator
npx cap run ios

# Or in Xcode: Select simulator → Product → Run
```

### Test on Physical Device

#### Option A: Direct Install via Xcode
1. Connect device via USB
2. Trust computer on device
3. In Xcode, select device
4. Click **Run** (⌘R)
5. On device: Settings → General → VPN & Device Management
6. Trust developer certificate

#### Option B: Install via IPA
```bash
# Using Apple Configurator
# or Xcode → Window → Devices and Simulators
# Drag IPA file to device
```

### Testing Checklist

- [ ] App launches successfully
- [ ] All screens render correctly
- [ ] Login/authentication works
- [ ] Camera access works (if needed)
- [ ] Offline functionality works
- [ ] Data persistence works
- [ ] Notifications work (if implemented)
- [ ] App runs on iPhone and iPad
- [ ] Test on different iOS versions (13.0+)
- [ ] Portrait and landscape orientations
- [ ] Dark mode compatibility
- [ ] Memory usage acceptable
- [ ] No crashes or freezes

---

## Publishing to App Store

### Step 1: Prepare App Store Connect

1. Go to https://appstoreconnect.apple.com/
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platforms**: iOS
   - **Name**: KINTO QA Management System
   - **Primary Language**: English
   - **Bundle ID**: com.kinto.qa
   - **SKU**: KINTOQA001
   - **User Access**: Full Access

### Step 2: App Information

In App Store Connect, fill in:

**App Information**:
- Category: Business / Productivity
- Content Rights: Yes (owns all rights)

**Pricing and Availability**:
- Price: Free
- Availability: All countries or specific

**App Privacy**:
- Privacy Policy URL: https://kinto.com/privacy
- Data collection practices (complete questionnaire)

### Step 3: Prepare Store Listing

Required assets:

#### Screenshots
- **iPhone 6.7"** (required): iPhone 14 Pro Max
  - 1290 x 2796 pixels
  - At least 3 screenshots, max 10
- **iPhone 6.5"** (required): iPhone 11 Pro Max
  - 1242 x 2688 pixels
- **iPad Pro 12.9"** (recommended)
  - 2048 x 2732 pixels

#### App Preview Video (optional)
- 15-30 seconds
- Same sizes as screenshots
- MP4 or MOV format

#### App Icon
- 1024 x 1024 pixels
- PNG format, no transparency
- No rounded corners (Apple adds them)

#### Text Content
- **App Name**: KINTO QA Management System (max 30 chars)
- **Subtitle**: Quality Assurance & Maintenance (max 30 chars)
- **Description**: Full description (max 4000 chars)
- **Keywords**: qa,quality,maintenance,manufacturing (max 100 chars)
- **Support URL**: https://support.kinto.com
- **Marketing URL**: https://kinto.com
- **Promotional Text**: Highlight key features (max 170 chars)

### Step 4: Upload Build

#### Using Xcode

1. Archive app: **Product** → **Archive**
2. In Organizer, select archive
3. Click **Distribute App**
4. Select **App Store Connect**
5. Select **Upload**
6. Review options:
   - Upload symbols: Yes
   - Manage version and build number: Yes
7. Click **Upload**
8. Wait for upload and processing (10-60 minutes)

#### Using Transporter App

1. Export IPA from Xcode Organizer
2. Open **Transporter** app (Mac App Store)
3. Sign in with Apple ID
4. Drag IPA file
5. Click **Deliver**

### Step 5: Submit for Review

1. In App Store Connect, go to your app
2. Click **+** next to iOS App (under App Store)
3. Enter version: 1.0
4. Select build (wait for it to appear after upload)
5. Fill in **What's New in This Version**
6. Answer **Export Compliance** questions
7. Answer **Content Rights** questions
8. Answer **Advertising Identifier** questions
9. Click **Save**
10. Click **Submit for Review**

### Step 6: App Review Process

**Timeline**: 1-7 days (typically 24-48 hours)

**Review Guidelines**:
- No crashes or bugs
- Fully functional
- Accurate description
- Appropriate for age rating
- Complies with Apple guidelines

**Possible Outcomes**:
- **Approved**: App goes live
- **Metadata Rejected**: Fix description/screenshots
- **Binary Rejected**: Fix app and resubmit

### Step 7: Release

After approval:
- **Manual Release**: Click **Release This Version**
- **Automatic Release**: App releases automatically

---

## TestFlight Distribution

TestFlight allows beta testing with up to 10,000 external testers.

### Internal Testing (Up to 100 Apple IDs)

1. In App Store Connect, go to **TestFlight**
2. Click **Internal Testing** → **+**
3. Create group: "Internal Testers"
4. Add internal testers (must have App Store Connect access)
5. Select build
6. Testers receive email invite
7. They install TestFlight app and accept

### External Testing (Up to 10,000 Testers)

1. In App Store Connect, go to **TestFlight**
2. Click **External Testing** → **+**
3. Create group: "Beta Testers"
4. Add build
5. Fill in **Test Information**
6. Submit for Beta App Review (1-2 days)
7. After approval, add testers:
   - Email addresses
   - Public link (anyone can join)
8. Testers receive email invite

### Managing Beta Builds

```bash
# In Xcode, archive with incremented build number
# Version: 1.0, Build: 2, 3, 4...

# Upload to App Store Connect
# Previous build remains active until you select new one
```

**Best Practices**:
- Increment build number for each upload
- Add build notes for testers
- Monitor crash reports
- Collect feedback
- Fix issues before App Store submission

---

## Troubleshooting

### Common Issues

#### 1. Code Signing Failed

**Error**: "Code signing failed. Unable to find matching signing identity"

**Solution**:
```bash
# Check certificates
security find-identity -v -p codesigning

# If missing, create certificate in Developer Portal
# Download and double-click to install
```

#### 2. Provisioning Profile Error

**Error**: "No provisioning profiles found"

**Solution**:
1. In Xcode: **Preferences** → **Accounts**
2. Select Apple ID → **Download Manual Profiles**
3. Or enable **Automatically manage signing**

#### 3. App Crashes on Launch

**Solution**:
```bash
# Check device logs
# Xcode → Window → Devices and Simulators
# Select device → View Device Logs

# Common fixes:
# - Check Info.plist configuration
# - Verify Capacitor plugins are installed
# - Check network connectivity
```

#### 4. Archive Build Failed

**Error**: "Build input file cannot be found"

**Solution**:
```bash
# Clean build folder
# Xcode: Product → Clean Build Folder (⌘⇧K)

# Delete derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Rebuild
```

#### 5. Upload to App Store Failed

**Error**: "The bundle is invalid"

**Solution**:
- Check bundle identifier matches App Store Connect
- Verify version and build number
- Ensure all icons are provided
- Check Info.plist for missing keys

#### 6. CocoaPods Issues

```bash
# Update CocoaPods
sudo gem install cocoapods

# Clean pods
cd ios/App
rm -rf Pods
rm Podfile.lock
pod install --repo-update
```

### Debugging Commands

```bash
# Check Xcode version
xcodebuild -version

# List schemes
xcodebuild -list

# Clean Capacitor
npx cap sync ios --clean

# View detailed logs
xcrun simctl spawn booted log stream --predicate 'process == "App"'

# Check app bundle
codesign -dv --verbose=4 App.app

# Verify IPA
xcrun altool --validate-app -f App.ipa -t ios -u your@email.com
```

### Support Resources

- **Apple Developer Forums**: https://developer.apple.com/forums/
- **Capacitor iOS Docs**: https://capacitorjs.com/docs/ios
- **Stack Overflow**: Tag `ios` and `capacitor`
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/

---

## Appendix

### Xcode Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Build | ⌘B |
| Run | ⌘R |
| Stop | ⌘. |
| Clean Build | ⌘⇧K |
| Archive | ⌘⇧B |
| Preferences | ⌘, |
| Devices | ⌘⇧2 |

### Useful Commands

```bash
# Capacitor
npx cap sync ios                # Sync plugins and web assets
npx cap open ios               # Open in Xcode
npx cap copy ios               # Copy web assets only
npx cap update ios             # Update iOS platform
npx cap run ios               # Build and run

# CocoaPods
pod install                    # Install dependencies
pod update                     # Update dependencies
pod deintegrate               # Remove CocoaPods
pod repo update               # Update pod repositories

# Xcode Build
xcodebuild clean              # Clean build
xcodebuild build              # Build project
xcodebuild archive            # Archive project
xcodebuild test               # Run tests
```

### File Structure

```
kinto-qa/
├── ios/
│   ├── App/
│   │   ├── App/
│   │   │   ├── Info.plist           # App configuration
│   │   │   ├── Assets.xcassets/     # App icons, images
│   │   │   └── config.xml
│   │   ├── App.xcodeproj/           # Xcode project
│   │   ├── App.xcworkspace/         # Xcode workspace
│   │   ├── Podfile                  # CocoaPods dependencies
│   │   └── public/                  # Web assets
│   └── ...
├── capacitor.config.ts              # Capacitor configuration
└── dist/public/                     # Built web app
```

### Version Control Best Practices

Add to `.gitignore`:
```gitignore
# iOS
ios/App/Pods/
ios/App/build/
ios/App/App.xcodeproj/xcuserdata/
ios/App/App.xcworkspace/xcuserdata/
*.ipa
*.dSYM.zip

# Certificates (NEVER commit these!)
*.p12
*.cer
*.mobileprovision
```

Commit:
```gitignore
ios/App/App.xcodeproj/
ios/App/Podfile
ios/App/Podfile.lock
ios/App/App/Info.plist
```

---

**Document Version**: 1.0  
**Last Updated**: November 4, 2025  
**For**: KINTO QA Management System v1.0  
**Platform**: iOS 13.0+

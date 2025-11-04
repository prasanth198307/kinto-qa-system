# KINTO QA Management System - Android APK Build Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Method 1: Capacitor (Recommended)](#method-1-capacitor-recommended)
4. [Method 2: PWA to APK Conversion](#method-2-pwa-to-apk-conversion)
5. [Signing the APK](#signing-the-apk)
6. [Testing](#testing)
7. [Publishing to Google Play Store](#publishing-to-google-play-store)
8. [Troubleshooting](#troubleshooting)

---

## Introduction

This guide explains how to build an Android APK (Android Package) from the KINTO QA Management System web application. There are two primary methods:

1. **Capacitor** (Recommended): Native wrapper with full native API access
2. **PWA to APK**: Simple conversion using PWA Builder

### When to Use Each Method

**Use Capacitor if:**
- You need native device features (camera, GPS, biometrics)
- You want push notifications
- You require offline database storage
- You need best performance

**Use PWA to APK if:**
- You want simplest deployment
- You don't need advanced native features
- You want to maintain single codebase
- Quick proof of concept

---

## Prerequisites

### Required Software

#### 1. Node.js and npm
```bash
node --version  # Should be 20.x or higher
npm --version   # Should be 10.x or higher
```

#### 2. Android Studio
- Download from: https://developer.android.com/studio
- Install Android SDK
- Install Android SDK Build-Tools
- Install Android Emulator (for testing)

#### 3. Java Development Kit (JDK)
```bash
# Install JDK 17 (recommended)
# Ubuntu/Debian
sudo apt install openjdk-17-jdk

# macOS
brew install openjdk@17

# Windows
# Download from: https://adoptium.net/
```

#### 4. Gradle
```bash
# Usually comes with Android Studio
gradle --version
```

### Environment Setup

#### 1. Set ANDROID_HOME Environment Variable

**Linux/macOS:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# Apply changes
source ~/.bashrc  # or source ~/.zshrc
```

**Windows:**
```cmd
# Set environment variables:
ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
PATH=%PATH%;%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools
```

#### 2. Verify Installation
```bash
# Check Android SDK
sdkmanager --list

# Check ADB
adb --version
```

---

## Method 1: Capacitor (Recommended)

Capacitor is a cross-platform native runtime for web apps created by the Ionic team.

### Step 1: Install Capacitor

```bash
cd /path/to/kinto-qa

# Install Capacitor CLI and core
npm install @capacitor/core @capacitor/cli

# Install Android platform
npm install @capacitor/android

# Install useful plugins
npm install @capacitor/camera
npm install @capacitor/device
npm install @capacitor/network
npm install @capacitor/splash-screen
npm install @capacitor/status-bar
```

### Step 2: Initialize Capacitor

```bash
# Initialize Capacitor configuration
npx cap init "KINTO QA" "com.kinto.qa" --web-dir=dist/public
```

This creates:
- `capacitor.config.ts` - Capacitor configuration
- `android/` directory (after adding Android platform)

### Step 3: Configure Capacitor

Edit `capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kinto.qa',
  appName: 'KINTO QA',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // For development, point to your server
    // url: 'http://192.168.1.100:5000',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1f2937",
      showSpinner: false,
    },
  },
};

export default config;
```

### Step 4: Build the Web App

```bash
# Build production version
npm run build

# This creates dist/public with all assets
```

### Step 5: Add Android Platform

```bash
# Add Android platform
npx cap add android

# Copy web assets to Android project
npx cap copy android

# Sync Capacitor plugins
npx cap sync android
```

This creates the `android/` directory with a complete Android Studio project.

### Step 6: Configure Android App

#### 6.1 Update AndroidManifest.xml

Edit `android/app/src/main/AndroidManifest.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.kinto.qa">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:exported="true"
            android:label="@string/title_activity_main"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:windowSoftInputMode="adjustResize">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>
    </application>
</manifest>
```

#### 6.2 Update App Name and Version

Edit `android/app/build.gradle`:
```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.kinto.qa"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 7: Add App Icons

Create app icons in various sizes:
- 48x48 (mdpi)
- 72x72 (hdpi)
- 96x96 (xhdpi)
- 144x144 (xxhdpi)
- 192x192 (xxxhdpi)

Place in:
```
android/app/src/main/res/mipmap-mdpi/ic_launcher.png
android/app/src/main/res/mipmap-hdpi/ic_launcher.png
android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
```

Use tools like:
- https://romannurik.github.io/AndroidAssetStudio/
- https://icon.kitchen/

### Step 8: Build APK

#### Option A: Using Command Line
```bash
cd android

# Build debug APK
./gradlew assembleDebug

# Build release APK (unsigned)
./gradlew assembleRelease

# APK location:
# Debug: android/app/build/outputs/apk/debug/app-debug.apk
# Release: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

#### Option B: Using Android Studio
```bash
# Open Android project in Android Studio
npx cap open android
```

Then in Android Studio:
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for build to complete
3. Click "locate" in the notification to find APK

### Step 9: Test APK

#### On Emulator
```bash
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_4_API_30

# Install APK
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

#### On Physical Device
```bash
# Enable USB debugging on device
# Connect device via USB

# Verify device connection
adb devices

# Install APK
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Method 2: PWA to APK Conversion

Simpler method using PWA Builder for basic APK generation.

### Step 1: Ensure PWA is Ready

Make sure your app has:
- `manifest.json` with proper configuration
- Service worker registered
- HTTPS enabled (for production)

### Step 2: Use PWA Builder

#### Option A: PWA Builder CLI
```bash
# Install PWA Builder CLI
npm install -g @pwabuilder/cli

# Navigate to built app
cd dist/public

# Generate APK
pwa build android

# Follow prompts to configure
```

#### Option B: PWA Builder Website
1. Go to https://www.pwabuilder.com/
2. Enter your deployed app URL
3. Click "Package For Stores"
4. Select "Android"
5. Configure options:
   - App name: KINTO QA
   - Package ID: com.kinto.qa
   - Version: 1.0
6. Click "Generate Package"
7. Download APK

### Step 3: Configure PWA Manifest

Ensure `public/manifest.json` is properly configured:
```json
{
  "name": "KINTO QA Management System",
  "short_name": "KINTO QA",
  "description": "Quality Assurance and Preventive Maintenance Management",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1f2937",
  "orientation": "any",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Step 4: Build and Test

```bash
# Build for production
npm run build

# Deploy to server (must be HTTPS)
# Then use PWA Builder as described above
```

---

## Signing the APK

For production release, you must sign your APK.

### Step 1: Generate Keystore

```bash
# Navigate to android/app
cd android/app

# Generate keystore
keytool -genkey -v -keystore kinto-release-key.keystore -alias kinto -keyalg RSA -keysize 2048 -validity 10000

# Enter details when prompted:
# - Password (remember this!)
# - Your name
# - Organization
# - City/State/Country
```

**IMPORTANT**: Store this keystore file securely! You cannot update your app without it.

### Step 2: Configure Gradle for Signing

Create `android/keystore.properties`:
```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=kinto
storeFile=app/kinto-release-key.keystore
```

Update `android/app/build.gradle`:
```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

android {
    ...
    
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Build Signed APK

```bash
cd android
./gradlew assembleRelease

# Signed APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

### Step 4: Verify Signature

```bash
# Verify APK signature
keytool -printcert -jarfile app/build/outputs/apk/release/app-release.apk
```

---

## Testing

### Pre-Release Testing Checklist

- [ ] Test on Android 8.0+ devices
- [ ] Test on different screen sizes (phone, tablet)
- [ ] Test all user roles (admin, manager, operator, reviewer)
- [ ] Test offline functionality
- [ ] Test camera/photo upload
- [ ] Test PDF generation
- [ ] Test network interruption handling
- [ ] Test app updates
- [ ] Performance testing (load times, memory usage)

### Testing Tools

```bash
# Monitor device logs
adb logcat

# Take screenshot
adb shell screencap /sdcard/screen.png
adb pull /sdcard/screen.png

# Check app package
adb shell pm list packages | grep kinto

# Uninstall app
adb uninstall com.kinto.qa

# Check app size
du -sh android/app/build/outputs/apk/release/app-release.apk
```

---

## Publishing to Google Play Store

### Step 1: Create Google Play Console Account

1. Go to https://play.google.com/console
2. Pay one-time $25 registration fee
3. Complete account setup

### Step 2: Create App Listing

1. Click "Create app"
2. Fill in app details:
   - App name: KINTO QA Management System
   - Default language: English
   - App type: App
   - Category: Business / Productivity
   - Free/Paid: Free

### Step 3: Prepare Store Listing

Required assets:
- **App icon**: 512x512 PNG
- **Feature graphic**: 1024x500 PNG
- **Screenshots**: At least 2 (JPEG or PNG)
  - Phone: 16:9 or 9:16 ratio
  - Tablet: 10" or 7" screenshots
- **Short description**: Max 80 characters
- **Full description**: Max 4000 characters
- **Privacy policy URL**
- **Content rating questionnaire**

### Step 4: Upload APK/AAB

**Recommended**: Build AAB (Android App Bundle) instead of APK:
```bash
cd android
./gradlew bundleRelease

# AAB location:
# android/app/build/outputs/bundle/release/app-release.aab
```

Upload to Play Console:
1. Go to **Release** → **Production**
2. Click **Create release**
3. Upload AAB file
4. Fill in release notes
5. Click **Review release**
6. Click **Start rollout to Production**

### Step 5: Review Process

- Google review typically takes 1-7 days
- Monitor review status in Play Console
- Address any policy violations

---

## Troubleshooting

### Common Issues

#### 1. Build Fails
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleRelease
```

#### 2. SDK Not Found
```bash
# Install required SDK
sdkmanager "platforms;android-34"
sdkmanager "build-tools;34.0.0"
```

#### 3. Gradle Version Issues
```bash
# Update Gradle wrapper
cd android
./gradlew wrapper --gradle-version=8.0
```

#### 4. App Crashes on Start
```bash
# Check logcat for errors
adb logcat | grep -i error

# Common fixes:
# - Clear app data
# - Check AndroidManifest permissions
# - Verify Capacitor configuration
```

#### 5. Network Requests Fail
```bash
# Ensure cleartext traffic is allowed (development)
# Add to AndroidManifest.xml:
android:usesCleartextTraffic="true"

# For production, use HTTPS only
```

### Support Resources

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Android Developer Guide**: https://developer.android.com/guide
- **Stack Overflow**: Tag `capacitor` or `android`
- **Capacitor Community**: https://github.com/capacitor-community

---

## Appendix

### Useful Commands Reference

```bash
# Capacitor
npx cap sync                    # Sync web code and plugins
npx cap open android           # Open in Android Studio
npx cap copy android           # Copy web assets only
npx cap update android         # Update Android platform

# Android Build
./gradlew assembleDebug        # Build debug APK
./gradlew assembleRelease      # Build release APK
./gradlew bundleRelease        # Build release AAB
./gradlew clean                # Clean build
./gradlew tasks                # List available tasks

# ADB
adb devices                    # List connected devices
adb install app.apk            # Install APK
adb uninstall com.kinto.qa     # Uninstall app
adb logcat                     # View device logs
adb shell                      # Access device shell
```

### File Structure

```
kinto-qa/
├── android/                   # Android project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── res/          # Resources (icons, etc.)
│   │   │   └── java/         # Java/Kotlin code
│   │   └── build.gradle      # App-level Gradle
│   ├── gradle/
│   ├── build.gradle          # Project-level Gradle
│   └── gradlew               # Gradle wrapper
├── capacitor.config.ts       # Capacitor configuration
├── dist/public/              # Built web app
└── package.json
```

---

**Document Version**: 1.0  
**Last Updated**: November 4, 2025  
**For**: KINTO QA Management System v1.0

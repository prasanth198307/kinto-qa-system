# KINTO QA - Android APK Deployment Guide

## Overview

The KINTO QA Management System can be deployed on Android devices in two ways:
1. **Progressive Web App (PWA)** - Quick deployment, no app store needed
2. **Native Android App** - Full native app built with Capacitor

## Option 1: PWA Deployment (Recommended for Quick Setup)

### Prerequisites
- Android device with Chrome browser
- Access to KINTO QA web URL (e.g., https://your-domain.com)

### Installation Steps

1. **Open the Application**
   - Launch Chrome browser on Android device
   - Navigate to your KINTO QA URL
   - Example: `https://kinto-qa.your-company.com`

2. **Install as App**
   - Tap the menu (⋮) in Chrome
   - Select "Add to Home screen" or "Install app"
   - Name it "KINTO QA"
   - Tap "Add" or "Install"

3. **Launch the App**
   - Find "KINTO QA" icon on home screen
   - Tap to open as standalone app

### PWA Features
- ✅ Offline capability
- ✅ Push notifications
- ✅ Camera access for QR codes
- ✅ No app store approval needed
- ✅ Instant updates
- ✅ Works on any Android 5.0+

---

## Option 2: Native APK Build (Advanced)

### Prerequisites
- Node.js 18+ installed
- Android Studio installed
- JDK 17+ installed
- Project source code access

### Step 1: Setup Project

```bash
# Navigate to project directory
cd kinto-qa

# Install dependencies
npm install

# Add Capacitor for Android
npm install @capacitor/core @capacitor/cli @capacitor/android
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
    androidScheme: 'https',
    hostname: 'kintoqa.local'
  },
  android: {
    buildOptions: {
      keystorePath: './android-signing-key.keystore',
      keystoreAlias: 'kinto-qa',
    }
  }
};

export default config;
```

### Step 3: Build Web Assets

```bash
# Build production version
npm run build

# Copy to Android platform
npx cap add android
npx cap copy android
npx cap sync android
```

### Step 4: Configure Android Manifest

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    
    <application
        android:label="KINTO QA"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/AppTheme">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:screenOrientation="portrait">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### Step 5: Generate Signing Key

```bash
# Create keystore
keytool -genkey -v -keystore android-signing-key.keystore \
  -alias kinto-qa -keyalg RSA -keysize 2048 -validity 10000

# Save keystore password securely!
```

### Step 6: Build APK

#### Debug Build (for testing)
```bash
# Open in Android Studio
npx cap open android

# Or build via command line
cd android
./gradlew assembleDebug

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

#### Release Build (for production)
```bash
cd android

# Edit gradle.properties and add:
# KINTO_RELEASE_STORE_FILE=../android-signing-key.keystore
# KINTO_RELEASE_STORE_PASSWORD=your_password
# KINTO_RELEASE_KEY_ALIAS=kinto-qa
# KINTO_RELEASE_KEY_PASSWORD=your_password

# Build release APK
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

### Step 7: Install APK on Device

#### Method 1: USB Installation
```bash
# Enable USB debugging on Android device
# Connect device via USB
adb install android/app/build/outputs/apk/release/app-release.apk
```

#### Method 2: Download and Install
1. Upload APK to file server or cloud storage
2. Download APK on Android device
3. Open APK file
4. Allow "Install from Unknown Sources" if prompted
5. Tap "Install"

### Step 8: Distribution Options

#### Option A: Direct Distribution
- Upload APK to company file server
- Share download link with employees
- Users download and install manually

#### Option B: Google Play Store
1. Create Google Play Developer account ($25 one-time)
2. Create app listing in Play Console
3. Upload signed APK
4. Complete store listing (descriptions, screenshots)
5. Submit for review
6. Publish after approval

#### Option C: Private App Distribution
- Use Google Play's managed publishing
- Distribute to specific email addresses
- Requires Google Workspace account

---

## Configuration

### Environment Variables

Create `.env.production` in web project:

```env
# API Configuration
VITE_API_URL=https://api.your-company.com

# App Configuration
VITE_APP_NAME=KINTO QA
VITE_APP_VERSION=1.0.0
```

### App Icons

Replace icons in `android/app/src/main/res/`:
- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

### Splash Screen

Edit `android/app/src/main/res/values/styles.xml`:

```xml
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:windowBackground">@drawable/splash</item>
    </style>
</resources>
```

---

## Testing

### Pre-Release Checklist

- [ ] Test on multiple Android versions (8, 9, 10, 11, 12+)
- [ ] Test on different screen sizes
- [ ] Verify offline functionality
- [ ] Test camera permissions
- [ ] Check network connectivity handling
- [ ] Verify all forms work correctly
- [ ] Test data persistence
- [ ] Check app icon and splash screen
- [ ] Verify notifications work

### Testing Tools

```bash
# Check APK info
aapt dump badging app-release.apk

# Install and test
adb install -r app-release.apk
adb logcat | grep KINTO
```

---

## Troubleshooting

### Build Errors

**Error: "SDK location not found"**
```bash
# Create local.properties in android folder
echo "sdk.dir=/path/to/Android/Sdk" > android/local.properties
```

**Error: "Gradle sync failed"**
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew build
```

### Runtime Issues

**App crashes on startup**
- Check AndroidManifest.xml permissions
- Verify API URL is accessible
- Check logcat for errors: `adb logcat`

**Camera not working**
- Add CAMERA permission to AndroidManifest.xml
- Request permission at runtime

**Network requests failing**
- Add `android:usesCleartextTraffic="true"` for HTTP
- Or use HTTPS for all API calls

---

## Updates and Maintenance

### Updating the App

1. Increment version in `capacitor.config.ts`
2. Build new version: `npm run build`
3. Sync to Android: `npx cap sync android`
4. Build new APK
5. Distribute updated APK

### Over-the-Air Updates

For PWA mode, users automatically get updates when you deploy new web version.

For native app, consider using:
- Capacitor Live Updates
- CodePush
- Or manual APK distribution

---

## Security Considerations

### APK Signing
- ✅ Always sign release APKs
- ✅ Store keystore securely (backup!)
- ✅ Use strong passwords
- ✅ Never commit keystore to git

### API Security
- ✅ Use HTTPS for all API calls
- ✅ Implement certificate pinning
- ✅ Store tokens securely (Capacitor SecureStorage)
- ✅ Implement session timeout

### Data Protection
- ✅ Enable ProGuard for code obfuscation
- ✅ Encrypt sensitive local data
- ✅ Clear cache on logout
- ✅ Implement biometric authentication

---

## Support

For technical assistance:
- Check Android Studio build logs
- Review logcat output
- Consult Capacitor documentation
- Contact development team

**Version:** 1.0.0  
**Last Updated:** November 2025

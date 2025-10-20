# Mobile Build Instructions

This document provides step-by-step instructions for building and running the U.S. Navy Dive Manual as a native mobile application using Capacitor.

## Prerequisites

### For iOS Development
- macOS with Xcode 14 or later installed
- Apple Developer account (for device deployment)
- CocoaPods installed (`sudo gem install cocoapods`)

### For Android Development
- Android Studio installed
- Android SDK and build tools configured
- Java Development Kit (JDK) 11 or later

### Common Requirements
- Node.js 18+ and npm installed
- Git installed
- GitHub account (to export and clone the project)

---

## Initial Setup

### Step 1: Export Project to GitHub
1. In the Lovable editor, click the **GitHub** button (top right)
2. Click **Export to GitHub** or **Connect to GitHub**
3. Authorize the Lovable GitHub App
4. Select your GitHub account/organization
5. Click **Create Repository** to generate a new repo with your code

### Step 2: Clone the Repository Locally
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### Step 3: Install Dependencies
```bash
npm install
```

This will install all web dependencies, including Capacitor core packages.

---

## Adding Mobile Platforms

### Add iOS Platform
```bash
npx cap add ios
```

This creates the `ios/` directory with the native Xcode project.

### Add Android Platform
```bash
npx cap add android
```

This creates the `android/` directory with the native Android Studio project.

### Update Native Dependencies
After adding platforms, update native dependencies:

```bash
# For iOS
npx cap update ios

# For Android
npx cap update android
```

---

## Building the Web App

Before syncing to native platforms, build the web application:

```bash
npm run build
```

This creates the `dist/` folder with optimized production assets.

---

## Syncing Web Code to Native Projects

After building, sync the web assets to native platforms:

```bash
npx cap sync
```

This command:
- Copies web assets from `dist/` to native projects
- Updates native dependencies
- Configures plugins

Run `npx cap sync` whenever you:
- Make changes to web code and rebuild
- Update Capacitor plugins
- Change `capacitor.config.ts`

---

## Running on iOS

### Open in Xcode
```bash
npx cap open ios
```

Or use the npm script:
```bash
npm run cap:ios
```

### Build and Run
1. In Xcode, select your target device (simulator or physical device)
2. Click the **Play** button or press `Cmd + R`
3. For physical devices:
   - Connect your iPhone/iPad via USB
   - Trust the computer on your device
   - Select your device from the device dropdown
   - You may need to configure code signing in Xcode (Signing & Capabilities tab)

### Troubleshooting iOS
- **Code Signing Issues**: Go to Signing & Capabilities → Select your development team
- **Pod Install Errors**: Run `pod install --repo-update` in the `ios/App` directory
- **Build Failures**: Clean build folder (Product → Clean Build Folder) and rebuild

---

## Running on Android

### Open in Android Studio
```bash
npx cap open android
```

Or use the npm script:
```bash
npm run cap:android
```

### Build and Run
1. In Android Studio, wait for Gradle sync to complete
2. Select your target device (emulator or physical device)
3. Click the **Run** button (green play icon) or press `Shift + F10`
4. For physical devices:
   - Enable Developer Options on your Android device
   - Enable USB Debugging
   - Connect via USB
   - Allow USB debugging when prompted

### Troubleshooting Android
- **Gradle Sync Issues**: File → Invalidate Caches / Restart
- **SDK Not Found**: File → Project Structure → SDK Location → Set paths
- **Build Errors**: Clean project (Build → Clean Project) and rebuild

---

## Development Workflow

### Hot Reload During Development

The app is configured to use **live reload** from the Lovable sandbox during development:

```typescript
// capacitor.config.ts
server: {
  url: 'https://dea7b52a-c31e-4211-9a3e-c2bb6590e433.lovableproject.com?forceHideBadge=true',
  cleartext: true
}
```

This means:
1. Make changes in Lovable or your local code editor
2. The mobile app automatically reloads with changes
3. No need to rebuild and redeploy constantly

**For production builds**, remove or comment out the `server` section in `capacitor.config.ts`.

### Local Development Workflow
1. Make changes to web code
2. Test in browser: `npm run dev`
3. Build for mobile: `npm run build`
4. Sync to native: `npx cap sync`
5. Run on device/emulator

---

## Production Builds

### Disable Development Server
Before creating production builds, update `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.dea7b52ac31e42119a3ec2bb6590e433',
  appName: 'divemanual',
  webDir: 'dist',
  // Remove or comment out server section for production
  // server: { ... }
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#003B5C',
      showSpinner: false
    }
  }
};
```

### iOS Production Build
1. Open project in Xcode: `npx cap open ios`
2. Select **Any iOS Device** or **Generic iOS Device** as target
3. Product → Archive
4. Follow Xcode's distribution workflow to:
   - Upload to App Store Connect
   - Export for Ad Hoc distribution
   - Export for Enterprise distribution

### Android Production Build
1. Open project in Android Studio: `npx cap open android`
2. Build → Generate Signed Bundle / APK
3. Follow the wizard to:
   - Create or select a keystore
   - Build release APK or AAB (App Bundle)
4. Upload to Google Play Console

---

## Updating the App

### After Making Changes in Lovable
1. Pull latest changes from GitHub:
   ```bash
   git pull origin main
   ```

2. Install any new dependencies:
   ```bash
   npm install
   ```

3. Build web app:
   ```bash
   npm run build
   ```

4. Sync to native platforms:
   ```bash
   npx cap sync
   ```

5. Run on device to test

---

## Common Commands Reference

```bash
# Install dependencies
npm install

# Build web app
npm run build

# Sync web assets to native platforms
npx cap sync

# Add platforms (one-time)
npx cap add ios
npx cap add android

# Update native dependencies
npx cap update ios
npx cap update android

# Open in native IDEs
npx cap open ios
npx cap open android

# Run on device (requires native IDE setup)
npm run cap:ios
npm run cap:android

# Combined build and sync
npm run build:mobile
```

---

## App Configuration

### App Identity
Configured in `capacitor.config.ts`:
- **App ID**: `app.lovable.dea7b52ac31e42119a3ec2bb6590e433`
- **App Name**: `divemanual`

### Splash Screen
- **Background Color**: Navy blue `#003B5C`
- **Duration**: 2000ms (2 seconds)
- **Spinner**: Disabled

### Icons and Assets
- App icons are sourced from `public/` directory
- Use the diving helmet logo provided
- Icons are automatically copied during `npx cap sync`

---

## Getting Help

### Resources
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Lovable Documentation](https://docs.lovable.dev)
- [iOS Development Guide](https://developer.apple.com/documentation/)
- [Android Development Guide](https://developer.android.com/docs)

### Common Issues
- **Changes not reflecting**: Run `npm run build && npx cap sync`
- **Native plugin errors**: Run `npx cap update ios` or `npx cap update android`
- **Build failures**: Clean native projects and rebuild
- **Hot reload not working**: Check `server.url` in `capacitor.config.ts`

---

## Next Steps

After successful mobile setup:
1. Test authentication flows on mobile
2. Test PDF viewing and navigation
3. Verify search and flashcards functionality
4. Test offline capabilities (PWA service worker)
5. Optimize performance for mobile devices
6. Configure push notifications (if needed)
7. Set up app store listings and screenshots
8. Submit to App Store and Google Play

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**Maintained by**: Navy Dive Manual Team

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.dea7b52ac31e42119a3ec2bb6590e433',
  appName: 'divemanual',
  webDir: 'dist',
  server: {
    url: 'https://dea7b52a-c31e-4211-9a3e-c2bb6590e433.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#003B5C',
      showSpinner: false
    }
  }
};

export default config;

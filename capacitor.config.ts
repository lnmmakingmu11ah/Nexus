import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexus.lifecompanion',
  appName: 'NEXUS',
  webDir: 'dist',
  android: {
    backgroundColor: '#09090b',
    allowMixedContent: true,
  },
  server: {
    // http avoids mixed-content blocks when calling http://127.0.0.1:3000 from the WebView
    androidScheme: 'http',
    cleartext: true,
  },
  plugins: {
    // Route fetch() through native Android networking (bypasses WebView cleartext/CORS quirks)
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      backgroundColor: '#09090b',
      showSpinner: false,
      launchAutoHide: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#09090b',
    },
  },
};

export default config;

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Capacitor} from '@capacitor/core';
import {StatusBar, Style} from '@capacitor/status-bar';
import {SplashScreen} from '@capacitor/splash-screen';
import App from './App.tsx';
import './index.css';
import {initSecureStorage} from './utils/storage';

async function bootstrapNativeShell() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // Draw edge-to-edge; our fixed top bar owns the safe-area padding
    await StatusBar.setOverlaysWebView({overlay: true});
    await StatusBar.setStyle({style: Style.Dark});
    await StatusBar.setBackgroundColor({color: '#09090b'});
  } catch {
    // StatusBar plugin may be unavailable in browser preview
  }
  try {
    await SplashScreen.hide();
  } catch {
    // ignore
  }
}

async function bootstrapApp() {
  await initSecureStorage().catch((err) => {
    console.error('Secure storage initialization failed:', err);
  });
  await bootstrapNativeShell();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrapApp();

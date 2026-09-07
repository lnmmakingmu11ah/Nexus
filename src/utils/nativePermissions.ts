import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Requests location permission and gets current coordinates using Capacitor Geolocation
 * on native devices, or navigator.geolocation on browser.
 */
export async function requestAndGetDeviceLocation(): Promise<{
  success: boolean;
  coords?: LocationResult;
  error?: string;
}> {
  try {
    if (Capacitor.isNativePlatform()) {
      const permStatus = await Geolocation.requestPermissions();
      if (permStatus.location === 'denied') {
        return {
          success: false,
          error: 'Location permission was denied. Please enable location in your device Settings.',
        };
      }
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12000,
      });
      return {
        success: true,
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        },
      };
    }

    // Web Fallback
    if (!navigator.geolocation) {
      return { success: false, error: 'Geolocation is not supported by your device.' };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            success: true,
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            },
          });
        },
        (err) => {
          resolve({
            success: false,
            error: err.message || 'Location permission was blocked or timed out.',
          });
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    });
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to retrieve device location.',
    };
  }
}

/**
 * Checks if notification permission is granted.
 */
export async function checkNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }

  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'prompt';
  }

  return 'denied';
}

/**
 * Requests native or browser notification permission.
 */
export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  if (typeof Notification !== 'undefined') {
    try {
      const res = await Notification.requestPermission();
      return res === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  return 'denied';
}

/**
 * Shows an immediate or scheduled local notification with optional deep-link data.
 */
export async function sendLocalNotification(params: {
  title: string;
  body: string;
  id?: number;
  scheduleAt?: Date;
  /** Deep-link payload: which tab to open and (optionally) which goalId to highlight */
  data?: { tab: string; goalId?: string };
}): Promise<void> {
  const notifId = params.id || Math.floor(Math.random() * 1000000);

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: params.title,
            body: params.body,
            schedule: params.scheduleAt ? { at: params.scheduleAt } : undefined,
            sound: 'default',
            extra: params.data || {},
          },
        ],
      });
      return;
    } catch (e) {
      console.warn('Native LocalNotification schedule failed:', e);
    }
  }

  // Web Fallback
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      const notif = new Notification(params.title, {
        body: params.body,
        icon: '/icon-192.png',
        data: params.data,
      });
      if (params.data) {
        notif.onclick = () => {
          window.focus();
          // Custom event so App.tsx can navigate
          window.dispatchEvent(
            new CustomEvent('nexus-notification-tap', { detail: params.data })
          );
        };
      }
    } catch (e) {
      console.warn('Web Notification constructor failed:', e);
    }
  }
}

export type NotificationTapData = { tab: string; goalId?: string };
type TapCallback = (data: NotificationTapData) => void;

/**
 * Register a listener that fires when the user taps a NEXUS notification.
 * On native: uses Capacitor LocalNotifications.addListener.
 * On web: listens to the custom 'nexus-notification-tap' event.
 * Returns a cleanup function.
 */
export function registerNotificationActionListener(cb: TapCallback): () => void {
  try {
    if (Capacitor.isNativePlatform()) {
      let handle: any = null;
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        try {
          const extra = (action?.notification as any)?.extra as NotificationTapData | undefined;
          if (extra?.tab) cb(extra);
        } catch (e) {
          console.warn('Error in notification action callback:', e);
        }
      }).then((h) => {
        handle = h;
      }).catch((e) => {
        console.warn('LocalNotifications.addListener failed:', e);
      });

      return () => {
        try {
          handle?.remove?.();
        } catch {}
      };
    }

    // Web fallback
    const handler = (e: Event) => {
      try {
        const data = (e as CustomEvent<NotificationTapData>).detail;
        if (data?.tab) cb(data);
      } catch (e) {
        console.warn('Error in web notification tap handler:', e);
      }
    };
    window.addEventListener('nexus-notification-tap', handler);
    return () => {
      try {
        window.removeEventListener('nexus-notification-tap', handler);
      } catch {}
    };
  } catch (err) {
    console.warn('registerNotificationActionListener threw:', err);
    return () => {};
  }
}


/**
 * Haptic feedback utility for mobile devices and vibration-capable hardware.
 * Uses Capacitor Haptics on native Android/iOS, falls back to navigator.vibrate.
 */
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const triggerHapticFeedback = async (
  type: 'success' | 'light' | 'medium' | 'heavy' = 'success'
) => {
  if (Capacitor.isNativePlatform()) {
    try {
      if (type === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (type === 'light') {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (type === 'medium') {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (type === 'heavy') {
        await Haptics.notification({ type: NotificationType.Warning });
      }
      return;
    } catch {
      // fall through to web vibration
    }
  }

  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      if (type === 'success') {
        navigator.vibrate([20, 30, 40]);
      } else if (type === 'light') {
        navigator.vibrate(12);
      } else if (type === 'medium') {
        navigator.vibrate(25);
      } else if (type === 'heavy') {
        navigator.vibrate([30, 40, 50, 40, 60]);
      }
    } catch (e) {
      console.debug('Haptic feedback unavailable or blocked:', e);
    }
  }
};

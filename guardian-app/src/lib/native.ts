/**
 * Bridge to the Android build.
 *
 * The same React code runs in three places — a browser, an installed PWA and
 * the APK — so every call here degrades to the web behaviour when the native
 * layer is absent. Only the APK can alarm through silent mode or wake the
 * screen from the lock screen; everywhere else `native` is false and the UI
 * says so instead of pretending.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeCapabilities {
  native: boolean;
  alarmThroughSilent: boolean;
  fullScreenOverLock: boolean;
  vibration: boolean;
  backgroundWatch: boolean;
  batteryExempt: boolean;
}

interface GuardianPlugin {
  startWatch(o: { token: string; apiBase: string; motherName: string }): Promise<void>;
  stopWatch(): Promise<void>;
  startAlarm(): Promise<void>;
  stopAlarm(): Promise<void>;
  requestBatteryExemption(): Promise<{ exempt: boolean }>;
  capabilities(): Promise<NativeCapabilities>;
}

const plugin = registerPlugin<GuardianPlugin>('Guardian');

export const isNative = () => Capacitor.isNativePlatform();

/** Hand the pairing to the background watcher so it keeps working when closed. */
export async function startNativeWatch(token: string, apiBase: string, motherName: string) {
  if (!isNative()) return;
  try {
    await plugin.startWatch({ token, apiBase, motherName });
  } catch {
    /* the in-app poll still runs */
  }
}

export async function nativeAlarmOn() {
  if (!isNative()) return false;
  try { await plugin.startAlarm(); return true; } catch { return false; }
}

export async function nativeAlarmOff() {
  if (!isNative()) return;
  try { await plugin.stopAlarm(); } catch { /* ignore */ }
}

export async function askBatteryExemption() {
  if (!isNative()) return false;
  try { return (await plugin.requestBatteryExemption()).exempt; } catch { return false; }
}

export async function nativeCapabilities(): Promise<NativeCapabilities | null> {
  if (!isNative()) return null;
  try { return await plugin.capabilities(); } catch { return null; }
}

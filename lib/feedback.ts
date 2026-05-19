import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

let pingSound: Audio.Sound | null = null;
let audioModeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  try {
    await Audio.setAudioModeAsync({
      // Plays even when the iOS silent switch is on — required for "loud" alerts.
      playsInSilentModeIOS: true,
      // Allow brief mixing rather than stopping music apps entirely.
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });
    audioModeReady = true;
  } catch {
    // If audio mode set fails, we'll still try to play; the platform default may work.
    audioModeReady = true;
  }
}

async function ensureSound(): Promise<Audio.Sound | null> {
  if (pingSound) return pingSound;
  try {
    await ensureAudioMode();
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/ping.wav'),
      { volume: 1.0 },
    );
    pingSound = sound;
    return sound;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[feedback] sound load failed:', e);
    return null;
  }
}

export async function playNotifPing(): Promise<void> {
  const sound = await ensureSound();
  if (!sound) return;
  try {
    // Rewind so consecutive notifs don't queue or stutter.
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[feedback] sound play failed:', e);
  }
}

export function heavyVibrate(): void {
  if (Platform.OS === 'ios') {
    // The strongest standard iOS haptic (BOOM-pause-BOOM-pause-BOOM).
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    // Stack two heavy impacts on top so it really lands.
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 140);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 280);
  } else {
    // Android: long sustained pattern. [pause, vibrate, pause, vibrate, ...]
    Vibration.vibrate([0, 450, 90, 450, 90, 450]);
  }
}

/** Fire the loud ping + heavy haptic. Called from showNotif on every banner. */
export function notify(): void {
  // Sound and haptic in parallel — no need to await the sound.
  void playNotifPing();
  heavyVibrate();
}

import { toast } from 'sonner';

export const playNotificationSound = (isAlert = false) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Resume context if it was suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const playTone = (time: number, freq: number, duration = 0.25, type: OscillatorType = 'sine', volume = 0.25) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration);
    };

    if (isAlert) {
      // Urgent alert sound (3 loud alert beeps)
      playTone(ctx.currentTime, 880, 0.2, 'square', 0.25);
      playTone(ctx.currentTime + 0.22, 880, 0.2, 'square', 0.25);
      playTone(ctx.currentTime + 0.44, 880, 0.3, 'square', 0.25);
    } else {
      // Pleasant ring chime (3 ascending melodic tones: C5 -> E5 -> G5)
      playTone(ctx.currentTime, 523.25, 0.2, 'triangle', 0.25); // C5
      playTone(ctx.currentTime + 0.18, 659.25, 0.2, 'triangle', 0.25); // E5
      playTone(ctx.currentTime + 0.36, 783.99, 0.35, 'sine', 0.3);     // G5
    }
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export const triggerVibration = (pattern = [300, 100, 300, 100, 300]) => {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.error("Vibration failed", e);
    }
  }
};

export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch (e) {
      console.error("Notification permission error", e);
    }
  }
};

export const notifyUser = (message: string, isAlert = false) => {
  playNotificationSound(isAlert);
  triggerVibration(isAlert ? [400, 100, 400, 100, 400] : [300, 100, 300, 100, 300]);
  
  if (isAlert) {
    toast.error(message, { duration: 7000, icon: '⚠️' });
  } else {
    toast.success(message, { duration: 5000, icon: '🔔' });
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(isAlert ? 'تنبيه هامة' : 'تنبيه تشغيل جديد', {
        body: message,
        icon: '/pwa-192x192.png'
      });
    } catch (e) {
      console.error("Native notification failed", e);
    }
  }
};


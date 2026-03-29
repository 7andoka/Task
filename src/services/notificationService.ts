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
    
    const playBeep = (time: number, freq: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.3);
    };

    if (isAlert) {
      // Urgent sound (3 quick beeps)
      playBeep(ctx.currentTime, 440, 'square');
      playBeep(ctx.currentTime + 0.15, 440, 'square');
      playBeep(ctx.currentTime + 0.3, 440, 'square');
    } else {
      // Pleasant chime (2 ascending beeps)
      playBeep(ctx.currentTime, 523.25, 'sine'); // C5
      playBeep(ctx.currentTime + 0.15, 659.25, 'sine'); // E5
    }
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export const triggerVibration = (pattern = [200, 100, 200]) => {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.error("Vibration failed", e);
    }
  }
};

export const notifyUser = (message: string, isAlert = false) => {
  playNotificationSound(isAlert);
  triggerVibration(isAlert ? [300, 100, 300, 100, 300] : [200, 100, 200]);
  
  if (isAlert) {
    toast.error(message, { duration: 7000, icon: '⚠️' });
  } else {
    toast.success(message, { duration: 5000, icon: '🔔' });
  }
};

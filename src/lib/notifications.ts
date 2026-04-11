/**
 * وظيفة مساعدة لتشغيل الإشعارات، الاهتزاز، والصوت
 */
export async function triggerAlert(title: string, body: string, soundUrl?: string) {
  // 1. طلب إذن الإشعارات
  if (Notification.permission !== 'granted') {
    await Notification.requestPermission();
  }

  // 2. إظهار الإشعار إذا تم منح الإذن
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  }

  // 3. الاهتزاز (يعمل على أجهزة الموبايل)
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]); // نمط اهتزاز
  }

  // 4. تشغيل الصوت
  if (soundUrl) {
    const audio = new Audio(soundUrl);
    audio.play().catch(e => console.error("Error playing sound:", e));
  }
}

import React from 'react';
import { motion } from 'motion/react';
import { Bell, Save, CheckCircle2, Download } from 'lucide-react';
import { translations } from '../i18n';
import { Language, UserProfile, NotificationPreferences } from '../types';
import { storageService } from '../services/storageService';

interface SettingsProps {
  lang: Language;
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

export default function Settings({ lang, user, setUser }: SettingsProps) {
  const t = translations[lang];
  
  const defaultPrefs: NotificationPreferences = {
    newAssignments: true,
    deadlineReminders: true,
    statusChanges: true
  };

  const [prefs, setPrefs] = React.useState<NotificationPreferences>(
    user.notificationPreferences || defaultPrefs
  );
  
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleSave = async () => {
    const updatedUser = { ...user, notificationPreferences: prefs };
    
    // Update directly in firestore
    await storageService.saveUser(updatedUser);
    
    // Update current user state
    setUser(updatedUser);
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Bell size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t.notificationSettings}</h2>
            <p className="text-sm text-zinc-500">{t.role}: {user.role}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="font-semibold">{t.newAssignments}</h3>
              <p className="text-xs text-zinc-500 mt-1">Receive notifications when a new task is assigned to you</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={prefs.newAssignments}
                onChange={(e) => setPrefs({...prefs, newAssignments: e.target.checked})}
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="font-semibold">{t.deadlineReminders}</h3>
              <p className="text-xs text-zinc-500 mt-1">Get reminded before a task deadline approaches</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={prefs.deadlineReminders}
                onChange={(e) => setPrefs({...prefs, deadlineReminders: e.target.checked})}
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="font-semibold">{t.statusChanges}</h3>
              <p className="text-xs text-zinc-500 mt-1">Be notified when tasks you manage change status</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={prefs.statusChanges}
                onChange={(e) => setPrefs({...prefs, statusChanges: e.target.checked})}
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        <div className="mt-8 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">{lang === 'ar' ? 'تفعيل التنبيهات على المتصفح' : 'Enable Browser Notifications'}</h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">{lang === 'ar' ? 'مطلوب لتشغيل الرنة والاهتزاز عند التنبيهات' : 'Required for sound and vibration alerts'}</p>
          </div>
          <button 
            onClick={() => Notification.requestPermission()}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
          >
            {lang === 'ar' ? 'تفعيل الآن' : 'Enable Now'}
          </button>
        </div>

        {deferredPrompt && (
          <div className="mt-6 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{lang === 'ar' ? 'تثبيت التطبيق على هاتفك' : 'Install App on your Phone'}</h3>
              <p className="text-xs text-zinc-500 mt-1">{lang === 'ar' ? 'استخدم التطبيق كأنه تطبيق أصلي مع وصول أسرع' : 'Use the app as a native application with faster access'}</p>
            </div>
            <button 
              onClick={handleInstall}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg"
            >
              <Download size={18} />
              <span>{lang === 'ar' ? 'تثبيت' : 'Install'}</span>
            </button>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: showSuccess ? 1 : 0 }}
            className="flex items-center gap-2 text-emerald-500 text-sm font-medium"
          >
            <CheckCircle2 size={18} />
            <span>{t.settingsSaved}</span>
          </motion.div>
          
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Save size={20} />
            <span>{t.saveSettings}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

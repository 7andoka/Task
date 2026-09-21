import React from 'react';
import { motion } from 'motion/react';
import { 
  Bell, Save, CheckCircle2, Download, Moon, Sun, Palette, 
  LayoutGrid, Check, BarChart3, Scale, Truck, Sprout, FileText, 
  Layers, Snowflake, Package, ClipboardList, Database, Boxes, 
  CheckSquare, Users, Settings as SettingsIcon, Shield 
} from 'lucide-react';
import { translations } from '../i18n';
import { Language, UserProfile, NotificationPreferences } from '../types';
import { storageService } from '../services/storageService';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsProps {
  lang: Language;
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

export default function Settings({ lang, user, setUser }: SettingsProps) {
  const t = translations[lang];
  const { theme, isDark, setTheme } = useTheme();
  
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

  const allNavPages = React.useMemo(() => [
    { id: 'kpis', label: lang === 'ar' ? 'لوحة المؤشرات والقيادة' : 'Executive KPIs Dashboard', icon: BarChart3, roles: ['Admin', 'Warehouse Manager', 'Senior Manager', 'Manager'] },
    { id: 'scaleReports', label: t.scaleReports, icon: Scale },
    { id: 'supplyTracking', label: t.supplyTracking, icon: Truck },
    { id: 'freshSupply', label: t.freshSupply, icon: Sprout },
    { id: 'purchaseOrders', label: t.purchaseOrders, icon: FileText },
    { id: 'rawMaterialsInventory', label: t.rawMaterialsInventory, icon: Layers },
    { id: 'coldStorage', label: t.coldStorage, icon: Snowflake },
    { id: 'rawMaterial', label: t.rawMaterial, icon: Package },
    { id: 'thirdPartyProcessing', label: t.thirdPartyProcessing, icon: ClipboardList },
    { id: 'oliveStock', label: t.oliveStock, icon: Database },
    { id: 'finishedSemiFinished', label: t.finishedSemiFinished, icon: Boxes },
    { id: 'tasks', label: t.tasks, icon: CheckSquare },
    { id: 'team', label: t.team, icon: Users, roles: ['Warehouse Manager', 'Department Head', 'Supervisor', 'Admin', 'Senior Manager', 'Manager', 'Team Leader'] },
    { id: 'users', label: t.userManagement, icon: Users, roles: ['Warehouse Manager', 'Admin'] },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ].filter(item => {
    const userRoles = user.roles || (user.role ? [user.role] : []);
    if (item.roles) {
      return item.roles.some((r: any) => userRoles.includes(r));
    }
    return true;
  }), [lang, user, t]);

  const [selectedPageIds, setSelectedPageIds] = React.useState<string[]>(() => {
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions;
    }
    return allNavPages.map(p => p.id);
  });

  const togglePageVisibility = (pageId: string) => {
    if (pageId === 'settings') return; // keep settings page accessible
    setSelectedPageIds(prev => 
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  const handleSelectAllPages = () => {
    setSelectedPageIds(allNavPages.map(p => p.id));
  };

  const handleDeselectAllPages = () => {
    setSelectedPageIds(['settings']);
  };

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
    const updatedUser = { 
      ...user, 
      notificationPreferences: prefs,
      permissions: selectedPageIds
    };
    
    // Update directly in firestore
    await storageService.saveUser(updatedUser);
    
    // Update current user state
    setUser(updatedUser);
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Navigation Customization */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <LayoutGrid size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {lang === 'ar' ? 'تخصيص القائمة والصفحات الظاهرة' : 'Customize Visible Pages'}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {lang === 'ar' 
                  ? 'اختر الصفحات التي ترغب بظهورها في القائمة الخاصة بك وإخفاء الصفحات غير المطلوبة' 
                  : 'Select which pages appear in your navigation bar and hide unused ones'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSelectAllPages}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'تحديد الكل' : 'Select All'}
            </button>
            <button
              type="button"
              onClick={handleDeselectAllPages}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-red-600 dark:text-red-400 transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'إلغاء الكل' : 'Deselect All'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allNavPages.map(page => {
            const isSelected = selectedPageIds.includes(page.id);
            const isSettings = page.id === 'settings';
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => togglePageVisibility(page.id)}
                disabled={isSettings}
                className={`flex items-center justify-between p-3.5 rounded-2xl border text-sm font-bold transition-all text-right ${
                  isSettings 
                    ? 'opacity-80 bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-not-allowed'
                    : isSelected
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs cursor-pointer'
                    : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <page.icon size={18} className={isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'} />
                  <span className="truncate">{page.label}</span>
                </div>
                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                  isSelected
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                }`}>
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme Appearance Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Palette size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              {lang === 'ar' ? 'مظهر التطبيق والثيم' : 'App Appearance & Theme'}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {lang === 'ar' ? 'التبديل الفوري بين الوضعين النهاري والليلي' : 'Switch seamlessly between light and dark modes'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dark Mode Card */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              isDark
                ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20 shadow-md'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 text-amber-300 flex items-center justify-center border border-zinc-800 shadow-sm">
                <Moon size={20} />
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-black ${
                isDark ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}>
                {isDark ? (lang === 'ar' ? 'مفعّل حالياً' : 'Active') : (lang === 'ar' ? 'اختيار' : 'Select')}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                <span>🌙 {lang === 'ar' ? 'الوضع الليلي (Dark Mode)' : 'Dark Mode'}</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {lang === 'ar' ? 'مريح للعين ومناسب لبيئات الإضاءة المنخفضة (افتراضي)' : 'Comfortable for low light and battery efficient (Default)'}
              </p>
            </div>
          </button>

          {/* Light Mode Card */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              !isDark
                ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20 shadow-md'
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm">
                <Sun size={20} />
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-black ${
                !isDark ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}>
                {!isDark ? (lang === 'ar' ? 'مفعّل حالياً' : 'Active') : (lang === 'ar' ? 'اختيار' : 'Select')}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                <span>☀️ {lang === 'ar' ? 'الوضع النهاري (Light Mode)' : 'Light Mode'}</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {lang === 'ar' ? 'واجهة بيضاء واضحة ذات تباين عالي للقراءة في النهار' : 'Crisp high-contrast layout for daytime readability'}
              </p>
            </div>
          </button>
        </div>
      </div>

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

import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckSquare, 
  Users, 
  LogOut, 
  Moon, 
  Sun, 
  Languages,
  Menu,
  X,
  Smartphone,
  Monitor,
  BarChart3,
  Settings as SettingsIcon,
  RefreshCw,
  LogIn,
  Truck,
  Snowflake,
  Package,
  Download,
  Share,
  PlusSquare
} from 'lucide-react';
import { translations } from '../i18n';
import { Language, UserProfile } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ConnectionStatus from './ConnectionStatus';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  lang: Language;
  setLang: (lang: Language) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  user: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Layout({ 
  children, 
  lang, 
  setLang, 
  isDark, 
  setIsDark, 
  user, 
  activeTab, 
  setActiveTab,
  onLogout
}: LayoutProps) {
  const [isDesktopMode, setIsDesktopMode] = React.useState(true);
  const [showInstallModal, setShowInstallModal] = React.useState(false);
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
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const t = translations[lang];
  const isRtl = lang === 'ar';

  // Detect device on mount
  React.useEffect(() => {
    const checkDevice = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024;
      setIsDesktopMode(!isMobile);
    };
    checkDevice();
  }, []);

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: BarChart3, roles: ['Warehouse Manager', 'Department Head', 'Admin', 'Manager'] },
    { id: 'supplyTracking', label: t.supplyTracking, icon: Truck },
    { id: 'coldStorage', label: t.coldStorage, icon: Snowflake },
    { id: 'rawMaterial', label: t.rawMaterial, icon: Package },
    { id: 'tasks', label: t.tasks, icon: CheckSquare },
    { id: 'team', label: t.team, icon: Users, roles: ['Warehouse Manager', 'Department Head', 'Supervisor', 'Admin', 'Senior Manager', 'Manager', 'Team Leader'] },
    { id: 'users', label: t.userManagement, icon: Users, roles: ['Warehouse Manager', 'Admin'] },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className={cn(
      "min-h-screen flex transition-colors duration-300",
      isDark ? "dark bg-black text-zinc-50" : "bg-white text-zinc-900",
      isRtl ? "font-sans text-right" : "font-sans text-left",
      !isDesktopMode && "flex-col"
    )} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-4 h-14 bg-zinc-100/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black tracking-tighter text-emerald-500 shrink-0">Rich Land</h1>
          
          <div className={cn(
            "flex items-center gap-1 shrink-0",
            !isDesktopMode && "hidden"
          )}>
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={cn(
                  "relative p-2.5 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
                  activeTab === item.id
                    ? "text-emerald-500 bg-emerald-500/5"
                    : "hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                )}
              >
                <item.icon size={20} />
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="nav-indicator"
                    className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {user && (
            <div className="hidden md:flex flex-col items-end">
              <p className="text-[10px] font-bold leading-none">{user.displayName}</p>
              <p className="text-[8px] text-zinc-500 leading-none mt-1 uppercase tracking-wider">{translations[lang][user.role.charAt(0).toLowerCase() + user.role.slice(1).replace(' ', '') as keyof typeof translations['en']] || user.role}</p>
            </div>
          )}
          <button 
            onClick={handleInstall}
            title={lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
            className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            <span className="hidden sm:inline text-xs font-bold">{lang === 'ar' ? 'تثبيت' : 'Install'}</span>
          </button>
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
          <ConnectionStatus />
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('refresh-data'))}
            title={lang === 'ar' ? 'تحديث البيانات' : 'Refresh Data'}
            className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={() => setIsDesktopMode(!isDesktopMode)}
            title={isDesktopMode ? (lang === 'ar' ? 'وضع الهاتف' : 'Mobile Mode') : (lang === 'ar' ? 'وضع الكمبيوتر' : 'Desktop Mode')}
            className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
          >
            {isDesktopMode ? <Smartphone size={18} /> : <Monitor size={18} />}
          </button>
          {user && (
            <button
              onClick={onLogout}
              className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Navigation (Mobile) */}
      {!isDesktopMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-zinc-100/80 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 backdrop-blur-md flex items-center justify-around px-4">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 p-2 transition-all duration-200",
                activeTab === item.id ? "text-emerald-500" : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-bold">{item.label}</span>
              {activeTab === item.id && (
                <motion.div 
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-2 w-8 h-1 bg-emerald-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 min-h-screen pt-14 w-full",
        !isDesktopMode && "pb-16"
      )}>
        <div className={cn(
          "p-4 md:p-6",
          !isDesktopMode && "max-w-md mx-auto"
        )}>
          {children}
        </div>
      </main>

      {/* Install Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowInstallModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</h3>
              <button onClick={() => setShowInstallModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <Smartphone size={18} className="text-emerald-500" />
                  {lang === 'ar' ? 'لمستخدمي آيفون (Safari)' : 'For iPhone Users (Safari)'}
                </h4>
                <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 list-decimal list-inside">
                  <li>{lang === 'ar' ? 'اضغط على زر "مشاركة" (Share)' : 'Tap the "Share" button'} <Share size={14} className="inline mx-1" /></li>
                  <li>{lang === 'ar' ? 'اختر "إضافة إلى الشاشة الرئيسية"' : 'Select "Add to Home Screen"'} <PlusSquare size={14} className="inline mx-1" /></li>
                  <li>{lang === 'ar' ? 'اضغط على "إضافة" (Add)' : 'Tap "Add" at the top right'}</li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <Smartphone size={18} className="text-blue-500" />
                  {lang === 'ar' ? 'لمستخدمي أندرويد (Chrome)' : 'For Android Users (Chrome)'}
                </h4>
                <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 list-decimal list-inside">
                  <li>{lang === 'ar' ? 'اضغط على الثلاث نقاط في الزاوية' : 'Tap the three dots menu'}</li>
                  <li>{lang === 'ar' ? 'اختر "تثبيت التطبيق"' : 'Select "Install App"'}</li>
                  <li>{lang === 'ar' ? 'أكد عملية التثبيت' : 'Confirm the installation'}</li>
                </ol>
              </div>
            </div>

            <button 
              onClick={() => setShowInstallModal(false)}
              className="w-full mt-8 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
            >
              {lang === 'ar' ? 'حسناً، فهمت' : 'Got it!'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

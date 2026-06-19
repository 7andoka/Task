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
  ClipboardList,
  Settings as SettingsIcon,
  RefreshCw,
  LogIn,
  Truck,
  Snowflake,
  Package,
  Download,
  Share,
  PlusSquare,
  Database,
  AlertCircle
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
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [hideInstallPrompt, setHideInstallPrompt] = React.useState(() => {
    return localStorage.getItem('hide_pwa_install_banner_richland') === 'true';
  });
  const [isInsideIframe, setIsInsideIframe] = React.useState(false);

  React.useEffect(() => {
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone || 
      document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    setIsInsideIframe(window.self !== window.top);
  }, []);

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
    { id: 'supplyTracking', label: t.supplyTracking, icon: Truck },
    { id: 'coldStorage', label: t.coldStorage, icon: Snowflake },
    { id: 'rawMaterial', label: t.rawMaterial, icon: Package },
    { id: 'thirdPartyProcessing', label: t.thirdPartyProcessing, icon: ClipboardList },
    { id: 'oliveStock', label: t.oliveStock, icon: Database },
    { id: 'kpis', label: t.kpis, icon: BarChart3 },
    { id: 'tasks', label: t.tasks, icon: CheckSquare },
    { id: 'team', label: t.team, icon: Users, roles: ['Warehouse Manager', 'Department Head', 'Supervisor', 'Admin', 'Senior Manager', 'Manager', 'Team Leader'] },
    { id: 'users', label: t.userManagement, icon: Users, roles: ['Warehouse Manager', 'Admin'] },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    const isAdminOrWHManager = userRoles.includes('Admin') || userRoles.includes('Warehouse Manager');
    if (user?.permissions && user.permissions.length > 0) {
      if (item.id === 'kpis' && isAdminOrWHManager) return true;
      return user.permissions.includes(item.id);
    }
    return !item.roles || (user && item.roles.some(r => userRoles.includes(r as any)));
  });

  return (
    <div className={cn(
      "min-h-screen flex transition-colors duration-300",
      isDark ? "dark bg-black text-zinc-50" : "bg-white text-zinc-900",
      isRtl ? "font-sans text-right" : "font-sans text-left",
      !isDesktopMode && "flex-col"
    )} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-zinc-100/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-md">
        
        {/* Left Side Controls (Connection Status) */}
        <div className="flex items-center gap-3 shrink-0 z-10">
          <ConnectionStatus username={user?.displayName || user?.username} />
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
        </div>

        {/* Centered Branding */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-0 scale-95 sm:scale-100">
          <div className="bg-white px-2.5 py-1 rounded-xl shadow-sm border border-zinc-200/50 flex items-center justify-center select-none">
            <img 
              src="/logo.png" 
              alt="Rich Land" 
              className="h-9 w-auto object-contain max-w-[200px] mix-blend-multiply"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://i.postimg.cc/1XRRDjGB/1643207840139.jpg';
              }}
            />
          </div>
        </div>

        {/* Right Side Controls (Navigation + Logout/Mode Toggle) */}
        <div className="flex items-center gap-3 shrink-0 z-10">
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
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />
          <button 
            onClick={() => setIsDesktopMode(!isDesktopMode)}
            title={isDesktopMode ? (lang === 'ar' ? 'وضع الهاتف' : 'Mobile Mode') : (lang === 'ar' ? 'وضع الكمبيوتر' : 'Desktop Mode')}
            className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
          >
            {isDesktopMode ? <Smartphone size={18} /> : <Monitor size={18} />}
          </button>
          {!isStandalone && (
            <button
              onClick={handleInstall}
              title={lang === 'ar' ? 'تثبيت التطبيق على جهازك' : 'Install App on Your Device'}
              className="p-2 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 transition-colors flex items-center justify-center relative group"
            >
              <Download size={18} className="animate-pulse" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500" />
            </button>
          )}
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
        <div className="p-4 md:p-6 w-full">
          {/* Subtle PWA Notice banner */}
          {!isStandalone && !hideInstallPrompt && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 px-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 text-right flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold"
              dir="rtl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-800 dark:text-emerald-400">
                    {isRtl 
                      ? "تنبيه: لتجربة أسرع وسلسلة والعمل بوضع عدم الاتصال، يرجى تثبيت التطبيق على جهازك."
                      : "Notice: For the fastest app experience and offline access, please install the app on your device."}
                  </span>
                </div>
                {isInsideIframe && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    {isRtl 
                      ? "(يرجى الفتح في نافذة جديدة للتثبيت)"
                      : "(Open in a new window to install)"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={handleInstall}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-[10px] font-black shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Download size={11} className="animate-bounce" style={{ animationDuration: '3s' }} />
                  <span>{isRtl ? "تثبيت الآن" : "Install Now"}</span>
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('hide_pwa_install_banner_richland', 'true');
                    setHideInstallPrompt(true);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-[11px] font-bold px-1.5 py-1"
                >
                  {isRtl ? "تجاهل" : "Dismiss"}
                </button>
              </div>
            </motion.div>
          )}

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

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
  AlertCircle,
  Sprout,
  Layers,
  Scale
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
  const [showFloatingMenu, setShowFloatingMenu] = React.useState(false);

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
    { id: 'scaleReports', label: t.scaleReports, icon: Scale },
    { id: 'supplyTracking', label: t.supplyTracking, icon: Truck },
    { id: 'rawMaterialsInventory', label: t.rawMaterialsInventory, icon: Layers },
    { id: 'coldStorage', label: t.coldStorage, icon: Snowflake },
    { id: 'rawMaterial', label: t.rawMaterial, icon: Package },
    { id: 'thirdPartyProcessing', label: t.thirdPartyProcessing, icon: ClipboardList },
    { id: 'oliveStock', label: t.oliveStock, icon: Database },
    { id: 'finishedProduct', label: t.finishedProduct, icon: Package },
    { id: 'tasks', label: t.tasks, icon: CheckSquare },
    { id: 'team', label: t.team, icon: Users, roles: ['Warehouse Manager', 'Department Head', 'Supervisor', 'Admin', 'Senior Manager', 'Manager', 'Team Leader'] },
    { id: 'users', label: t.userManagement, icon: Users, roles: ['Warehouse Manager', 'Admin'] },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    const isAdminOrWHManager = userRoles.includes('Admin') || userRoles.includes('Warehouse Manager');
    if (user?.permissions && user.permissions.length > 0) {
      if (item.id === 'scaleReports' && isAdminOrWHManager) return true;
      if (item.id === 'rawMaterialsInventory' && isAdminOrWHManager) return true;
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
      {activeTab !== 'kpis' && (
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

        {/* Right Side Controls (Logout/Mode Toggle) */}
        <div className="flex items-center gap-3 shrink-0 z-10">
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
    )}

      {/* Bottom Navigation (Always at bottom, Scrollable if it exceeds screen) */}
      {activeTab !== 'kpis' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-zinc-100/90 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800 backdrop-blur-md flex items-center overflow-x-auto scrollbar-none px-2 select-none">
          <div className="flex items-center gap-1 md:gap-2 min-w-max mx-auto">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 shrink-0",
                  activeTab === item.id 
                    ? "text-emerald-500 bg-emerald-500/5" 
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                )}
              >
                <item.icon size={16} className="md:w-4.5 md:h-4.5" />
                <span className="text-[9px] md:text-xs font-bold whitespace-nowrap">{item.label}</span>
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="bottom-nav-indicator"
                    className="absolute -top-1 left-2 right-2 h-0.5 bg-emerald-500 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 min-h-screen w-full",
        activeTab === 'kpis' ? "pt-0" : "pt-14",
        activeTab !== 'kpis' && "pb-16"
      )}>
        <div className={cn(
          "w-full",
          activeTab === 'kpis' ? "p-0" : "p-4 md:p-6"
        )}>
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

      {/* Floating Menu Button for TV/KPI Mode */}
      {activeTab === 'kpis' && (
        <div className="fixed bottom-6 right-6 z-[10000] flex flex-col items-end gap-2" dir={isRtl ? 'rtl' : 'ltr'}>
          {showFloatingMenu && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className={cn(
                "p-3 rounded-3xl border shadow-2xl flex flex-col gap-1 max-h-[70vh] overflow-y-auto w-64 backdrop-blur-md mb-2",
                isDark ? "bg-zinc-900/95 border-zinc-800 text-zinc-100" : "bg-white/95 border-zinc-200 text-zinc-900"
              )}
            >
              <div className="px-3 py-2 border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between mb-1">
                <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                  {isRtl ? 'قائمة الصفحات' : 'App Pages'}
                </span>
                <span className="text-[10px] text-zinc-400">Rich Land</span>
              </div>
              {filteredMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setShowFloatingMenu(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-right w-full",
                    activeTab === item.id 
                      ? "bg-emerald-600 text-white" 
                      : isDark 
                        ? "hover:bg-zinc-800 text-zinc-300 hover:text-white" 
                        : "hover:bg-zinc-100 text-zinc-700 hover:text-black"
                  )}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
              <div className="h-px bg-zinc-200/50 dark:bg-zinc-800/50 my-1" />
              {user && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-right text-red-500 hover:bg-red-500/10 w-full"
                >
                  <LogOut size={16} />
                  <span>{isRtl ? 'تسجيل الخروج' : 'Log Out'}</span>
                </button>
              )}
            </motion.div>
          )}
          <button
            onClick={() => setShowFloatingMenu(!showFloatingMenu)}
            title={isRtl ? 'القائمة الرئيسية' : 'Main Menu'}
            className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
          >
            {showFloatingMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      )}

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

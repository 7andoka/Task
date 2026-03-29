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
  LogIn
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
          <img src="/logo.png" alt="Rich Land Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
          
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
    </div>
  );
}

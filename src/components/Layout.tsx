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
  Settings as SettingsIcon
} from 'lucide-react';
import { translations } from '../i18n';
import { Language, UserProfile } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isDesktopMode, setIsDesktopMode] = React.useState(true);
  const t = translations[lang];
  const isRtl = lang === 'ar';

  // Detect device on mount
  React.useEffect(() => {
    const checkDevice = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024;
      setIsDesktopMode(!isMobile);
      setIsSidebarOpen(!isMobile);
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
      
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isDesktopMode ? (isSidebarOpen ? 280 : 80) : "100%",
          height: isDesktopMode ? "100vh" : (isSidebarOpen ? "auto" : 64)
        }}
        className={cn(
          "z-50 flex flex-col border-zinc-800/10 dark:border-zinc-100/10 transition-all",
          isDark ? "bg-zinc-950 border-l" : "bg-white border-r",
          isDesktopMode ? (isRtl ? "fixed right-0" : "fixed left-0") : "relative w-full"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          {(isSidebarOpen || isDesktopMode) && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold tracking-tight text-emerald-500"
            >
              ETA
            </motion.h1>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {(isSidebarOpen || isDesktopMode) && (
          <motion.nav 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "flex-1 px-2 space-y-1 overflow-y-auto",
              !isDesktopMode && !isSidebarOpen && "hidden"
            )}
          >
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (!isDesktopMode) setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200",
                  activeTab === item.id 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                )}
              >
                <item.icon size={22} />
                {(isSidebarOpen || !isDesktopMode) && (
                  <motion.span 
                    initial={{ opacity: 0, x: isRtl ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            ))}
          </motion.nav>
        )}

        {(isSidebarOpen || isDesktopMode) && (
          <div className={cn(
            "p-2 border-t border-zinc-800/10 dark:border-zinc-100/10 space-y-1",
            !isDesktopMode && !isSidebarOpen && "hidden"
          )}>
          </div>
        )}
      </motion.aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen",
        isDesktopMode ? (isSidebarOpen ? (isRtl ? "mr-[280px]" : "ml-[280px]") : (isRtl ? "mr-[80px]" : "ml-[80px]")) : "w-full"
      )}>
        <header className={cn(
          "sticky top-0 z-40 h-16 flex items-center justify-between px-4 md:px-8 border-b border-zinc-800/10 dark:border-zinc-100/10 backdrop-blur-md",
          isDark ? "bg-zinc-950/80" : "bg-white/80"
        )}>
          <div className="flex items-center gap-4 md:gap-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <h2 className="text-lg font-semibold capitalize whitespace-nowrap shrink-0 hidden lg:block">
              {filteredMenuItems.find(m => m.id === activeTab)?.label}
            </h2>
            
            <div className="hidden lg:block w-px h-6 bg-zinc-200 dark:bg-zinc-800 shrink-0" />

            <div className="flex items-center gap-2 shrink-0">
              {filteredMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                    activeTab === item.id
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                      : "bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                  )}
                >
                  <item.icon size={16} />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {user && (
            <div className="flex items-center gap-2 md:gap-4 shrink-0 ps-4">
              <button 
                onClick={() => setIsDesktopMode(!isDesktopMode)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
              >
                {isDesktopMode ? <Smartphone size={20} /> : <Monitor size={20} />}
              </button>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
              >
                <LogOut size={20} />
              </button>
              <div className="hidden xl:block text-right rtl:text-left">
                <p className="text-sm font-semibold">{user.displayName}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{translations[lang][user.role.charAt(0).toLowerCase() + user.role.slice(1).replace(' ', '') as keyof typeof translations['en']] || user.role}</p>
              </div>
            </div>
          )}
        </header>

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

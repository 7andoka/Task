import React, { useEffect, useState, useRef } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { COLLECTIONS } from './constants';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import UserManagement from './components/UserManagement';
import Team from './components/Team';
import Settings from './components/Settings';
import SupplyTracking from './components/SupplyTracking';
import AgriRawMaterialPage from './components/AgriRawMaterial';
import ColdStorage from './components/ColdStorage';
import RawMaterial from './components/RawMaterial';
import ThirdPartyProcessing from './components/ThirdPartyProcessing';
import OliveStock from './components/OliveStock';
import KPIDashboard from './components/KPIDashboard';
import CsvDataView from './components/CsvDataView';
import RawMaterialsInventory from './components/RawMaterialsInventory';
import OfflineScreen from './components/OfflineScreen';
import ForcePasswordChange from './components/ForcePasswordChange';
import { Language, UserProfile, Task } from './types';
import { storageService } from './services/storageService';
import { translations } from './i18n';
import { Toaster, toast } from 'sonner';
import { notifyUser } from './services/notificationService';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const hasRole = (rolesToCheck: string | string[]) => {
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    if (Array.isArray(rolesToCheck)) {
      return rolesToCheck.some(r => userRoles.includes(r as any));
    }
    return userRoles.includes(rolesToCheck as any);
  };

  const getAllowedTabs = (u: UserProfile | null): string[] => {
    if (!u) return [];
    
    const menuItems = [
      { id: 'supplyTracking', roles: undefined },
      { id: 'agriRawMaterial', roles: undefined },
      { id: 'rawMaterialsInventory', roles: undefined },
      { id: 'coldStorage', roles: undefined },
      { id: 'rawMaterial', roles: undefined },
      { id: 'thirdPartyProcessing', roles: undefined },
      { id: 'oliveStock', roles: undefined },
      { id: 'finishedProduct', roles: undefined },
      { id: 'kpis', roles: undefined },
      { id: 'tasks', roles: undefined },
      { id: 'team', roles: ['Warehouse Manager', 'Department Head', 'Supervisor', 'Admin', 'Senior Manager', 'Manager', 'Team Leader'] },
      { id: 'users', roles: ['Warehouse Manager', 'Admin'] },
      { id: 'settings', roles: undefined },
    ];

    const userRoles = u.roles || (u.role ? [u.role] : []);
    const isAdminOrWHManager = userRoles.includes('Admin') || userRoles.includes('Warehouse Manager');

    if (u.permissions && u.permissions.length > 0) {
      return menuItems
        .filter(item => {
          if (item.id === 'kpis' && isAdminOrWHManager) return true;
          if (item.id === 'agriRawMaterial' && isAdminOrWHManager) return true;
          if (item.id === 'rawMaterialsInventory' && isAdminOrWHManager) return true;
          if (item.id === 'finishedProduct') {
            return u.permissions!.includes('finishedProduct') || u.permissions!.includes('oliveStock') || isAdminOrWHManager;
          }
          return u.permissions!.includes(item.id);
        })
        .map(item => item.id);
    }

    return menuItems
      .filter(item => !item.roles || item.roles.some(r => userRoles.includes(r as any)))
      .map(item => item.id);
  };

  const getDefaultTab = (u: UserProfile | null): string => {
    if (!u) return 'supplyTracking';
    const allowed = getAllowedTabs(u);
    if (allowed.includes('oliveStock')) {
      return 'oliveStock';
    }
    return allowed.length > 0 ? allowed[0] : 'settings';
  };

  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Language>('ar');
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState('supplyTracking');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const prevTasksRef = useRef<Task[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionError(null); // Clear error when online
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  const refreshData = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      console.log("Manually refreshing data...");
      const fetchedUsers = await storageService.getUsers();
      const fetchedTasks = await storageService.getTasks();
      setAllUsers(fetchedUsers);
      setAllTasks(fetchedTasks);
      console.log(`Manual refresh complete. Users: ${fetchedUsers.length}, Tasks: ${fetchedTasks.length}`);
    } catch (error) {
      console.error("Manual refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Listen for connection errors from storageService
    const handleConnectionError = (e: any) => {
      if (e.detail?.includes('offline')) {
        setConnectionError(translations[lang].serverOffline);
      }
    };
    window.addEventListener('firestore-connection-error', handleConnectionError);
    
    // Also listen for a custom 'refresh-data' event
    const handleRefreshRequest = () => refreshData();
    window.addEventListener('refresh-data', handleRefreshRequest);

    return () => {
      window.removeEventListener('firestore-connection-error', handleConnectionError);
      window.removeEventListener('refresh-data', handleRefreshRequest);
    };
  }, [lang, user]);

  useEffect(() => {
    // Check for saved user session
    const checkSession = async () => {
      const savedUsername = localStorage.getItem('task_manager_username');
      if (savedUsername) {
        try {
          const savedUser = await storageService.getUserByUsername(savedUsername);
          if (savedUser) {
            setUser(savedUser);
            setActiveTab(getDefaultTab(savedUser));
          } else {
            localStorage.removeItem('task_manager_username');
          }
        } catch (error) {
          console.error("Session restore error:", error);
          localStorage.removeItem('task_manager_username');
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (!user) return;

    console.log("Attaching Firestore listeners for user:", user.uid);
    const unsubTasks = onSnapshot(
      query(collection(db, COLLECTIONS.TASKS)), 
      (snapshot) => {
        const tasksData = snapshot.docs.map(doc => doc.data() as Task);
        console.log(`Tasks updated: ${tasksData.length} tasks found.`);
        // Deduplicate by ID
        const uniqueTasks = Array.from(new Map(tasksData.map(t => [t.id, t])).values());
        setAllTasks(uniqueTasks);
      },
      (error) => {
        console.error("Tasks Snapshot Error:", error);
        setConnectionError(lang === 'ar' ? 'خطأ في مزامنة المهام' : 'Error syncing tasks');
      }
    );

    const unsubUsers = onSnapshot(
      query(collection(db, COLLECTIONS.USERS)), 
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            uid: data.uid || doc.id
          } as UserProfile;
        });
        console.log(`Users updated: ${usersData.length} users found.`);
        // Deduplicate by UID to prevent duplicate key errors
        const uniqueUsers = Array.from(new Map(usersData.map(u => [u.uid, u])).values());
        setAllUsers(uniqueUsers);
      },
      (error) => {
        console.error("Users Snapshot Error:", error);
        setConnectionError(lang === 'ar' ? 'خطأ في مزامنة المستخدمين' : 'Error syncing users');
      }
    );

    // Initial fetch to ensure bootstrapping if collections are empty
    const initialFetch = async () => {
      if (allUsers.length > 0) return;
      setIsDataLoading(true);
      try {
        console.log("Initial fetch starting...");
        const users = await storageService.getUsers();
        if (users && users.length > 0) {
          const uniqueUsers = Array.from(new Map(users.map(u => [u.uid, u])).values());
          setAllUsers(uniqueUsers);
        }
        const tasks = await storageService.getTasks();
        if (tasks && tasks.length > 0) {
          const uniqueTasks = Array.from(new Map(tasks.map(t => [t.id, t])).values());
          setAllTasks(uniqueTasks);
        }
        console.log("Initial fetch complete.");
      } catch (err) {
        console.error("Initial fetch error:", err);
      } finally {
        setIsDataLoading(false);
      }
    };
    initialFetch();

    return () => {
      unsubTasks();
      unsubUsers();
    };
  }, [user]);

  // Derive subordinates and filtered tasks
  const subordinates = React.useMemo(() => {
    if (!user || allUsers.length === 0) return [];
    
    if (hasRole(['Warehouse Manager', 'Admin'])) {
      return allUsers.filter(u => u.uid !== user.uid);
    }
    
    const getAllSubordinates = (managerId: string, users: UserProfile[], visited = new Set<string>()): UserProfile[] => {
      if (visited.has(managerId)) return [];
      visited.add(managerId);
      
      const directSubordinates = users.filter(u => u.managerId === managerId);
      let allSubs = [...directSubordinates];
      for (const sub of directSubordinates) {
        const subSubs = getAllSubordinates(sub.uid, users, visited);
        allSubs = [...allSubs, ...subSubs];
      }
      // Ensure uniqueness
      return Array.from(new Map(allSubs.map(u => [u.uid, u])).values());
    };
    
    return getAllSubordinates(user.uid, allUsers);
  }, [user, allUsers]);

  const tasks = React.useMemo(() => {
    if (!user) return [];
    
    if (hasRole(['Warehouse Manager', 'Admin'])) {
      return allTasks;
    }
    
    if (hasRole('Worker')) {
      return allTasks.filter(t => t.assigneeId === user.uid);
    }
    
    const subIds = new Set(subordinates.map(u => u.uid));
    return allTasks.filter(t => 
      t.assigneeId === user.uid || 
      t.managerId === user.uid || 
      subIds.has(t.assigneeId)
    );
  }, [user, allTasks, subordinates]);

  // Keep user state in sync with allUsers
  useEffect(() => {
    if (!user || allUsers.length === 0) return;
    const updatedUser = allUsers.find(u => u.uid === user.uid);
    if (updatedUser && (updatedUser.displayName !== user.displayName || 
        JSON.stringify(updatedUser.roles) !== JSON.stringify(user.roles) ||
        updatedUser.role !== user.role)) {
      setUser(updatedUser);
    }
  }, [allUsers, user]);

  // Track task changes for notifications
  useEffect(() => {
    if (!user || allTasks.length === 0) return;
    
    const prevTasks = prevTasksRef.current;
    if (prevTasks.length > 0) {
      allTasks.forEach(task => {
        const prevTask = prevTasks.find(t => t.id === task.id);
        
        // 1. New Task
        if (!prevTask) {
          if (task.assigneeId === user.uid && task.managerId !== user.uid) {
            notifyUser(lang === 'ar' ? `تم تكليفك بمهمة جديدة: ${task.title}` : `New task assigned to you: ${task.title}`, false);
          }
        } 
        // 2. Updated Task
        else if (prevTask.lastUpdatedAt !== task.lastUpdatedAt) {
          // Check if status changed to Completed or Pending Review
          if (
            (task.status === 'Completed' || task.status === 'Pending Review') && 
            prevTask.status !== task.status &&
            (task.managerId === user.uid || hasRole('Admin')) &&
            task.assigneeId !== user.uid
          ) {
             notifyUser(lang === 'ar' ? `تم إنجاز المهمة: ${task.title}` : `Task completed: ${task.title}`, false);
          }
          
          // Check if assignee changed to current user
          if (task.assigneeId === user.uid && prevTask.assigneeId !== user.uid) {
             notifyUser(lang === 'ar' ? `تم تكليفك بمهمة جديدة: ${task.title}` : `New task assigned to you: ${task.title}`, false);
          }
          // Check if reminder was sent
          else if (task.lastReminderAt !== prevTask.lastReminderAt && task.assigneeId === user.uid) {
             notifyUser(lang === 'ar' ? `تنبيه استعجال للمهمة: ${task.title}` : `Urgent reminder for task: ${task.title}`, true);
          }
          // Check if task details changed for assignee
          else {
            const detailsChanged = prevTask.title !== task.title || prevTask.description !== task.description || prevTask.deadline !== task.deadline || prevTask.priority !== task.priority;
            if (detailsChanged && task.assigneeId === user.uid && task.managerId !== user.uid) {
               notifyUser(lang === 'ar' ? `تم تعديل تفاصيل المهمة: ${task.title}` : `Task details updated: ${task.title}`, false);
            }
          }
        }
      });
    }
    
    prevTasksRef.current = allTasks;
  }, [allTasks, user, lang]);

  // Check for delayed tasks
  useEffect(() => {
    if (!user || allTasks.length === 0) return;

    const checkDelayedTasks = async () => {
      const now = new Date();
      let hasUpdates = false;
      const updatedTasks = [...allTasks];

      for (let i = 0; i < updatedTasks.length; i++) {
        const task = updatedTasks[i];
        if (
          task.status !== 'Completed' &&
          task.status !== 'Cancelled' &&
          task.status !== 'Delayed'
        ) {
          const deadline = new Date(task.deadline);
          if (deadline < now) {
            updatedTasks[i] = { ...task, status: 'Delayed', lastUpdatedAt: now.toISOString() };
            hasUpdates = true;
            
            // Only alert if the user is the assignee or manager
            if (task.assigneeId === user.uid || task.managerId === user.uid || hasRole('Admin')) {
              notifyUser(
                lang === 'ar' 
                  ? `تنبيه: المهمة "${task.title}" متأخرة عن الوقت المحدد!` 
                  : `Alert: Task "${task.title}" is delayed!`,
                true
              );
            }
          }
        }
      }

      if (hasUpdates) {
        const tasksToUpdate = updatedTasks.filter((t, i) => t.status !== allTasks[i].status && t.managerId === user.uid);
        if (tasksToUpdate.length > 0) {
          const finalTasks = allTasks.map(t => {
            const updated = tasksToUpdate.find(ut => ut.id === t.id);
            return updated ? updated : t;
          });
          await storageService.saveTasks(finalTasks);
        }
      }
    };

    // Check immediately and then every minute
    checkDelayedTasks();
    const interval = setInterval(checkDelayedTasks, 60000);

    return () => clearInterval(interval);
  }, [allTasks, user, lang]);

  // Check if current tab is allowed for user
  useEffect(() => {
    if (!user) return;
    
    const allowed = getAllowedTabs(user);
    if (!allowed.includes(activeTab)) {
      setActiveTab(getDefaultTab(user));
    }
  }, [user, activeTab]);

  if (!isOnline) {
    return <OfflineScreen lang={lang} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('task_manager_username');
    setUser(null);
  };

  const handleLogin = (u: UserProfile) => {
    console.log("User logged in:", u.username, "Role:", u.role);
    localStorage.setItem('task_manager_username', u.username);
    setUser(u);
    setActiveTab(getDefaultTab(u));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {connectionError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold animate-bounce">
            {connectionError}
          </div>
        )}
        <Auth lang={lang} onLogin={handleLogin} />
      </>
    );
  }

  // Intercept default password '123'
  if (user.password === '123' || user.initialPassword === '123') {
    return (
      <ForcePasswordChange 
        lang={lang} 
        user={user} 
        onPasswordChanged={(updatedUser) => {
          setUser(updatedUser);
        }} 
        onLogout={handleLogout}
      />
    );
  }

  const renderContent = () => {
    const allowed = getAllowedTabs(user);
    if (user && !allowed.includes(activeTab)) {
      return null;
    }

    switch (activeTab) {
      case 'supplyTracking':
        return <SupplyTracking lang={lang} user={user} allUsers={allUsers} />;
      case 'agriRawMaterial':
        return <AgriRawMaterialPage lang={lang} user={user} />;
      case 'rawMaterialsInventory':
        return <RawMaterialsInventory lang={lang} />;
      case 'coldStorage':
        return <ColdStorage lang={lang} user={user} />;
      case 'rawMaterial':
        return <RawMaterial lang={lang} user={user} />;
      case 'thirdPartyProcessing':
        return <ThirdPartyProcessing lang={lang} user={user} />;
      case 'oliveStock':
        return <OliveStock lang={lang} user={user} />;
      case 'finishedProduct':
        return <CsvDataView lang={lang} />;
      case 'kpis':
        return <KPIDashboard lang={lang} user={user} isDark={isDark} setIsDark={setIsDark} />;
      case 'tasks':
        return <TaskList lang={lang} user={user} tasks={tasks} subordinates={subordinates} allUsers={allUsers} />;
      case 'team':
        return <Team lang={lang} users={subordinates} tasks={tasks} />;
      case 'users':
        return <UserManagement lang={lang} users={allUsers} setUsers={setAllUsers} />;
      case 'settings':
        return <Settings lang={lang} user={user} setUser={setUser} />;
      default:
        return null;
    }
  };

  return (
    <Layout 
      lang={lang} 
      setLang={setLang} 
      isDark={isDark} 
      setIsDark={setIsDark} 
      user={user}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
    >
      <Toaster position="top-center" richColors />
      {connectionError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold animate-bounce flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          {connectionError}
        </div>
      )}
      
      {isDataLoading && (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      )}
      
      {!isDataLoading && renderContent()}
    </Layout>
  );
}

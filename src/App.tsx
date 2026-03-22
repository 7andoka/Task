import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { COLLECTIONS } from './constants';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import UserManagement from './components/UserManagement';
import Team from './components/Team';
import Settings from './components/Settings';
import { Language, UserProfile, Task } from './types';
import { storageService } from './services/storageService';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Language>('ar');
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [subordinates, setSubordinates] = useState<UserProfile[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userProfile = await storageService.getUserByUid(firebaseUser.uid);
        setUser(userProfile || null);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubTasks = onSnapshot(query(collection(db, COLLECTIONS.TASKS)), (snapshot) => {
      setAllTasks(snapshot.docs.map(doc => doc.data() as Task));
    });
    const unsubUsers = onSnapshot(query(collection(db, COLLECTIONS.USERS)), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    return () => {
      unsubTasks();
      unsubUsers();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let userSubordinates: UserProfile[] = [];
    if (user.role === 'Warehouse Manager' || user.role === 'Admin') {
      userSubordinates = allUsers.filter(u => u.uid !== user.uid);
    } else {
      const getAllSubordinates = (managerId: string, allUsers: UserProfile[], visited = new Set<string>()): UserProfile[] => {
        if (visited.has(managerId)) return [];
        visited.add(managerId);
        
        const directSubordinates = allUsers.filter(u => u.managerId === managerId);
        let allSubs = [...directSubordinates];
        for (const sub of directSubordinates) {
          allSubs = [...allSubs, ...getAllSubordinates(sub.uid, allUsers, visited)];
        }
        return allSubs;
      };
      userSubordinates = getAllSubordinates(user.uid, allUsers);
    }
    setSubordinates(userSubordinates);

    let filteredTasks = allTasks;
    if (user.role === 'Warehouse Manager' || user.role === 'Admin') {
      filteredTasks = allTasks;
    } else if (user.role === 'Worker') {
      filteredTasks = allTasks.filter(t => t.assigneeId === user.uid);
    } else {
      const subIds = new Set(userSubordinates.map(u => u.uid));
      filteredTasks = allTasks.filter(t => 
        t.assigneeId === user.uid || 
        t.managerId === user.uid || 
        subIds.has(t.assigneeId)
      );
    }
    setTasks(filteredTasks);
  }, [user, allUsers, allTasks]);

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth lang={lang} onLogin={setUser} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard lang={lang} user={user} tasks={tasks} />;
      case 'tasks':
        return <TaskList lang={lang} user={user} tasks={tasks} subordinates={subordinates} allUsers={allUsers} setTasks={setTasks} />;
      case 'team':
        return <Team lang={lang} users={subordinates} tasks={tasks} />;
      case 'users':
        return <UserManagement lang={lang} users={allUsers} setUsers={setAllUsers} />;
      case 'settings':
        return <Settings lang={lang} user={user} setUser={setUser} />;
      default:
        return <TaskList lang={lang} user={user} tasks={tasks} subordinates={subordinates} allUsers={allUsers} setTasks={setTasks} />;
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
      {renderContent()}
    </Layout>
  );
}

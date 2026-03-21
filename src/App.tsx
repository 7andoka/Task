import React, { useEffect, useState } from 'react';
import { storageService } from './services/storageService';
import { Language, UserProfile, Task } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import Auth from './components/Auth';
import UserManagement from './components/UserManagement';
import Team from './components/Team';
import Settings from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';

import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { COLLECTIONS } from './constants';

function AppContent() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Language>('ar');
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [subordinates, setSubordinates] = useState<UserProfile[]>([]);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(Date.now());

  useEffect(() => {
    if (!user || !db) return;

    // Listen for real-time updates to tasks assigned to the user
    const q = query(
      collection(db, COLLECTIONS.TASKS),
      where('assigneeId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const task = change.doc.data() as Task;
        const now = Date.now();
        
        // Only notify for changes that happened after the app loaded
        // and if the task was updated recently
        const lastUpdate = task.lastUpdatedAt ? new Date(task.lastUpdatedAt).getTime() : 0;
        const lastReminder = task.lastReminderAt ? new Date(task.lastReminderAt).getTime() : 0;
        
        if (lastUpdate > lastNotificationTime || lastReminder > lastNotificationTime) {
          // Trigger notification effects
          triggerNotificationEffects(task, change.type === 'added');
          setLastNotificationTime(now);
        }
      });
    });

    return () => unsubscribe();
  }, [user, lastNotificationTime]);

  const triggerNotificationEffects = (task: Task, isNew: boolean) => {
    // 1. Vibration
    if ('vibrate' in navigator) {
      // Pattern: vibrate for 200ms, pause for 100ms, vibrate for 200ms
      navigator.vibrate([200, 100, 200]);
    }

    // 2. Sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log("Audio play blocked by browser policy"));

    // 3. Browser Notification
    if (Notification.permission === 'granted') {
      new Notification(isNew ? 'مهمة جديدة!' : 'تحديث في المهمة', {
        body: `${task.title}\n${task.description.substring(0, 50)}...`,
        icon: '/manifest.json' // Use app icon
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const profile = await storageService.getUserByUid(firebaseUser.uid);
        if (profile) {
          setUser(profile);
        } else {
          // Fallback if profile doesn't exist yet (should be handled in Auth.tsx)
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    // Listen for real-time updates to all users
    const usersQuery = collection(db, COLLECTIONS.USERS);
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const rawUsersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      const usersData = Array.from(new Map(rawUsersData.map(u => [u.uid, u])).values());
      setAllUsers(usersData);
    });

    // Listen for real-time updates to all tasks
    const tasksQuery = collection(db, COLLECTIONS.TASKS);
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const rawTasksData = snapshot.docs.map(doc => doc.data() as Task);
      const tasksData = Array.from(new Map(rawTasksData.map(t => [t.id, t])).values());
      setTasks(tasksData);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTasks();
    };
  }, [user, db]);

  useEffect(() => {
    if (!user || !db) return;

    // Listen for real-time updates to all users
    const usersQuery = collection(db, COLLECTIONS.USERS);
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const rawUsersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      const usersData = Array.from(new Map(rawUsersData.map(u => [u.uid, u])).values());
      setAllUsers(usersData);
    });

    // Listen for real-time updates to all tasks
    const tasksQuery = collection(db, COLLECTIONS.TASKS);
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const rawTasksData = snapshot.docs.map(doc => doc.data() as Task);
      const tasksData = Array.from(new Map(rawTasksData.map(t => [t.id, t])).values());
      setTasks(tasksData);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTasks();
    };
  }, [user, db]);

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth lang={lang} isDark={isDark} onAuthComplete={setUser} />;
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

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, CheckCircle, Clock, X } from 'lucide-react';
import { UserProfile, Task, Language } from '../types';
import { translations } from '../i18n';

interface TeamProps {
  lang: Language;
  users: UserProfile[];
  tasks: Task[];
}

export default function Team({ lang, users, tasks }: TeamProps) {
  const t = translations[lang];
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const getUserStats = (userId: string) => {
    const userTasks = tasks.filter(t => t.assigneeId === userId);
    const completed = userTasks.filter(t => t.status === 'Completed').length;
    return {
      total: userTasks.length,
      completed,
      remaining: userTasks.length - completed,
      percentage: userTasks.length > 0 ? Math.round((completed / userTasks.length) * 100) : 0
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        {users.map(user => {
          const stats = getUserStats(user.uid);
          return (
            <motion.div 
              key={user.uid}
              whileHover={{ scale: 1.01 }}
              onClick={() => setSelectedUser(user)}
              className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg shrink-0">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate">{user.displayName}</h3>
                    <p className="text-zinc-500 text-[10px] truncate">{user.role}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 text-xs shrink-0">
                    <Phone size={12} className="shrink-0" />
                    <span className="truncate">{user.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 w-12 h-10 rounded-lg">
                  <div className="text-[9px] text-zinc-500 leading-none mb-1">{t.total}</div>
                  <div className="font-bold text-xs leading-none">{stats.total}</div>
                </div>
                <div className="flex flex-col items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 w-12 h-10 rounded-lg text-emerald-600">
                  <div className="text-[9px] leading-none mb-1">{t.completed}</div>
                  <div className="font-bold text-xs leading-none">{stats.completed}</div>
                </div>
                <div className="flex flex-col items-center justify-center bg-amber-50 dark:bg-amber-900/20 w-12 h-10 rounded-lg text-amber-600">
                  <div className="text-[9px] leading-none mb-1">{t.remaining}</div>
                  <div className="font-bold text-xs leading-none">{stats.remaining}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 w-full max-w-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{selectedUser.displayName} - {t.tasks}</h2>
                <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {tasks.filter(t => t.assigneeId === selectedUser.uid).map(task => (
                  <div key={task.id} className="flex justify-between items-center p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                    <div>
                      <div className="font-semibold">{task.title}</div>
                      <div className="text-xs text-zinc-500">{task.status}</div>
                    </div>
                    <div className="font-bold">{task.progress}%</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

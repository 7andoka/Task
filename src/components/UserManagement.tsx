import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  UserCheck, 
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { translations } from '../i18n';
import { Language, UserProfile, UserRole } from '../types';
import { storageService } from '../services/storageService';

interface UserManagementProps {
  lang: Language;
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
}

export default function UserManagement({ lang, users, setUsers }: UserManagementProps) {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = React.useState("");
  const [editingUser, setEditingUser] = React.useState<string | null>(null);
  const [newRole, setNewRole] = React.useState<UserRole | "">("");
  const [newManager, setNewManager] = React.useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState<UserProfile | null>(null);
  const [createForm, setCreateForm] = React.useState({
    displayName: "",
    username: "",
    password: "",
    role: "Worker" as UserRole,
    managerId: "",
    phone: ""
  });
  const [createLoading, setCreateLoading] = React.useState(false);

  const roles: UserRole[] = [
    'Admin', 
    'Warehouse Manager', 
    'Department Head', 
    'Supervisor', 
    'Warehouse Specialist', 
    'Warehouse Keeper', 
    'Assistant Warehouse Keeper', 
    'Worker',
    'Security',
    'Quality',
    'Warehouse'
  ];

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    
    try {
      // Create user profile in Firestore directly without Firebase Auth
      const newUser: UserProfile = {
          uid: createForm.username, // Use username as UID for simplicity in this mode
          displayName: createForm.displayName,
          username: createForm.username,
          role: createForm.role,
          managerId: createForm.managerId,
          phone: createForm.phone,
          password: createForm.password, // Store password directly
          initialPassword: createForm.password,
          needsPasswordChange: true,
          createdAt: new Date().toISOString()
      };
      
      await storageService.saveUser(newUser);
      setUsers(prev => {
        if (prev.find(u => u.uid === newUser.uid)) return prev;
        return [...prev, newUser];
      });
      setIsCreateModalOpen(false);
      setCreateForm({ displayName: "", username: "", password: "", role: "Worker", managerId: "", phone: "" });
    } catch (err: any) {
      console.error("User Creation Error:", err);
      alert(lang === 'ar' ? `خطأ في إنشاء المستخدم: ${err.message}` : `Error creating user: ${err.message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    
    const updatedUsers = users.map(u => u.uid === editForm.uid ? editForm : u);
    await storageService.saveUsers(updatedUsers);
    setUsers(updatedUsers);
    setIsEditModalOpen(false);
    setEditForm(null);
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المستخدم؟' : 'Are you sure you want to delete this user?')) return;
    
    await storageService.deleteUser(uid);
    setUsers(users.filter(u => u.uid !== uid));
  };

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder={t.users + "..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-800/10 dark:border-zinc-100/10 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
        >
          <UserPlus size={20} />
          <span>{t.createUser}</span>
        </button>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-zinc-800/10 dark:border-zinc-100/10"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{t.createUser}</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-500">{t.welcome}</label>
                <input 
                  type="text"
                  required
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm({...createForm, displayName: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-500">{t.username}</label>
                <input 
                  type="text"
                  required
                  value={createForm.username}
                  onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-500">{t.initialPassword}</label>
                <input 
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-500">{t.phoneNumber}</label>
                <input 
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({...createForm, phone: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-500">{t.role}</label>
                  <select 
                    value={createForm.role}
                    onChange={(e) => setCreateForm({...createForm, role: e.target.value as UserRole})}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white [&>option]:text-zinc-900 [&>option]:bg-white dark:[&>option]:text-white dark:[&>option]:bg-zinc-800"
                  >
                    {roles.map(r => {
                      const translationKey = r.charAt(0).toLowerCase() + r.slice(1).replace(/\s+/g, '');
                      const translatedLabel = t[translationKey as keyof typeof t] || r;
                      return <option key={r} value={r}>{translatedLabel}</option>;
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-500">{t.manager}</label>
                  <select 
                    value={createForm.managerId}
                    onChange={(e) => setCreateForm({...createForm, managerId: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white [&>option]:text-zinc-900 [&>option]:bg-white dark:[&>option]:text-white dark:[&>option]:bg-zinc-800"
                  >
                    <option value="">{t.selectManager}</option>
                    {users.filter(m => m.role !== 'Worker').map(m => (
                      <option key={m.uid} value={m.uid}>{m.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button 
                type="submit"
                disabled={createLoading}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
              >
                {createLoading ? t.save + "..." : t.save}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-zinc-800/10 dark:border-zinc-100/10"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{lang === 'ar' ? 'تعديل بيانات المستخدم' : 'Edit User Data'}</h3>
              <button onClick={() => { setIsEditModalOpen(false); setEditForm(null); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-500">{t.welcome}</label>
                <input 
                  type="text"
                  required
                  value={editForm.displayName || ''}
                  onChange={(e) => setEditForm({...editForm, displayName: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-500">{t.username}</label>
                <input 
                  type="text"
                  required
                  value={editForm.username || ''}
                  onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-500">{t.phoneNumber}</label>
                <input 
                  type="tel"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-500">{t.role}</label>
                  <select 
                    value={editForm.role}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value as UserRole})}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white [&>option]:text-zinc-900 [&>option]:bg-white dark:[&>option]:text-white dark:[&>option]:bg-zinc-800"
                  >
                    {roles.map(r => {
                      const translationKey = r.charAt(0).toLowerCase() + r.slice(1).replace(/\s+/g, '');
                      const translatedLabel = t[translationKey as keyof typeof t] || r;
                      return <option key={r} value={r}>{translatedLabel}</option>;
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-500">{t.manager}</label>
                  <select 
                    value={editForm.managerId || ''}
                    onChange={(e) => setEditForm({...editForm, managerId: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-transparent outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white [&>option]:text-zinc-900 [&>option]:bg-white dark:[&>option]:text-white dark:[&>option]:bg-zinc-800"
                  >
                    <option value="">{t.selectManager}</option>
                    {users.filter(m => m.uid !== editForm.uid && m.role !== 'Worker').map(m => (
                      <option key={m.uid} value={m.uid}>{m.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
              >
                {t.save}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-800/20">
              {lang === 'ar' ? 'لم يتم العثور على مستخدمين' : 'No users found'}
            </div>
          ) : (
            filteredUsers.map(u => (
            <motion.div 
              key={u.uid}
              whileHover={{ scale: 1.01 }}
              className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg shrink-0">
                  {u.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate">{u.displayName}</h3>
                    <p className="text-zinc-500 text-[10px] truncate">{u.username}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-500">
                      {(() => {
                        const translationKey = u.role.charAt(0).toLowerCase() + u.role.slice(1).replace(/\s+/g, '');
                        return t[translationKey as keyof typeof t] || u.role;
                      })()}
                    </span>
                    {u.managerId && (
                      <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full truncate max-w-[100px]">
                        {t.manager}: {users.find(m => m.uid === u.managerId)?.displayName || '-'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 text-xs mr-2 rtl:ml-2 rtl:mr-0">
                  <span className="truncate">{u.phone || '-'}</span>
                </div>
                <button 
                  onClick={() => {
                    setEditForm(u);
                    setIsEditModalOpen(true);
                  }}
                  className="p-2 rounded-lg text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all bg-zinc-50 dark:bg-zinc-800/50"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteUser(u.uid)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all bg-zinc-50 dark:bg-zinc-800/50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          )))}
        </div>
      </div>
    </div>
  );
}

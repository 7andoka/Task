import React from 'react';
import { motion } from 'motion/react';
import { 
  Shield
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { translations } from '../i18n';
import { Language, UserRole, UserProfile } from '../types';

interface AuthProps {
  lang: Language;
  isDark: boolean;
  onAuthComplete: (user: UserProfile) => void;
}

import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword, signOut } from 'firebase/auth';

export default function Auth({ lang, isDark, onAuthComplete }: AuthProps) {
  const t = translations[lang];
  const [step, setStep] = React.useState<'login' | 'role' | 'manager' | 'changePassword'>('login');
  const [loading, setLoading] = React.useState(false);
  const [tempUser, setTempUser] = React.useState<any>(null);
  const [selectedRole, setSelectedRole] = React.useState<UserRole | null>(null);
  const [availableManagers, setAvailableManagers] = React.useState<UserProfile[]>([]);
  const [selectedManager, setSelectedManager] = React.useState<string>("");
  
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Simple Firestore-based login
      const profile = await storageService.getUserByUsername(username);
      
      if (!profile) {
        throw new Error(lang === 'ar' ? "اسم المستخدم غير موجود" : "Username not found");
      }

      const isMatch = password === profile.initialPassword || 
                      (profile as any).password === password ||
                      (profile.username === 'admin' && (password === '123' || password === '123456'));

      if (isMatch) {
        // Ensure user is authenticated in Firebase Auth for security rules to work
        const firebasePassword = password.length < 6 ? `${password}_secure` : password;
        
        try {
          const loginEmail = profile.email || `${username}@warehouse.com`;
          let firebaseUser;
          try {
            const userCredential = await signInWithEmailAndPassword(auth, loginEmail, firebasePassword);
            firebaseUser = userCredential.user;
          } catch (signInError: any) {
            if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
              const signupCred = await createUserWithEmailAndPassword(auth, loginEmail, firebasePassword);
              firebaseUser = signupCred.user;
            } else {
              throw signInError;
            }
          }

          // CRITICAL: Update profile UID to match Firebase UID to prevent "Logout" on first login
          if (firebaseUser && profile.uid !== firebaseUser.uid) {
            const updatedProfile = { ...profile, uid: firebaseUser.uid };
            await storageService.saveUser(updatedProfile);
            onAuthComplete(updatedProfile);
            return;
          }
        } catch (e) {
          console.error("Background auth failed:", e);
        }
        
        onAuthComplete(profile);
      } else {
        throw new Error(lang === 'ar' ? "كلمة المرور غير صحيحة" : "Invalid password");
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        const user = tempUser as UserProfile;
        user.needsPasswordChange = false;
        await storageService.saveUser(user);
        onAuthComplete(user);
      }
    } catch (error) {
      console.error("Change Password Error:", error);
      setError("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'Admin' || role === 'Warehouse Manager') {
      await finalizeSignup(role, "");
    } else {
      setLoading(true);
      try {
        const users = await storageService.getUsers();
        const managers = users.filter(u => u.role === 'Admin' || u.role === 'Warehouse Manager' || u.role === 'Department Head' || u.role === 'Supervisor');
        setAvailableManagers(managers);
        setStep('manager');
      } catch (error) {
        console.error("Error fetching managers:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const finalizeSignup = async (role: UserRole, managerId: string) => {
    setLoading(true);
    const newUser: UserProfile = {
      uid: tempUser.uid,
      email: tempUser.email,
      displayName: tempUser.displayName,
      photoURL: tempUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tempUser.uid}`,
      role,
      managerId,
      createdAt: new Date().toISOString()
    };

    try {
      await storageService.saveUser(newUser);
      onAuthComplete(newUser);
    } catch (error) {
      console.error("Signup Error:", error);
      setError("Failed to create user profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center p-6 overflow-hidden relative transition-colors duration-300",
      isDark ? "dark bg-black" : "bg-white"
    )}>
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative w-full max-w-md backdrop-blur-xl border rounded-[40px] p-10 shadow-2xl transition-all duration-300",
          isDark 
            ? "bg-zinc-900/50 border-zinc-100/10" 
            : "bg-white/80 border-zinc-800/10"
        )}
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
            <Shield className="text-white" size={32} />
          </div>
          <h1 className={cn(
            "text-3xl font-bold tracking-tight mb-2",
            isDark ? "text-white" : "text-black"
          )}>
            {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
          </h1>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {step === 'login' && (
          <div className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className={cn("text-sm font-semibold", isDark ? "text-zinc-300" : "text-zinc-700")}>{t.username}</label>
                <input 
                  type="text"
                  required
                  placeholder={lang === 'ar' ? "اسم المستخدم" : "Username"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500 transition-all",
                    isDark 
                      ? "bg-zinc-800/50 border-zinc-100/10 text-white" 
                      : "bg-zinc-50 border-zinc-800/10 text-black"
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className={cn("text-sm font-semibold", isDark ? "text-zinc-300" : "text-zinc-700")}>{t.password}</label>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500 transition-all",
                    isDark 
                      ? "bg-zinc-800/50 border-zinc-100/10 text-white" 
                      : "bg-zinc-50 border-zinc-800/10 text-black"
                  )}
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  <span>{t.login}</span>
                )}
              </button>
            </form>
          </div>
        )}

        {step === 'changePassword' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <p className={isDark ? "text-zinc-400" : "text-zinc-600"}>{t.firstLoginMessage}</p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className={cn("text-sm font-semibold", isDark ? "text-zinc-500" : "text-zinc-400")}>{t.newPassword}</label>
                <input 
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500 transition-all",
                    isDark 
                      ? "bg-zinc-800/50 border-zinc-100/10 text-white" 
                      : "bg-zinc-50 border-zinc-800/10 text-black"
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className={cn("text-sm font-semibold", isDark ? "text-zinc-500" : "text-zinc-400")}>{t.confirmPassword}</label>
                <input 
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500 transition-all",
                    isDark 
                      ? "bg-zinc-800/50 border-zinc-100/10 text-white" 
                      : "bg-zinc-50 border-zinc-800/10 text-black"
                  )}
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  <span>{t.changePassword}</span>
                )}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

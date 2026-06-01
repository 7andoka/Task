import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, LogOut, AlertCircle } from 'lucide-react';
import { storageService } from '../services/storageService';
import { UserProfile, Language } from '../types';
import { toast } from 'sonner';

interface ForcePasswordChangeProps {
  lang: Language;
  user: UserProfile;
  onPasswordChanged: (updatedUser: UserProfile) => void;
  onLogout: () => void;
}

export default function ForcePasswordChange({ lang, user, onPasswordChanged, onLogout }: ForcePasswordChangeProps) {
  const isRtl = lang === 'ar';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError(isRtl ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    if (newPassword === '123') {
      setError(isRtl ? 'لا يمكن استخدام كلمة المرور الافتراضية "123"' : 'Cannot use default password "123"');
      return;
    }

    if (newPassword.length < 4) {
      setError(isRtl ? 'يجب أن تتكون كلمة المرور من 4 رموز على الأقل' : 'Password must be at least 4 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(isRtl ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const updatedUser: UserProfile = {
        ...user,
        password: newPassword,
        initialPassword: newPassword,
        needsPasswordChange: false,
      };

      await storageService.saveUser(updatedUser);
      toast.success(isRtl ? 'تم تحديث كلمة المرور بنجاح!' : 'Password updated successfully!');
      
      setTimeout(() => {
        onPasswordChanged(updatedUser);
      }, 500);
    } catch (err) {
      console.error(err);
      setError(isRtl ? 'حدث خطأ أثناء حفظ كلمة المرور الجديدة' : 'Error updating password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-6 md:p-8 rounded-[2rem] shadow-xl"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Lock size={22} />
            </div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white">
              {isRtl ? 'تحديث كلمة المرور' : 'Update Password'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {isRtl 
                ? 'يرجى تغيير كلمة المرور الافتراضية "123" للمتابعة' 
                : 'Please change the default password "123" to continue'}
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                {isRtl ? 'كلمة المرور الجديدة' : 'New Password'}
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-white font-mono"
                  placeholder="••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-500`}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                {isRtl ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-zinc-900 dark:text-white font-mono"
                  placeholder="••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-500`}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-950/20 py-2 px-3 rounded-lg flex items-center gap-1.5 font-semibold">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/15 disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer transition-all"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{isRtl ? 'حفظ ودخول' : 'Save & Continue'}</span>
                )}
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <LogOut size={13} />
                <span>{isRtl ? 'تسجيل الخروج' : 'Logout'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { storageService } from '../services/storageService';
import { UserProfile, Language } from '../types';
import { translations } from '../i18n';

interface AuthProps {
  lang: Language;
  onLogin: (user: UserProfile) => void;
}

export default function Auth({ lang, onLogin }: AuthProps) {
  const t = translations[lang];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await storageService.getUserByUsername(username);
      if (!user) {
        setError(t.userNotFound);
        setIsLoading(false);
        return;
      }

      // Simple password check against database
      const userPassword = user.password || user.initialPassword;
      if (password === userPassword) {
        onLogin(user);
      } else {
        setError(t.invalidCredentials);
      }
    } catch (err: any) {
      setError(t.invalidCredentials);
      console.error("Login Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden font-sans" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Background Image Container */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://i.postimg.cc/j5PH02L7/images-2.jpg" 
          alt="" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          style={{ imageRendering: 'auto' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1920&auto=format&fit=crop';
          }}
        />
        {/* Subtle overlay for text readability without sacrificing image quality */}
        <div className="absolute inset-0 bg-black/40" />
      </div>
      
      {/* Main Content & Login Form */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full bg-white/5 backdrop-blur-lg p-6 rounded-[2rem] border border-white/10 shadow-2xl"
        >
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <div className="bg-white p-2 rounded-2xl shadow-xl border border-white/20 select-none mb-3 flex items-center justify-center animate-pulse" style={{ animationDuration: '4s' }}>
              <img 
                src="/logo.png" 
                alt="Rich Land Logo" 
                className="h-20 w-auto object-contain mix-blend-multiply"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://i.postimg.cc/1XRRDjGB/1643207840139.jpg';
                }}
              />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">{t.login}</h2>
            <p className="text-white/70 text-sm mt-1">{t.welcomeBack}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <div className="relative">
                <User className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-white/70`} size={20} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full ${lang === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-black/20 rounded-2xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none text-white placeholder:text-white/60 transition-all`}
                  placeholder={t.username}
                  required
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-white/70`} size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full ${lang === 'ar' ? 'pr-12 pl-12' : 'pl-12 pr-12'} py-4 bg-black/20 rounded-2xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none text-white placeholder:text-white/60 transition-all`}
                  placeholder={t.password}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${lang === 'ar' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors`}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-300 text-sm text-center bg-red-500/20 py-2 rounded-xl border border-red-500/30"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 mt-2 bg-[#1a4d2e] hover:bg-[#133820] text-white rounded-full font-bold text-lg transition-all shadow-lg shadow-[#1a4d2e]/40 disabled:opacity-70 flex justify-center items-center"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                t.login
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

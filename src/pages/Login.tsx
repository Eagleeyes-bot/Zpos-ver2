import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { LogIn, ShieldCheck, Mail, Lock, UserPlus, Bird } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';

export default function Login() {
  const { loginWithEmail, registerWithEmail } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await registerWithEmail(username, password);
      } else {
        await loginWithEmail(username, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Language Switcher Fixed Position */}
      <div className="fixed top-8 right-8 z-50 flex gap-2">
        <div className="bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-white flex gap-1 shadow-xl shadow-sky-900/5">
          {[
            { id: 'en', label: 'EN', flag: '🇺🇸' },
            { id: 'my', label: 'MY', flag: '🇲🇲' },
            { id: 'th', label: 'TH', flag: '🇹🇭' }
          ].map(lang => (
            <button
              key={lang.id}
              onClick={() => setLanguage(lang.id as any)}
              className={cn(
                "w-12 py-2 rounded-xl text-[10px] font-black transition-all flex flex-col items-center",
                language === lang.id 
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-200" 
                  : "text-gray-400 hover:bg-white/80"
              )}
            >
              <span className="text-sm">{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Background Eagle Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.03] pointer-events-none select-none rotate-12">
        <img 
          src="https://www.svgrepo.com/show/532391/eagle.svg" 
          alt="Watermark" 
          className="w-full h-full object-contain"
        />
      </div>
      
      {/* Subtle Background Gradients */}
      <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-sky-200/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-sky-100/30 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/50 relative z-10"
      >
        <div className="p-10 text-center space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-slate-800 w-24 h-24 rounded-full shadow-2xl shadow-slate-900/40 flex items-center justify-center overflow-hidden border-4 border-slate-700 ring-1 ring-slate-600/50">
              <span className="text-sky-400 font-black text-6xl select-none leading-none pt-1">Z</span>
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight text-center">{t('login_title')}</h1>
              <p className="text-[10px] text-sky-600 font-black mt-1 tracking-[0.1em] text-center">join us! ZPOS • Premium Mobile Solutions • +66942933569</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold uppercase tracking-widest border border-rose-100">
                {error}
              </div>
            )}
            
            <div className="space-y-2 group">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 ml-1 group-focus-within:text-sky-600 transition-colors uppercase flex items-center gap-2">
                <div className="w-1 h-1 bg-sky-600/0 group-focus-within:bg-sky-600 rounded-full transition-all" />
                {t('username_label')}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-sky-600 transition-colors" />
                <input 
                   type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-sky-600/20 text-sm font-medium transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 ml-1 group-focus-within:text-sky-600 transition-colors flex items-center gap-2">
                <div className="w-1 h-1 bg-sky-600/0 group-focus-within:bg-sky-600 rounded-full transition-all" />
                {t('password_label')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-sky-600 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-sky-600/20 text-sm font-medium transition-all"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#0ea5e9] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-[#0284c7] transition-all shadow-xl active:scale-[0.98] group mt-4 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isRegister ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />
              )}
              {isRegister ? t('register_btn') : t('sign_in_btn')}
            </button>
          </form>

          <div className="space-y-4">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="w-full py-4 rounded-2xl border border-sky-100 text-sky-600 font-black uppercase tracking-widest text-[9px] hover:bg-sky-50 transition-all flex items-center justify-center gap-2 group shadow-sm"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400 group-hover:scale-125 transition-transform" />
              {isRegister ? t('register_prompt') : t('login_prompt')}
            </button>
          </div>

          <div className="pt-4 border-t border-gray-50 flex items-center justify-center gap-2 text-gray-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Secure Admin Access Only</span>
          </div>
        </div>
      </motion.div>
      
      <p className="mt-8 text-sky-400/60 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
        Talent without work is nothing!
      </p>
    </div>
  );
}

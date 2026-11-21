'use client';

/**
 * ============================================================================
 * ManStat: User Authentication & Sign-in Page
 * ============================================================================
 * - Supabase Auth Email/Password Sign-In
 * - Clean Thai Civil Service Professional UI
 * - Zero Emojis, Pure Lucide SVG Icons, Strict 8px Gap
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLogoIcon } from '@/components/brand/AppLogo';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Remember Me state & prefill remembered username from previous login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRemember = localStorage.getItem('manstat_remember_me');
      const rememberedUsername = localStorage.getItem('manstat_remembered_username');
      if (savedRemember === 'true') {
        setRememberMe(true);
        if (rememberedUsername) {
          setEmail(rememberedUsername);
        }
      } else if (savedRemember === 'false') {
        setRememberMe(false);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // 1. Authenticate via centralized Server Auth API (sets HttpOnly cookies with 30-day maxAge if rememberMe)
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          rememberMe,
        }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        const user = data.user;
        const role = user.role || 'teacher';

        // Apply local storage (PDPA safe: only stores role, user metadata, and username if rememberMe)
        if (typeof window !== 'undefined') {
          if (rememberMe) {
            localStorage.setItem('manstat_remember_me', 'true');
            localStorage.setItem('manstat_remembered_username', email.trim());
          } else {
            localStorage.setItem('manstat_remember_me', 'false');
            localStorage.removeItem('manstat_remembered_username');
          }
          localStorage.setItem('manstat_auth_role', role);
          localStorage.setItem('manstat_auth_user', JSON.stringify(user));
        }

        // Optional: Also sign in with Supabase Auth in background if credentials exist
        try {
          const supabase = createClient();
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });
        } catch {
          // Ignored (offline / local DB mode)
        }

        router.push('/');
        return;
      } else {
        setErrorMessage(data.error || 'ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err: any) {
      console.error('[Login Error]', err);
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1016] flex flex-col justify-center items-center p-4 selection:bg-sky-500 selection:text-white relative overflow-hidden transition-colors duration-200">
      {/* Top right theme switcher */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeSwitcher />
      </div>

      {/* Background radial gradient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 flex flex-col items-center">
        {/* School & System Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="mb-4 drop-shadow-xl">
            <AppLogoIcon size={64} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">ManStat</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            ระบบบริหารงานบุคคล โรงเรียนชุมชนบ้านตะขบ
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#111722]/90 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <span>มาตรฐานความปลอดภัย PDPA และ พ.ร.บ. ข้อมูลข่าวสารฯ</span>
          </div>
        </div>

        {/* Login Form Box */}
        <div className="w-full bg-white dark:bg-[#121822] p-7 sm:p-8 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xl dark:shadow-2xl shadow-slate-200/50 dark:shadow-black/80 transition-colors duration-200">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">เข้าสู่ระบบ</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่านเพื่อเข้าใช้งานระบบ
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                ชื่อผู้ใช้ หรือ อีเมล (Username / Email)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="กรอกชื่อผู้ใช้หรืออีเมล"
                  className="w-full bg-slate-50 dark:bg-[#0b1016] border border-slate-200 dark:border-slate-800 focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/30 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                รหัสผ่าน (Password)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 dark:bg-[#0b1016] border border-slate-200 dark:border-slate-800 focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/30 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors duration-200 focus:outline-none"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label htmlFor="rememberMe" className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500/30 dark:bg-[#0b1016] cursor-pointer"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  จดจำการเข้าสู่ระบบในเครื่องนี้
                </span>
              </label>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm border border-transparent transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-700 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <ArrowRight className="w-4 h-4 shrink-0" />
              )}
              <span>เข้าสู่ระบบ</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200/90 dark:border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              หากพบปัญหาการเข้าสู่ระบบ โปรดติดต่อเจ้าหน้าที่ดูแลระบบคอมพิวเตอร์ของโรงเรียน
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

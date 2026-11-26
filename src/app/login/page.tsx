'use client';

/**
 * ============================================================================
 * ManStat: Ultra-Clean User Authentication & Sign-in Page
 * ============================================================================
 * - Balanced Minimalist Brand Hierarchy (size 72 logo, text-2xl/3xl title)
 * - Dynamic School Name fetched from real database
 * - Borderless & Zero-Clutter Single-Column Layout (max-w-[350px])
 * - Autofill-Safe Password Field (Flex container separating input and eye button)
 * - Browser Password Manager Ready (method="post", autocomplete attributes)
 * - Persistent 30-Day Session Support (rememberMe)
 * - Cohesive Deep Blue Tone (#3B82F6 / bg-blue-600 matching logo palette)
 * - Zero Emojis, Pure Lucide SVG Icons, Strict Accessibility standards
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLogoIcon } from '@/components/brand/AppLogo';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>('โรงเรียนชุมชนบ้านตะขบ');

  // Fetch dynamic school name from database public endpoint & initialize remembered username
  useEffect(() => {
    fetch('/api/public/school')
      .then((res) => res.json())
      .then((data) => {
        if (data?.school_name || data?.schoolName) {
          setSchoolName(data.school_name || data.schoolName);
        }
      })
      .catch(() => {});

    if (typeof window !== 'undefined') {
      const savedRemember = localStorage.getItem('manstat_remember_me');
      const rememberedUsername = localStorage.getItem('manstat_remembered_username');
      if (savedRemember === 'true') {
        setRememberMe(true);
        if (rememberedUsername) {
          setUsername(rememberedUsername);
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
          username: username.trim(),
          email: username.trim(),
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
            localStorage.setItem('manstat_remembered_username', username.trim());
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
            email: username.trim(),
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
    <div className="min-h-dvh bg-slate-50 dark:bg-[#090E1A] flex items-center justify-center p-4 selection:bg-sky-500 selection:text-white relative transition-colors duration-200">
      {/* Top right theme switcher */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-[350px] mx-auto px-5">
        {/* Header - Balanced Brand Presence */}
        <div className="mb-8 flex flex-col items-center text-center">
          <AppLogoIcon size={72} />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mt-4">
            ManStat
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            {schoolName}
          </p>
        </div>

        {/* Minimal Form */}
        <form method="post" onSubmit={handleLogin} className="space-y-4">
          {/* Username Group */}
          <div>
            <label htmlFor="username" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              ชื่อผู้ใช้
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="ชื่อผู้ใช้"
              className="h-11 w-full rounded-lg bg-white dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 px-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-sky-500 dark:focus:border-sky-400/60 focus:bg-white dark:focus:bg-white/[0.06] focus:outline-none shadow-xs dark:shadow-none transition-colors"
            />
          </div>

          {/* Password Group - Autofill-Safe Flex Container */}
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              รหัสผ่าน
            </label>
            <div className="flex items-center h-11 w-full rounded-lg bg-white dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 focus-within:border-sky-500 dark:focus-within:border-sky-400/60 focus-within:bg-white dark:focus-within:bg-white/[0.06] shadow-xs dark:shadow-none transition-colors">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="รหัสผ่าน"
                className="flex-1 min-w-0 h-full bg-transparent pl-3.5 pr-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="shrink-0 h-full px-3 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors focus:outline-none cursor-pointer"
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-0.5">
            <label htmlFor="rememberMe" className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.04] text-blue-600 accent-blue-600 focus:ring-blue-500/30 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">จดจำการเข้าสู่ระบบ</span>
            </label>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <p className="text-xs text-rose-600 dark:text-rose-400 text-center py-0.5">
              {errorMessage}
            </p>
          )}

          {/* Submit Button - Cohesive Deep Blue Tone */}
          <button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-sm transition-colors mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            <span>เข้าสู่ระบบ</span>
          </button>
        </form>
      </div>
    </div>
  );
}

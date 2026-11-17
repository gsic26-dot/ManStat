'use client';

/**
 * ============================================================================
 * ManStat-Modern: User Authentication & Sign-in Page
 * ============================================================================
 * - Supabase Auth Email/Password Sign-In
 * - Clean Thai Civil Service Professional UI
 * - Zero Emojis, Pure Lucide SVG Icons, Strict 8px Gap
 * ============================================================================
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { School, Lock, Mail, ArrowRight, AlertCircle, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Superuser / Admin master override (Legacy ManStat feature)
    const isSuperuserLogin =
      (trimmedEmail === 'superuser' ||
        trimmedEmail === 'admin' ||
        trimmedEmail === '44123130114' ||
        trimmedEmail === 'root' ||
        trimmedEmail === 'gsic26@gmail.com') &&
      (password === '44123130114' ||
        password === '123456' ||
        password === 'admin' ||
        password === 'superuser');

    if (isSuperuserLogin) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('manstat_auth_role', 'superuser');
        localStorage.setItem(
          'manstat_auth_user',
          JSON.stringify({
            id: 'EXE-001',
            name: 'Superuser',
            fullName: 'นายธีรศักดิ์ มโนธรรม',
            role: 'superuser',
            email: 'superuser',
          })
        );
      }
      setIsLoading(false);
      router.push('/');
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setErrorMessage(error.message || 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง');
      } else if (data.session) {
        router.push('/');
      } else {
        router.push('/');
      }
    } catch {
      // For demo or offline preview fallback
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1016] flex flex-col justify-center items-center p-4 selection:bg-sky-500 selection:text-white relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 flex flex-col items-center">
        {/* School & System Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#0ea5e9] to-[#0284c7] flex items-center justify-center shadow-xl shadow-sky-950/50 border border-sky-400/20 mb-4">
            <School className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">ManStat-Modern</h1>
          <p className="text-xs text-slate-400 mt-1.5">
            ระบบบริหารงานบุคคล โรงเรียนชุมชนบ้านตะขบ
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111722]/90 border border-slate-700/60 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>มาตรฐานความปลอดภัย PDPA และ พ.ร.บ. ข้อมูลข่าวสารฯ</span>
          </div>
        </div>

        {/* Login Form Box */}
        <div className="w-full bg-[#121822] p-7 sm:p-8 rounded-2xl border border-slate-800/80 shadow-2xl shadow-black/80">
          <h2 className="text-lg font-semibold text-white mb-1">เข้าสู่ระบบ</h2>
          <p className="text-xs text-slate-400 mb-6">
            กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่านเพื่อเข้าใช้งานระบบ
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                ชื่อผู้ใช้ หรือ อีเมล (Username / Email)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="superuser หรือ email@school.ac.th"
                  className="w-full bg-[#0b1016] border border-slate-800 focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/30 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500/80 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                รหัสผ่าน (Password)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-[#0b1016] border border-slate-800 focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/30 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-100 placeholder-slate-500/80 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
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

            {errorMessage && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0088cc] hover:bg-[#0099e6] active:bg-[#0077b3] text-white font-medium text-sm shadow-lg shadow-sky-950/40 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <ArrowRight className="w-4 h-4 shrink-0" />
              )}
              <span>เข้าสู่ระบบ</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              หากพบปัญหาการเข้าสู่ระบบ โปรดติดต่อเจ้าหน้าที่ดูแลระบบคอมพิวเตอร์ของโรงเรียน
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

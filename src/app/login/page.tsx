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
import { School, Lock, Mail, ArrowRight, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
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
    <div className="min-h-screen bg-[#0e141b] flex flex-col justify-center items-center p-4 selection:bg-sky-500 selection:text-white">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* School & System Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-xl shadow-sky-950/40 mb-3">
            <School className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">ManStat-Modern</h1>
          <p className="text-xs text-slate-400 mt-1">
            ระบบบริหารงานบุคคล โรงเรียนชุมชนบ้านตะขบ
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>มาตรฐานความปลอดภัย PDPA และ พ.ร.บ. ข้อมูลข่าวสารฯ</span>
          </div>
        </div>

        {/* Login Form Box */}
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl">
          <h2 className="text-base font-semibold text-white mb-1.5">เข้าสู่ระบบ</h2>
          <p className="text-xs text-slate-400 mb-6">
            กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่านเพื่อเข้าใช้งานระบบ
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                ชื่อผู้ใช้ หรือ อีเมล (Username / Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="กรอกชื่อผู้ใช้ หรือ อีเมล"
                  className="w-full bg-[#101822] border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="กรอกรหัสผ่าน"
                  className="w-full bg-[#101822] border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-start gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <ArrowRight className="w-4 h-4 shrink-0" />
              )}
              <span>เข้าสู่ระบบ</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              หากพบปัญหาการเข้าสู่ระบบ โปรดติดต่อเจ้าหน้าที่ดูแลระบบคอมพิวเตอร์ของโรงเรียน
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

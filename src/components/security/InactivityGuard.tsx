'use client';

/**
 * ============================================================================
 * ManStat-Modern: Inactivity Guard Component (Session Security Standard)
 * ============================================================================
 * - Activity Tracking: Listens to mousemove, keydown, click, touchstart, scroll
 *   with a 5-second throttle to eliminate CPU overhead.
 * - Warning Trigger: Triggers modal warning at 44 minutes of inactivity.
 * - Expiry Action: Counts down 60 seconds; if unattended, triggers
 *   supabase.auth.signOut() at 45 minutes and redirects to /login.
 * - Session Extension: User can click 'ต่อเวลาการใช้งาน' to reset the timer.
 * - Standard: Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Clock, LogOut, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface InactivityGuardProps {
  warningMinutes?: number; // Default: 44 minutes
  timeoutMinutes?: number; // Default: 45 minutes
}

export const InactivityGuard: React.FC<InactivityGuardProps> = ({
  warningMinutes = 44,
  timeoutMinutes = 45,
}) => {
  const router = useRouter();
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(60);

  const lastActivityRef = useRef<number>(Date.now());
  const throttleRef = useRef<number>(0);
  const isWarningActiveRef = useRef<boolean>(false);

  const warningMs = warningMinutes * 60 * 1000;
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const countdownDuration = Math.max(1, Math.round((timeoutMs - warningMs) / 1000));

  // Throttled activity updater (at most once every 5000ms)
  const recordActivity = useCallback(() => {
    // If the warning modal is already showing, do not passively reset on mouse hover
    if (isWarningActiveRef.current) return;

    const now = Date.now();
    if (now - throttleRef.current > 5000) {
      throttleRef.current = now;
      lastActivityRef.current = now;
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[InactivityGuard] Sign out error:', err);
    } finally {
      setShowWarningModal(false);
      isWarningActiveRef.current = false;
      router.push('/login');
    }
  }, [router]);

  const handleExtendSession = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    throttleRef.current = now;
    setShowWarningModal(false);
    isWarningActiveRef.current = false;
    setCountdownSeconds(countdownDuration);
  }, [countdownDuration]);

  // Set up passive activity listeners
  useEffect(() => {
    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'keydown',
      'click',
      'touchstart',
      'scroll',
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, recordActivity, { passive: true });
    });

    // Check inactivity status every 1000ms
    const intervalId = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;

      if (idleTime >= timeoutMs) {
        // 45 minutes reached: sign out immediately
        handleSignOut();
      } else if (idleTime >= warningMs) {
        // 44 minutes reached: display modal and compute countdown
        if (!isWarningActiveRef.current) {
          isWarningActiveRef.current = true;
          setShowWarningModal(true);
        }
        const remainingUntilTimeout = Math.max(0, Math.ceil((timeoutMs - idleTime) / 1000));
        setCountdownSeconds(remainingUntilTimeout);
      } else {
        if (isWarningActiveRef.current) {
          isWarningActiveRef.current = false;
          setShowWarningModal(false);
        }
      }
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, recordActivity);
      });
      clearInterval(intervalId);
    };
  }, [recordActivity, handleSignOut, warningMs, timeoutMs]);

  if (!showWarningModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#171a21] border border-[#2a475e] rounded-xl shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-2 text-amber-400 mb-4 pb-3 border-b border-slate-700/60">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <h3 className="text-lg font-semibold text-slate-100">แจ้งเตือนความปลอดภัยของเซสชัน</h3>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          ไม่มีการใช้งานระบบเป็นเวลานานเกินกำหนด เพื่อความปลอดภัยของข้อมูลบุคลากรและระเบียบราชการ ระบบจะทำการออกจากระบบอัตโนมัติใน:
        </p>

        {/* Big Countdown Box */}
        <div className="bg-[#101822] border border-amber-500/30 rounded-lg p-4 mb-6 flex items-center justify-center gap-3">
          <Clock className="w-8 h-8 text-amber-400 animate-pulse shrink-0" />
          <span className="font-mono text-3xl font-bold text-amber-400 tracking-wider">
            {countdownSeconds}
          </span>
          <span className="text-sm text-slate-400">วินาที</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleExtendSession}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm rounded-lg border border-transparent transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-slate-700"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>ต่อเวลาการใช้งาน</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-medium text-sm rounded-lg transition-colors duration-200 focus:outline-none"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

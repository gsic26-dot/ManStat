'use client';

/**
 * ============================================================================
 * ManStat: Citizen ID Shield Component (PDPA Security & Audit Log)
 * ============================================================================
 * - Default: Masked format (e.g. 1-xxxx-xxxxx-12-3 or 1-3014-*****-**-3)
 * - Reveal: Calls server route /api/pdpa/reveal which verifies Data Owner (isSelf)
 *   or Administrative privilege (superuser, director, hr_admin) and records
 *   an immutable PDPA Audit Log entry.
 * - Auto-Expiry: 45-second visual countdown progress bar; auto-remasks at 0s.
 * - Memory Safety: Cancels timers and purges plaintext state on unmount.
 * - Standard: Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Eye, EyeOff, ShieldCheck, ShieldAlert, Loader2, Lock } from 'lucide-react';
import { canViewSensitiveData } from '@/lib/auth/roles';

export interface CitizenIdShieldProps {
  targetStaffId: string;
  initialMaskedId?: string | null;
  currentUser?: any;
  currentRole?: string;
  className?: string;
}

export function formatCitizenId(id: string): string {
  const cleaned = id.replace(/\D/g, '');
  if (cleaned.length !== 13) return id;
  return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 5)}-${cleaned.slice(5, 10)}-${cleaned.slice(10, 12)}-${cleaned.slice(12, 13)}`;
}

export function maskCitizenId(id?: string | null): string {
  if (!id) return 'x-xxxx-xxxxx-xx-x';
  const cleaned = id.replace(/\D/g, '');
  if (cleaned.length === 13) {
    return `${cleaned.slice(0, 1)}-xxxx-xxxxx-${cleaned.slice(10, 12)}-${cleaned.slice(12, 13)}`;
  }
  // If already formatted with dashes like 3-3014-*****-**-1
  if (id.includes('*') || id.includes('x')) {
    return id;
  }
  return '1-xxxx-xxxxx-12-3';
}

const TOTAL_COUNTDOWN_SECONDS = 45;

export const CitizenIdShield: React.FC<CitizenIdShieldProps> = ({
  targetStaffId,
  initialMaskedId,
  currentUser,
  currentRole,
  className = '',
}) => {
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(TOTAL_COUNTDOWN_SECONDS);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Client-side quick RBAC check
  const permCheck = useMemo(() => {
    return canViewSensitiveData(
      { ...currentUser, role: currentRole || currentUser?.role },
      { id: targetStaffId, employeeCode: targetStaffId }
    );
  }, [currentUser, currentRole, targetStaffId]);

  const clearTimerAndMask = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsRevealed(false);
    setRevealedId(null);
    setRemainingSeconds(TOTAL_COUNTDOWN_SECONDS);
  }, []);

  // Cleanup on unmount or target change to prevent sensitive memory retention
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      setRevealedId(null);
    };
  }, [targetStaffId]);

  const handleToggleReveal = async () => {
    if (isRevealed) {
      clearTimerAndMask();
      return;
    }

    if (!permCheck.allowed) {
      setErrorMessage(permCheck.reason || 'สงวนสิทธิ์เฉพาะเจ้าของข้อมูลและงานบุคคล');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/pdpa/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStaffId,
          fieldType: 'citizen_id',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนบุคคลตาม PDPA');
      }

      setRevealedId(formatCitizenId(json.value));
      setIsRevealed(true);
      const countdown = json.expiresInSeconds || TOTAL_COUNTDOWN_SECONDS;
      setRemainingSeconds(countdown);

      // Start visual countdown interval (updates every 200ms)
      const startTime = Date.now();
      const endTime = startTime + countdown * 1000;

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      countdownIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const diffMs = endTime - now;
        const secondsLeft = Math.max(0, Math.ceil(diffMs / 1000));

        setRemainingSeconds(secondsLeft);

        if (diffMs <= 0) {
          clearTimerAndMask();
        }
      }, 200);
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ PDPA';
      setErrorMessage(errText);
      clearTimerAndMask();
    } finally {
      setIsLoading(false);
    }
  };

  const displayMasked = initialMaskedId ? maskCitizenId(initialMaskedId) : '1-xxxx-xxxxx-12-3';
  const progressPercent = (remainingSeconds / TOTAL_COUNTDOWN_SECONDS) * 100;

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800/80 px-3 py-1.5 rounded-md font-mono text-xs transition-colors">
        <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" aria-label="PDPA Protection Active" />

        <span className={`tracking-wider font-semibold ${isRevealed ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-300'}`}>
          {isRevealed && revealedId ? revealedId : displayMasked}
        </span>

        {permCheck.allowed ? (
          <button
            type="button"
            onClick={handleToggleReveal}
            disabled={isLoading}
            title={
              isRevealed
                ? 'ซ่อนเลขประจำตัวประชาชน'
                : permCheck.isSelf
                ? 'แสดงเลขประจำตัวประชาชนของคุณ'
                : 'แสดงเลขประจำตัวประชาชน (บันทึก Audit Log)'
            }
            className="ml-1 inline-flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-700"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-500 dark:text-sky-400" />
            ) : isRevealed ? (
              <EyeOff className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span
            title="สงวนสิทธิ์เฉพาะเจ้าของข้อมูลและงานบุคคล"
            className="ml-1 inline-flex items-center justify-center p-1.5 rounded-md text-slate-300 dark:text-slate-600 cursor-not-allowed"
          >
            <Lock className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Visual countdown progress bar when revealed */}
      {isRevealed && (
        <div className="w-full space-y-0.5">
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono px-0.5">
            <span>ซ่อนอัตโนมัติ (PDPA)</span>
            <span>{remainingSeconds}วิ</span>
          </div>
        </div>
      )}

      {/* Error message fallback */}
      {errorMessage && (
        <div className="inline-flex items-center gap-1.5 text-[11px] text-rose-500 dark:text-rose-400 mt-0.5">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

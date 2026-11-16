'use client';

/**
 * ============================================================================
 * ManStat-Modern: Citizen ID Shield Component (PDPA Security & Audit Log)
 * ============================================================================
 * - Default: Masked format (e.g. 1-xxxx-xxxxx-12-3)
 * - Reveal: Invokes Supabase RPC 'rpc_reveal_citizen_id' to fetch decrypted ID
 *   and automatically generate an immutable audit log entry.
 * - Auto-Expiry: 15-second visual countdown progress bar; auto-remasks at 0s.
 * - Memory Safety: Cancels timers and purges plaintext state on unmount.
 * - Standard: Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { rpcRevealCitizenId } from '@/lib/supabase/queries';

export interface CitizenIdShieldProps {
  targetStaffId: string;
  initialMaskedId?: string | null;
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
  return '1-xxxx-xxxxx-12-3';
}

const TOTAL_COUNTDOWN_SECONDS = 15;

export const CitizenIdShield: React.FC<CitizenIdShieldProps> = ({
  targetStaffId,
  initialMaskedId,
  className = '',
}) => {
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(TOTAL_COUNTDOWN_SECONDS);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimerAndMask = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsRevealed(false);
    setRevealedId(null);
    setRemainingSeconds(TOTAL_COUNTDOWN_SECONDS);
  }, []);

  // Cleanup immediately on unmount to prevent state/memory retention of sensitive data
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      setRevealedId(null);
    };
  }, []);

  const handleToggleReveal = async () => {
    if (isRevealed) {
      clearTimerAndMask();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const realId = await rpcRevealCitizenId(supabase, targetStaffId);

      setRevealedId(formatCitizenId(realId));
      setIsRevealed(true);
      setRemainingSeconds(TOTAL_COUNTDOWN_SECONDS);

      // Start 15s visual countdown interval (updates every 100ms for smooth progress bar)
      const startTime = Date.now();
      const endTime = startTime + TOTAL_COUNTDOWN_SECONDS * 1000;

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
      <div className="inline-flex items-center gap-2 bg-[#1b2838] border border-[#2a475e] px-3 py-1.5 rounded-md font-mono text-sm shadow-sm transition-all">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-label="PDPA Protection Active" />

        <span className={`tracking-wider font-semibold ${isRevealed ? 'text-emerald-300' : 'text-slate-300'}`}>
          {isRevealed && revealedId ? revealedId : displayMasked}
        </span>

        <button
          type="button"
          onClick={handleToggleReveal}
          disabled={isLoading}
          title={isRevealed ? 'ซ่อนเลขประจำตัวประชาชน' : 'แสดงเลขประจำตัวประชาชน (บันทึก Audit Log)'}
          className="ml-1 inline-flex items-center justify-center p-1 rounded hover:bg-[#2a475e] text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          ) : isRevealed ? (
            <EyeOff className="w-4 h-4 text-amber-400" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 15-second Visual Countdown Progress Bar */}
      {isRevealed && (
        <div className="w-full bg-[#101822] rounded-full h-1.5 overflow-hidden border border-slate-700/50">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-400 transition-all duration-200 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Audit & Auto-mask Notice */}
      {isRevealed && (
        <span className="text-[11px] text-amber-300 font-sans flex items-center gap-1">
          <span>จะซ่อนอัตโนมัติใน {remainingSeconds} วินาที (บันทึก Audit Log แล้ว)</span>
        </span>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-1 text-[11px] text-rose-400 font-sans mt-0.5">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

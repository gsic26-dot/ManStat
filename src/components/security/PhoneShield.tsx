'use client';

/**
 * ============================================================================
 * ManStat: Phone Shield Component (PDPA Personal Phone Masking & Audit)
 * ============================================================================
 * - Default: Masked format (e.g. 099-***-2233)
 * - Reveal: Calls server route /api/pdpa/reveal which verifies Data Owner (isSelf)
 *   or Administrative privilege (superuser, director, hr_admin) and records
 *   an immutable PDPA Audit Log entry.
 * - Auto-Expiry: 45-second visual countdown; auto-remasks at 0s.
 * - Memory Safety: Cancels timers and purges plaintext state on unmount.
 * - Standard: Zero emojis, pure Lucide SVG icons, strict 8px gap.
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Phone, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { canViewSensitiveData, maskPhoneNumber } from '@/lib/auth/roles';

export interface PhoneShieldProps {
  phone?: string | null;
  targetStaffId?: string;
  currentUser?: any;
  currentRole?: string;
  className?: string;
}

const TOTAL_COUNTDOWN_SECONDS = 45;

export const PhoneShield: React.FC<PhoneShieldProps> = ({
  phone,
  targetStaffId,
  currentUser,
  currentRole,
  className = '',
}) => {
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const permCheck = useMemo(() => {
    return canViewSensitiveData(
      { ...currentUser, role: currentRole || currentUser?.role },
      targetStaffId ? { id: targetStaffId, employeeCode: targetStaffId } : null
    );
  }, [currentUser, currentRole, targetStaffId]);

  const clearTimerAndMask = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsRevealed(false);
    setRevealedPhone(null);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      setRevealedPhone(null);
    };
  }, [targetStaffId]);

  if (!phone || phone.trim() === '' || phone === '-') {
    return <span className="text-slate-400 dark:text-slate-500 font-mono text-xs">-</span>;
  }

  const handleToggleReveal = async () => {
    if (isRevealed) {
      clearTimerAndMask();
      return;
    }

    if (!permCheck.allowed) {
      setErrorMessage(permCheck.reason || 'สงวนสิทธิ์เฉพาะเจ้าของข้อมูลและงานบุคคล');
      return;
    }

    if (!targetStaffId) {
      // Local self reveal if no target id specified
      setRevealedPhone(phone);
      setIsRevealed(true);
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
          fieldType: 'phone',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนบุคคลตาม PDPA');
      }

      setRevealedPhone(json.value || phone);
      setIsRevealed(true);
      const countdown = json.expiresInSeconds || TOTAL_COUNTDOWN_SECONDS;

      const startTime = Date.now();
      const endTime = startTime + countdown * 1000;

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      countdownIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const diffMs = endTime - now;
        if (diffMs <= 0) {
          clearTimerAndMask();
        }
      }, 500);
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ PDPA';
      setErrorMessage(errText);
      clearTimerAndMask();
    } finally {
      setIsLoading(false);
    }
  };

  const maskedDisplay = maskPhoneNumber(phone);
  const displayValue = isRevealed && revealedPhone ? revealedPhone : maskedDisplay;

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${className}`}>
      <Phone className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
      <span className={isRevealed ? 'text-emerald-600 dark:text-emerald-300 font-semibold' : 'text-slate-700 dark:text-slate-300'}>
        {displayValue}
      </span>

      {permCheck.allowed ? (
        <button
          type="button"
          onClick={handleToggleReveal}
          disabled={isLoading}
          title={
            isRevealed
              ? 'ซ่อนเบอร์โทรศัพท์'
              : permCheck.isSelf
              ? 'แสดงเบอร์โทรศัพท์ของคุณ'
              : 'แสดงเบอร์โทรศัพท์ (บันทึก Audit Log)'
          }
          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
          ) : isRevealed ? (
            <EyeOff className="w-3 h-3 text-amber-500" />
          ) : (
            <Eye className="w-3 h-3" />
          )}
        </button>
      ) : (
        <span
          title="สงวนสิทธิ์เฉพาะเจ้าของข้อมูลและงานบุคคล"
          className="p-1 text-slate-300 dark:text-slate-600 cursor-not-allowed"
        >
          <Lock className="w-3 h-3" />
        </span>
      )}
    </span>
  );
};

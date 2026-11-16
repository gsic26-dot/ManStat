'use client';

/**
 * ============================================================================
 * ManStat-Modern: Realtime Leave Subscription Hook (useLeaveRealtime)
 * ============================================================================
 * - Subscribes to Supabase postgres_changes on table 'leave_requests'.
 * - Listens for new submissions (INSERT), status updates (UPDATE), and cancellations (DELETE).
 * - Fires customizable callbacks and manages realtime notification toasts.
 * - Safely cleans up channels and listeners on component unmount.
 * - Strict TypeScript typing and Zero-Emoji compliance.
 * ============================================================================
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LeaveRequest } from '@/types/database.types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface LeaveToastNotification {
  id: string;
  type: 'insert' | 'update' | 'delete';
  title: string;
  message: string;
  timestamp: number;
}

export interface UseLeaveRealtimeOptions {
  staffId?: string;
  onInsert?: (newRecord: LeaveRequest) => void;
  onUpdate?: (updatedRecord: LeaveRequest) => void;
  onDelete?: (oldRecord: Partial<LeaveRequest>) => void;
  enableToasts?: boolean;
}

export function useLeaveRealtime(options: UseLeaveRealtimeOptions = {}) {
  const { staffId, onInsert, onUpdate, onDelete, enableToasts = true } = options;
  const [toasts, setToasts] = useState<LeaveToastNotification[]>([]);
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete });

  // Keep callback refs updated to avoid re-subscribing on function identity changes
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete };
  }, [onInsert, onUpdate, onDelete]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channelName = staffId ? `leave-updates-staff-${staffId}` : 'leave-updates-all';

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
          filter: staffId ? `staff_id=eq.${staffId}` : undefined,
        },
        (payload: RealtimePostgresChangesPayload<LeaveRequest>) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'INSERT' && newRecord) {
            const inserted = newRecord as LeaveRequest;
            if (callbacksRef.current.onInsert) {
              callbacksRef.current.onInsert(inserted);
            }

            if (enableToasts) {
              const newToast: LeaveToastNotification = {
                id: `toast-${Date.now()}-${Math.random()}`,
                type: 'insert',
                title: 'มีคำขอลาใหม่ส่งเข้ามา',
                message: `ยื่นขอลาประเภท: ${inserted.leave_type} จำนวน ${inserted.total_days} วัน`,
                timestamp: Date.now(),
              };
              setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
            }
          } else if (eventType === 'UPDATE' && newRecord) {
            const updated = newRecord as LeaveRequest;
            if (callbacksRef.current.onUpdate) {
              callbacksRef.current.onUpdate(updated);
            }

            if (enableToasts) {
              const statusText =
                updated.status === 'approved'
                  ? 'ได้รับการอนุมัติเรียบร้อยแล้ว'
                  : updated.status === 'rejected'
                  ? 'ไม่อนุมัติคำขอ'
                  : 'มีการแก้ไขสถานะคำขอ';

              const newToast: LeaveToastNotification = {
                id: `toast-${Date.now()}-${Math.random()}`,
                type: 'update',
                title: `ผลการพิจารณาการลา: ${updated.leave_type}`,
                message: `สถานะ: ${statusText}`,
                timestamp: Date.now(),
              };
              setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
            }
          } else if (eventType === 'DELETE' && oldRecord) {
            if (callbacksRef.current.onDelete) {
              callbacksRef.current.onDelete(oldRecord as Partial<LeaveRequest>);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffId, enableToasts]);

  return {
    toasts,
    dismissToast,
  };
}

'use client';

/**
 * ============================================================================
 * ManStat: ViewFeedback (ระบบแจ้งข้อเสนอแนะและปรับปรุงระบบ)
 * ============================================================================
 * - Form for teachers and staff to submit bugs or feature ideas
 * - Tracking submitted suggestions with status indicators
 * - Zero Emojis, Pure Lucide SVG Icons, 8px Standard Spacing
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  User,
} from 'lucide-react';
import { isAdminRole } from '@/lib/auth/roles';

interface FeedbackItem {
  id: string;
  category: 'bug' | 'feature' | 'inquiry';
  title: string;
  description: string;
  senderName: string;
  status: 'pending' | 'in_progress' | 'resolved';
  submittedAt: string;
  response?: string;
}

export function ViewFeedback() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentRole, setCurrentRole] = useState<string>('teacher');

  const [category, setCategory] = useState<'bug' | 'feature' | 'inquiry'>('feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin inline response & status state
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [adminStatus, setAdminStatus] = useState<'pending' | 'in_progress' | 'resolved'>('pending');
  const [adminResponse, setAdminResponse] = useState<string>('');
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState<boolean>(false);

  const canManageFeedback = isAdminRole(currentRole);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedRole = localStorage.getItem('manstat_auth_role');
        const storedUser = localStorage.getItem('manstat_auth_user');
        if (storedRole) setCurrentRole(storedRole);
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed?.name) setCurrentUserName(parsed.name);
        }
      } catch {}
    }

    let isMounted = true;
    Promise.all([
      fetch('/api/auth/me', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success && data.user) {
            if (data.user.name) setCurrentUserName(data.user.name);
            if (data.user.role) setCurrentRole(data.user.role);
          }
        })
        .catch(() => {}),
      fetch('/api/feedback', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success && Array.isArray(data.data)) {
            setFeedbacks(data.data);
          }
        })
        .catch(() => {}),
    ]).finally(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showNotice('error', 'กรุณากรอกหัวข้อและรายละเอียดให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          title: title.trim(),
          description: description.trim(),
          senderName: currentUserName || 'ผู้ใช้งานระบบ',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.data) {
        setFeedbacks((prev) => [data.data, ...prev]);
        setTitle('');
        setDescription('');
        showNotice('success', 'ส่งข้อเสนอแนะเรียบร้อยแล้ว ทีมผู้พัฒนาจะดำเนินการตรวจสอบโดยเร็ว');
      } else {
        showNotice('error', data.error || 'เกิดข้อผิดพลาดในการส่งข้อเสนอแนะ');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      showNotice('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAdminReply = (item: FeedbackItem) => {
    setEditingFeedbackId(item.id);
    setAdminStatus(item.status);
    setAdminResponse(item.response || '');
  };

  const handleSaveAdminUpdate = async (item: FeedbackItem) => {
    if (!canManageFeedback) return;
    setIsUpdatingAdmin(true);
    try {
      const updatedPayload: FeedbackItem = {
        ...item,
        status: adminStatus,
        response: adminResponse.trim() || undefined,
      };
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถอัปเดตสถานะข้อเสนอแนะได้');
      }
      const saved: FeedbackItem = data.data || updatedPayload;
      setFeedbacks((prev) => prev.map((fb) => (fb.id === item.id ? saved : fb)));
      setEditingFeedbackId(null);
      showNotice('success', 'อัปเดตสถานะและการตอบกลับเรียบร้อยแล้ว');
    } catch (err: any) {
      showNotice('error', err?.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5 text-sky-500 shrink-0" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">แจ้งปรับปรุงระบบและข้อเสนอแนะ</h2>
        </div>
      </div>

      {notice && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#111822] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-4"
          >
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              ส่งข้อคิดเห็นใหม่
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ประเภทข้อคิดเห็น
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'bug' | 'feature' | 'inquiry')}
                className="w-full h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all cursor-pointer"
              >
                <option value="feature" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">เสนอแนะฟังก์ชันการทำงานใหม่</option>
                <option value="bug" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">แจ้งปัญหา / ข้อผิดพลาดของระบบ</option>
                <option value="inquiry" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">สอบถามการใช้งาน / ระเบียบการลา</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ผู้ส่งข้อคิดเห็น (บัญชีที่เข้าสู่ระบบ)
              </label>
              <div className="w-full h-10 bg-slate-100/80 dark:bg-[#101822] border border-slate-200/90 dark:border-slate-800 rounded-xl px-3.5 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate font-medium">
                  {currentUserName || 'กำลังระบุผู้ใช้งาน...'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                หัวข้อข้อคิดเห็น <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ระบุหัวข้ออย่างกระชับ..."
                className="w-full h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                รายละเอียด <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="อธิบายรายละเอียดขั้นตอน หรือสิ่งที่ต้องการปรับปรุง..."
                className="w-full bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>{isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งข้อเสนอแนะ'}</span>
            </button>
          </form>
        </div>

        {/* Feedback List */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            รายการข้อคิดเห็นและการดำเนินการ ({feedbacks.length} รายการ)
          </h3>

          <div className="space-y-3">
            {isLoading ? (
              <div className="bg-white dark:bg-[#111822] p-8 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                <div className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                  <span>กำลังโหลดรายการข้อเสนอแนะ...</span>
                </div>
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="bg-white dark:bg-[#111822] p-8 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                ยังไม่มีรายการข้อเสนอแนะในระบบ สามารถกรอกแบบฟอร์มด้านซ้ายเพื่อส่งข้อเสนอแนะใหม่ได้ทันที
              </div>
            ) : (
              feedbacks.map((item) => {
                const isEditingThis = editingFeedbackId === item.id;
                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-[#111822] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                            item.category === 'feature'
                              ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30'
                              : item.category === 'bug'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30'
                          }`}
                        >
                          {item.category === 'feature'
                            ? 'ฟีเจอร์ใหม่'
                            : item.category === 'bug'
                            ? 'แจ้งปัญหา'
                            : 'ข้อสอบถาม'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">{item.id}</span>
                      </div>

                      {item.status === 'resolved' ? (
                        <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 min-w-[95px]">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>ดำเนินการแล้ว</span>
                        </span>
                      ) : item.status === 'in_progress' ? (
                        <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30 min-w-[95px]">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>กำลังปรับปรุง</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30 min-w-[95px]">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>รอตรวจสอบ</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm break-words leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {item.description}
                    </p>

                    {item.response && !isEditingThis && (
                      <div className="mt-2 p-2.5 rounded-xl bg-sky-50 dark:bg-[#151f2d] border border-sky-200 dark:border-sky-500/20 text-xs text-sky-900 dark:text-sky-200">
                        <span className="font-semibold text-sky-700 dark:text-sky-400 block text-[11px]">การตอบกลับจากทีมงาน:</span>
                        {item.response}
                      </div>
                    )}

                    {/* Admin Status & Response Editor */}
                    {canManageFeedback && isEditingThis && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-[#0e151f] border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                            สถานะการดำเนินการ:
                          </label>
                          <select
                            value={adminStatus}
                            onChange={(e) => setAdminStatus(e.target.value as 'pending' | 'in_progress' | 'resolved')}
                            className="h-8 bg-white dark:bg-[#16202c] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                          >
                            <option value="pending">รอตรวจสอบ</option>
                            <option value="in_progress">กำลังปรับปรุง</option>
                            <option value="resolved">ดำเนินการแล้ว</option>
                          </select>
                        </div>
                        <textarea
                          rows={2}
                          value={adminResponse}
                          onChange={(e) => setAdminResponse(e.target.value)}
                          placeholder="พิมพ์ข้อความตอบกลับผู้ใช้งาน..."
                          className="w-full bg-white dark:bg-[#16202c] border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isUpdatingAdmin}
                            onClick={() => setEditingFeedbackId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-200/70 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingAdmin}
                            onClick={() => handleSaveAdminUpdate(item)}
                            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
                          >
                            {isUpdatingAdmin ? 'กำลังบันทึก...' : 'บันทึกการตอบกลับ'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between gap-2">
                      <span className="truncate max-w-[200px]" title={`ผู้ส่ง: ${item.senderName}`}>
                        ผู้ส่ง: {item.senderName}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        {canManageFeedback && !isEditingThis && (
                          <button
                            type="button"
                            onClick={() => handleOpenAdminReply(item)}
                            className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium cursor-pointer"
                          >
                            จัดการ / ตอบกลับ
                          </button>
                        )}
                        <span>
                          {new Date(item.submittedAt).toLocaleDateString('th-TH-u-nu-latn', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

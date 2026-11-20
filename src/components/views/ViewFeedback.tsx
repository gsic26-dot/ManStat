'use client';

/**
 * ============================================================================
 * ManStat-Modern: ViewFeedback (ระบบแจ้งข้อเสนอแนะและปรับปรุงระบบ)
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
} from 'lucide-react';
import { INITIAL_TEACHERS, type TeacherRecord } from '@/lib/data/schoolData';

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
  const [teachersList, setTeachersList] = useState<TeacherRecord[]>(INITIAL_TEACHERS);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

  const [category, setCategory] = useState<'bug' | 'feature' | 'inquiry'>('feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [senderName, setSenderName] = useState(INITIAL_TEACHERS[0].name);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/staff', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.data) && data.data.length > 0) {
          setTeachersList(data.data);
        }
      })
      .catch(() => {});

    fetch('/api/feedback', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.data)) {
          setFeedbacks(data.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      alert('กรุณากรอกหัวข้อและรายละเอียด');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          title,
          description,
          senderName,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setFeedbacks((prev) => [data.data, ...prev]);
        setTitle('');
        setDescription('');
        alert('ส่งข้อเสนอแนะเรียบร้อยแล้ว ทีมผู้พัฒนาจะดำเนินการตรวจสอบโดยเร็ว');
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการส่งข้อเสนอแนะ');
      }
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#141b24] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-semibold uppercase tracking-wider">
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>System Feedback & Support</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">แจ้งปรับปรุงระบบและข้อเสนอแนะ</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          รับฟังความคิดเห็นจากคณะครูและบุคลากร เพื่อพัฒนา ManStat-Modern ให้ตอบสนองการปฏิบัติงานดียิ่งขึ้น
        </p>
      </div>

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
                <option value="feature" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">เสนอแนะฟังก์ชันการทำงานใหม่ (Feature Request)</option>
                <option value="bug" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">แจ้งปัญหา / ข้อผิดพลาดของระบบ (Bug Report)</option>
                <option value="inquiry" className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">สอบถามการใช้งาน / ระเบียบการลา (Inquiry)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ผู้ส่งข้อคิดเห็น
              </label>
              <select
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full h-10 bg-slate-50 dark:bg-[#16202c] border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-3.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all cursor-pointer"
              >
                {teachersList.map((t) => (
                  <option key={t.id} value={t.name} className="bg-white dark:bg-[#171a21] text-slate-900 dark:text-slate-100">
                    {t.name}
                  </option>
                ))}
              </select>
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
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium border border-transparent transition-colors duration-200 disabled:opacity-50"
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
            {feedbacks.length === 0 ? (
              <div className="bg-white dark:bg-[#111822] p-8 rounded-2xl border border-slate-200/90 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                ยังไม่มีรายการข้อเสนอแนะในระบบ สามารถกรอกแบบฟอร์มด้านซ้ายเพื่อส่งข้อเสนอแนะใหม่ได้ทันที
              </div>
            ) : (
              feedbacks.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-[#111822] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
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
                    <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 min-w-[95px]">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>ดำเนินการแล้ว</span>
                    </span>
                  ) : item.status === 'in_progress' ? (
                    <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30 min-w-[95px]">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>กำลังปรับปรุง</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30 min-w-[95px]">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>รอตรวจสอบ</span>
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate" title={item.title}>{item.title}</h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{item.description}</p>

                {item.response && (
                  <div className="mt-2 p-2.5 rounded-xl bg-sky-50 dark:bg-[#151f2d] border border-sky-200 dark:border-sky-500/20 text-xs text-sky-900 dark:text-sky-200">
                    <span className="font-semibold text-sky-700 dark:text-sky-400 block text-[11px]">การตอบกลับจากทีมงาน:</span>
                    {item.response}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                  <span className="truncate max-w-[200px]" title={`ผู้ส่ง: ${item.senderName}`}>ผู้ส่ง: {item.senderName}</span>
                  <span>
                    {new Date(item.submittedAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

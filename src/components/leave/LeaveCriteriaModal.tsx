'use client';

/**
 * ============================================================================
 * ManStat: LeaveCriteriaModal (เกณฑ์และประเภทการลาตามระเบียบราชการ)
 * ============================================================================
 * - ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555 (11 ประเภท)
 * - ระเบียบการขออนุญาตออกนอกบริเวณสถานศึกษาและการไปราชการ (2 ประเภท)
 * - เกณฑ์การเลื่อนเงินเดือนตามหลักเกณฑ์ ก.ค.ศ. ว 15/2561
 * - Dual-Theme (Light/Dark), Pure Lucide Icons, Clean Minimalist UI
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  FileText,
  Calendar,
  Info,
} from 'lucide-react';
import { MASTER_LEAVE_TYPES, LeaveTypeDefinition } from '@/lib/regulations/leaveTypes';

interface LeaveCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeaveCriteriaModal({ isOpen, onClose }: LeaveCriteriaModalProps) {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'statutory' | 'special_permission'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredItems = MASTER_LEAVE_TYPES.filter((item) => {
    if (activeCategory !== 'ALL' && item.category !== activeCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#121822] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60">
              <BookOpen className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                เกณฑ์และประเภทการลาตามระเบียบราชการ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ระเบียบสำนักนายกรัฐมนตรีฯ พ.ศ. 2555 (11 ประเภท) และการขออนุญาตราชการ (2 ประเภท)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Search */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#141b24] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Category Tabs */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/70 dark:border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => setActiveCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ทั้งหมด (13)
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('statutory')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'statutory'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              การลา 11 ประเภท (ระเบียบ 2555)
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('special_permission')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'special_permission'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ขออนุญาตออกนอก/ไปราชการ (2)
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาประเภทการลา..."
              className="w-full h-9 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              ไม่พบประเภทการลาที่ตรงกับการค้นหา
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isStatutory = item.category === 'statutory';
              return (
                <div key={item.id} className={`${idx > 0 ? 'pt-3.5' : ''} space-y-2`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {item.label}
                        </span>
                        {item.isZeroDays ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 whitespace-nowrap">
                            วันลา = 0 วัน (ไม่ตัดโควตา)
                          </span>
                        ) : item.maxDays ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                            สูงสุด {item.maxDays} วัน
                          </span>
                        ) : null}

                        {item.affectsSalaryPromotion ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 whitespace-nowrap">
                            นับวันลาในเกณฑ์เลื่อนเงินเดือน (ว15/2561)
                          </span>
                        ) : null}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {item.maxHours ? (
                      <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 whitespace-nowrap shrink-0 self-start">
                        ไม่เกิน {item.maxHours} ชั่วโมง
                      </span>
                    ) : null}
                  </div>

                  {/* Notes / Caveats */}
                  {item.requiresMedicalCertThreshold ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/20 px-2.5 py-1 rounded-md border border-amber-200/50 dark:border-amber-900/40">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span>
                        หากลาป่วยติดต่อกันตั้งแต่ {item.requiresMedicalCertThreshold} วันทำการขึ้นไป ต้องมีใบรับรองของแพทย์ประกอบการลา
                      </span>
                    </div>
                  ) : null}

                  {item.warningNote ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800/50 px-2.5 py-1 rounded-md">
                      <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>{item.warningNote}</span>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>อ้างอิง พ.ร.บ. ระเบียบข้าราชการครูฯ (ฉบับที่ 5) พ.ศ. 2569, ระเบียบการลาฯ พ.ศ. 2555 และหลักเกณฑ์ ก.ค.ศ. ว 15/2561</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

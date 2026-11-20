'use client';

/**
 * ============================================================================
 * ManStat-Modern: Thai Buddhist Era Pop-up DatePicker (ThaiDatePicker)
 * ============================================================================
 * - Interactive Thai Pop-up Calendar
 * - Year in Buddhist Era (พ.ศ. = ค.ศ. + 543)
 * - Month names in Thai (มกราคม - ธันวาคม / ม.ค. - ธ.ค.)
 * - Day of week headers in Thai: อา. จ. อ. พ. พฤ. ศ. ส.
 * - Under-the-hood standard ISO string value (YYYY-MM-DD) for database & API compatibility
 * - Zero emojis, pure Lucide icons, strict 8px gap
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, RotateCcw } from 'lucide-react';
import { THAI_MONTHS } from '@/lib/regulations/thai-numerals';

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const THAI_DAY_HEADERS = [
  { label: 'อา.', color: 'text-rose-500 dark:text-rose-400' },
  { label: 'จ.', color: 'text-slate-600 dark:text-slate-300' },
  { label: 'อ.', color: 'text-slate-600 dark:text-slate-300' },
  { label: 'พ.', color: 'text-slate-600 dark:text-slate-300' },
  { label: 'พฤ.', color: 'text-slate-600 dark:text-slate-300' },
  { label: 'ศ.', color: 'text-slate-600 dark:text-slate-300' },
  { label: 'ส.', color: 'text-purple-500 dark:text-purple-400' },
];

export interface ThaiDatePickerProps {
  value?: string; // Format: 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  min?: string; // 'YYYY-MM-DD'
  max?: string; // 'YYYY-MM-DD'
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  format?: 'short' | 'full'; // e.g. "20 พ.ย. 2569" vs "20 พฤศจิกายน 2569"
  id?: string;
  name?: string;
}

/**
 * Helper to convert YYYY-MM-DD into Thai formatted display text
 */
export function formatThaiDateDisplay(dateStr?: string, format: 'short' | 'full' = 'short'): string {
  if (!dateStr || !dateStr.includes('-')) return '';
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const yearCE = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  if (isNaN(yearCE) || isNaN(monthIdx) || isNaN(day) || monthIdx < 0 || monthIdx > 11) {
    return dateStr;
  }

  const yearBE = yearCE + 543;
  const monthName = format === 'full' ? THAI_MONTHS[monthIdx] : THAI_MONTHS_SHORT[monthIdx];
  return `${day} ${monthName} ${yearBE}`;
}

export const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({
  value = '',
  onChange,
  min,
  max,
  placeholder = 'เลือกวันที่ (วว/ดด/ปปปป)',
  className = '',
  disabled = false,
  required = false,
  allowClear = true,
  format = 'short',
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view date
  const initialDate = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map((v) => parseInt(v, 10));
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewYearCE, setViewYearCE] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0 - 11

  // Update calendar view when value changes from outside
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map((v) => parseInt(v, 10));
      setViewYearCE(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  // Click-outside and Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYearCE((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYearCE((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Generate Year options (Buddhist Era 2480 - 2580)
  const currentYearCE = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const list: { ce: number; be: number }[] = [];
    for (let y = currentYearCE - 80; y <= currentYearCE + 25; y++) {
      list.push({ ce: y, be: y + 543 });
    }
    return list;
  }, [currentYearCE]);

  // Build days for month view
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYearCE, viewMonth, 1).getDay(); // 0 is Sun, 6 is Sat
    const daysInMonth = new Date(viewYearCE, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYearCE, viewMonth, 0).getDate();

    const days: {
      day: number;
      isCurrentMonth: boolean;
      dateStr: string;
      disabled: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonthCE = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYearCE = viewMonth === 0 ? viewYearCE - 1 : viewYearCE;
      const mm = String(prevMonthCE + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${prevYearCE}-${mm}-${dd}`;
      const isDisabled = (min && dateStr < min) || (max && dateStr > max) || false;

      days.push({
        day: d,
        isCurrentMonth: false,
        dateStr,
        disabled: Boolean(isDisabled),
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(viewMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${viewYearCE}-${mm}-${dd}`;
      const isDisabled = (min && dateStr < min) || (max && dateStr > max) || false;

      days.push({
        day: d,
        isCurrentMonth: true,
        dateStr,
        disabled: Boolean(isDisabled),
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
      });
    }

    // Next month padding to fill full grid (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonthCE = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYearCE = viewMonth === 11 ? viewYearCE + 1 : viewYearCE;
      const mm = String(nextMonthCE + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${nextYearCE}-${mm}-${dd}`;
      const isDisabled = (min && dateStr < min) || (max && dateStr > max) || false;

      days.push({
        day: d,
        isCurrentMonth: false,
        dateStr,
        disabled: Boolean(isDisabled),
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
      });
    }

    return days;
  }, [viewYearCE, viewMonth, min, max, value]);

  const handleSelectDay = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    onChange(todayStr);
    setViewYearCE(y);
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const formattedDisplay = formatThaiDateDisplay(value, format);

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      {/* Hidden input to ensure form integration & validation */}
      {name && (
        <input
          type="hidden"
          name={name}
          id={id}
          value={value}
          required={required}
        />
      )}

      {/* Main Trigger Input Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full h-10 px-3.5 flex items-center justify-between gap-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:text-slate-600 dark:border-slate-800 cursor-not-allowed'
            : isOpen
            ? 'bg-white text-slate-900 border-sky-500 ring-2 ring-sky-500/20 dark:bg-[#101822] dark:text-slate-100 dark:border-sky-500'
            : 'bg-slate-50 hover:bg-white text-slate-900 border-slate-200/90 hover:border-slate-300 dark:bg-[#101822] dark:hover:bg-[#141e2b] dark:text-slate-100 dark:border-slate-700/80 dark:hover:border-slate-600'
        } ${className}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <CalendarIcon className="w-4 h-4 shrink-0 text-sky-500 dark:text-sky-400" />
          {formattedDisplay ? (
            <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
              {formattedDisplay}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="ล้างค่าวันที่"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Pop-up Calendar Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 sm:w-80 p-3.5 bg-white dark:bg-[#121822] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header: Month & Year Selector in Buddhist Era */}
          <div className="flex items-center justify-between gap-1 pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Thai Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="h-8 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#0e141c] border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {THAI_MONTHS.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Buddhist Era (พ.ศ.) Year Dropdown */}
              <select
                value={viewYearCE}
                onChange={(e) => setViewYearCE(parseInt(e.target.value, 10))}
                className="h-8 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#0e141c] border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {yearOptions.map(({ ce, be }) => (
                  <option key={ce} value={ce}>
                    พ.ศ. {be}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day of Week Headers (อา. จ. อ. พ. พฤ. ศ. ส.) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {THAI_DAY_HEADERS.map(({ label, color }) => (
              <div
                key={label}
                className={`text-[11px] font-bold py-1 ${color}`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, index) => {
              let cellStyle = 'text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40';

              if (item.isSelected) {
                cellStyle = 'bg-sky-600 text-white font-bold shadow-sm hover:bg-sky-500';
              } else if (!item.isCurrentMonth) {
                cellStyle = 'text-slate-300 dark:text-slate-600 opacity-60';
              } else if (item.isToday) {
                cellStyle = 'text-sky-600 dark:text-sky-400 font-bold ring-1 ring-sky-500/60 bg-sky-50/50 dark:bg-sky-950/20';
              }

              return (
                <button
                  key={`${item.dateStr}-${index}`}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => handleSelectDay(item.dateStr)}
                  className={`h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${cellStyle} ${
                    item.disabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer'
                  }`}
                  title={formatThaiDateDisplay(item.dateStr, 'full')}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Controls */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSelectToday}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>วันนี้</span>
            </button>

            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ล้างค่า
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

'use client';

/**
 * ============================================================================
 * ManStat: SearchableCombobox (Portal-Based, Viewport-Aware, Grouped/Flat)
 * ============================================================================
 * - Renders dropdown into document.body via createPortal (zIndex: 9999)
 *   so it NEVER clips inside fixed-height scrollable modals.
 * - Automatically flips upward when space below is tight.
 * - Supports flat options (Provinces / Districts / Subdistricts) and
 *   grouped options (8-group 105+ ก.ค.ศ. Majors).
 * - Dual Light/Dark Mode, keyboard Escape, click-outside & ancestor-scroll close.
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface ComboboxOptionGroup {
  group: string;
  items: readonly string[];
}

export interface SearchableComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options?: readonly string[];
  groups?: readonly ComboboxOptionGroup[];
  extraBottomOption?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  value,
  onChange,
  options,
  groups,
  extraBottomOption,
  placeholder = 'เลือกรายการ...',
  searchPlaceholder = 'พิมพ์เพื่อค้นหา...',
  emptyText = 'ไม่พบรายการที่ค้นหา',
  disabled = false,
  allowClear = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const popoverWidth = Math.min(Math.max(rect.width, 260), viewportW - 16);
    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    const flipUp = spaceBelow < 280 && spaceAbove > spaceBelow;
    const clampedLeft = Math.max(8, Math.min(rect.left, viewportW - popoverWidth - 8));

    if (flipUp) {
      setPopoverStyle({
        position: 'fixed',
        left: `${clampedLeft}px`,
        bottom: `${Math.max(8, viewportH - rect.top + 6)}px`,
        width: `${popoverWidth}px`,
        zIndex: 9999,
      });
    } else {
      setPopoverStyle({
        position: 'fixed',
        left: `${clampedLeft}px`,
        top: `${Math.min(rect.bottom + 6, viewportH - 280)}px`,
        width: `${popoverWidth}px`,
        zIndex: 9999,
      });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }

    updatePosition();
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 10);

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleResize = () => setIsOpen(false);

    const handleScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, updatePosition]);

  const filteredFlat = useMemo(() => {
    if (!options) return [];
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((item) => item.toLowerCase().includes(q));
  }, [options, query]);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        group: g.group,
        items: g.items.filter(
          (item) => item.toLowerCase().includes(q) || g.group.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const hasMatches = groups ? filteredGroups.length > 0 : filteredFlat.length > 0;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={triggerRef} className={`relative w-full ${className}`}>
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full h-10 px-3 flex items-center justify-between gap-2 rounded-lg border text-xs select-none transition-colors ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800 cursor-not-allowed'
            : isOpen
            ? 'bg-white text-slate-900 border-sky-500 ring-2 ring-sky-500/20 dark:bg-[#16212e] dark:text-white dark:border-sky-500 cursor-pointer'
            : 'bg-white text-slate-900 border-slate-200/90 hover:border-slate-300 dark:bg-[#16212e] dark:text-white dark:border-slate-700 dark:hover:border-slate-600 cursor-pointer'
        }`}
      >
        <span
          className={`truncate ${
            value ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {allowClear && value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 rounded text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer"
              title="ล้างค่า"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-sky-500' : ''
            }`}
          />
        </div>
      </div>

      {isOpen &&
        popoverStyle &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            role="listbox"
            style={popoverStyle}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#121822] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Sticky Search Input */}
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0e141c]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-8 pl-8 pr-2.5 rounded-lg bg-white dark:bg-[#16212e] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Scrollable Options List */}
            <div className="max-h-60 overflow-y-auto py-1 text-xs">
              {!hasMatches ? (
                <div className="px-3 py-4 text-center text-slate-400 dark:text-slate-500">
                  {emptyText}
                </div>
              ) : groups ? (
                filteredGroups.map((g) => (
                  <div key={g.group} className="mb-1 last:mb-0">
                    <div className="sticky top-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide bg-slate-100/95 dark:bg-[#0f1722]/95 text-slate-500 dark:text-slate-400 border-y border-slate-200/60 dark:border-slate-800/80">
                      {g.group}
                    </div>
                    {g.items.map((item) => {
                      const active = value === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleSelect(item)}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            active
                              ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <span className="truncate">{item}</span>
                          {active && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                filteredFlat.map((item) => {
                  const active = value === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="truncate">{item}</span>
                      {active && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />}
                    </button>
                  );
                })
              )}

              {extraBottomOption && (
                <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSelect(extraBottomOption)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      value === extraBottomOption
                        ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold'
                        : 'text-sky-600 dark:text-sky-400 hover:bg-sky-50/70 dark:hover:bg-sky-950/30 font-medium'
                    }`}
                  >
                    <span>+ {extraBottomOption}</span>
                    {value === extraBottomOption && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

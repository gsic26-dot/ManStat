'use client';

/**
 * ============================================================================
 * ManStat-Modern: UserProfileDropdown Component
 * ============================================================================
 * Compact User Profile Dropdown:
 * - Trigger: Clean Avatar Button + Subtle Chevron (Name/Position/ROOT moved inside)
 * - Dropdown Panel:
 *   - User Profile Information (Name, Position, Code, Role Badge)
 *   - Interactive Avatar Selector with persistent storage
 *   - Quick Theme Switcher (Light / Dark / Auto)
 *   - Personal Settings Modal Trigger ("ตั้งค่าการใช้งานส่วนบุคคล")
 *   - Admin Center Link (if authorized)
 *   - Secure Logout action ("ออกจากระบบ")
 *
 * Strict Zero-Emoji Policy, pure Lucide SVG icons with exact spacing.
 * ============================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Sliders,
  LogOut,
  Sun,
  Moon,
  Clock,
  ShieldCheck,
  ChevronDown,
  Building,
  Award,
  GraduationCap,
  Briefcase,
  Camera,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getRoleBadgeConfig } from '@/lib/auth/roles';

interface CurrentUserRecord {
  id?: string;
  employeeCode?: string;
  name?: string;
  fullName?: string;
  position?: string;
  department?: string;
  accessLevel?: string;
  role?: string;
  email?: string;
}

interface UserProfileDropdownProps {
  onOpenSettings?: () => void;
  showAdminCenterLink?: boolean;
  currentUser?: CurrentUserRecord | null;
  currentRole?: string;
}

interface AvatarPreset {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'initial',
    label: 'ตัวย่อชื่อ',
    bgClass: 'bg-sky-500/15',
    textClass: 'text-sky-600 dark:text-sky-400',
    borderClass: 'border-sky-500/30',
  },
  {
    id: 'director',
    label: 'ผู้บริหาร',
    icon: Award,
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-600 dark:text-purple-400',
    borderClass: 'border-purple-500/30',
  },
  {
    id: 'teacher',
    label: 'ครูผู้สอน',
    icon: GraduationCap,
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-500/30',
  },
  {
    id: 'admin',
    label: 'ผู้ดูแลระบบ',
    icon: ShieldCheck,
    bgClass: 'bg-amber-500/15',
    textClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-500/30',
  },
  {
    id: 'office',
    label: 'งานธุรการ',
    icon: Briefcase,
    bgClass: 'bg-blue-500/15',
    textClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-500/30',
  },
  {
    id: 'staff',
    label: 'บุคลากร',
    icon: User,
    bgClass: 'bg-slate-500/15',
    textClass: 'text-slate-600 dark:text-slate-400',
    borderClass: 'border-slate-500/30',
  },
];

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  onOpenSettings,
  showAdminCenterLink = false,
  currentUser: propUser,
  currentRole: propRole,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('initial');
  const [localUser, setLocalUser] = useState<CurrentUserRecord | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { mode, resolvedTheme, setMode } = useTheme();
  const router = useRouter();

  // Read cached user & avatar preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedAvatar = localStorage.getItem('manstat_user_avatar');
        if (storedAvatar && AVATAR_PRESETS.some((p) => p.id === storedAvatar)) {
          setSelectedAvatar(storedAvatar);
        }
        if (!propUser) {
          const storedUser = localStorage.getItem('manstat_auth_user');
          if (storedUser) {
            setLocalUser(JSON.parse(storedUser));
          }
        }
      } catch {
        // ignore
      }
    }
  }, [propUser]);

  const activeUser = propUser || localUser;
  const effectiveRole = propRole || activeUser?.role || 'teacher';
  const badgeConfig = getRoleBadgeConfig(effectiveRole);

  const displayName = activeUser?.fullName || activeUser?.name || 'ผู้ใช้งานระบบ';
  const displayPosition = activeUser?.position || 'บุคลากรสถานศึกษา';
  const displayCode = activeUser?.employeeCode || activeUser?.id || '';
  const initialLetter = activeUser?.name
    ? activeUser.name.replace(/^(นาย|นางสาว|นาง|ว่าที่ร\.ต\.|ดร\.)\s*/, '').charAt(0)
    : badgeConfig.initial;

  const currentPreset = AVATAR_PRESETS.find((p) => p.id === selectedAvatar) || AVATAR_PRESETS[0];
  const avatarBg = currentPreset.id === 'initial' ? badgeConfig.bgClass : currentPreset.bgClass;
  const avatarText = currentPreset.id === 'initial' ? badgeConfig.textClass : currentPreset.textClass;
  const avatarBorder = currentPreset.id === 'initial' ? badgeConfig.borderClass : currentPreset.borderClass;

  const handleSelectAvatar = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    try {
      localStorage.setItem('manstat_user_avatar', avatarId);
    } catch {
      // ignore
    }
  };

  const renderAvatarContent = (presetId: string, sizeClass = 'w-4 h-4') => {
    const preset = AVATAR_PRESETS.find((p) => p.id === presetId);
    if (!preset || preset.id === 'initial' || !preset.icon) {
      return <span>{initialLetter}</span>;
    }
    const IconComp = preset.icon;
    return <IconComp className={sizeClass} />;
  };

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      // 1. Call server logout API to clear server cookies
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});

      // 2. Clear client-side cookies and storage
      if (typeof window !== 'undefined') {
        document.cookie = 'manstat_session_token=; max-age=0; path=/;';
        document.cookie = 'manstat_auth_role=; max-age=0; path=/;';
        document.cookie = 'manstat_user_id=; max-age=0; path=/;';
        localStorage.removeItem('manstat_auth_role');
        localStorage.removeItem('manstat_auth_user');
      }

      // 3. Supabase Auth signOut if applicable
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignored
    } finally {
      router.push('/login');
    }
  };

  // Close on outside click & Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAvatarPickerOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsAvatarPickerOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger Button - Clean & Compact Avatar Button Only */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200/80 dark:hover:border-slate-800/80 transition-colors duration-200 cursor-pointer focus:outline-none"
        title={`${displayName} (${badgeConfig.label})`}
        aria-label={`${displayName} (${badgeConfig.label})`}
      >
        <div
          className={`w-9 h-9 rounded-xl ${avatarBg} border ${avatarBorder} flex items-center justify-center ${avatarText} font-bold font-mono text-sm shrink-0 shadow-sm transition-transform hover:scale-105`}
        >
          {renderAvatarContent(selectedAvatar, 'w-4 h-4')}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white dark:bg-[#121822] border border-slate-200/90 dark:border-slate-800/80 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-200"
        >
          {/* User Header Profile Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0b1016] border border-slate-200/80 dark:border-slate-800/80 mb-2">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setIsAvatarPickerOpen((prev) => !prev)}
                className={`relative group w-11 h-11 rounded-xl ${avatarBg} border ${avatarBorder} flex items-center justify-center ${avatarText} font-bold font-mono text-base shrink-0 shadow-sm transition-transform hover:scale-105 cursor-pointer`}
                title="คลิกเพื่อเลือกเปลี่ยนอวาตาร์"
              >
                {renderAvatarContent(selectedAvatar, 'w-5 h-5')}
                <div className="absolute inset-0 bg-black/45 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <Camera className="w-4 h-4" />
                </div>
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]" title={displayName}>
                    {displayName}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${badgeConfig.bgClass} ${badgeConfig.textClass} border ${badgeConfig.borderClass} shrink-0`}>
                    {badgeConfig.shortLabel}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={displayPosition}>
                  {displayPosition} {displayCode ? `• ${displayCode}` : ''}
                </div>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    <Building className="w-3 h-3 shrink-0" />
                    <span className="truncate">ร.ร. ชุมชนบ้านตะขบ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAvatarPickerOpen((prev) => !prev)}
                    className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline font-medium shrink-0 cursor-pointer"
                  >
                    {isAvatarPickerOpen ? 'ปิดตัวเลือก' : 'เปลี่ยนอวาตาร์'}
                  </button>
                </div>
              </div>
            </div>

            {/* Expandable Avatar Selector */}
            {isAvatarPickerOpen && (
              <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  เลือกรูปสัญลักษณ์อวาตาร์
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {AVATAR_PRESETS.map((preset) => {
                    const isSelected = selectedAvatar === preset.id;
                    const PresetIcon = preset.icon;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectAvatar(preset.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500/50 shadow-xs ring-1 ring-sky-500/30'
                            : 'bg-white dark:bg-[#141d27] border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg ${preset.bgClass} ${preset.textClass} border ${preset.borderClass} flex items-center justify-center font-mono font-bold text-xs`}>
                          {PresetIcon ? <PresetIcon className="w-3.5 h-3.5" /> : <span>{initialLetter}</span>}
                        </div>
                        <span className="text-[10px] text-slate-600 dark:text-slate-300 truncate w-full">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Theme Switcher Inside Profile */}
          <div className="px-2 py-2 mb-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center justify-between">
              <span>ธีมการแสดงผล</span>
              <span className="text-[9px] font-normal lowercase text-slate-400">
                {resolvedTheme === 'dark' ? 'dark mode' : 'light mode'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-[#0b1016] rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-xs">
              <button
                type="button"
                onClick={() => setMode('light')}
                className={`inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  mode === 'light'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="โหมดสว่าง"
              >
                <Sun className="w-3.5 h-3.5 shrink-0" />
                <span>สว่าง</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('dark')}
                className={`inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  mode === 'dark'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="โหมดมืด"
              >
                <Moon className="w-3.5 h-3.5 shrink-0" />
                <span>มืด</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('auto')}
                className={`inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  mode === 'auto'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="ปรับตามเวลาอัตโนมัติ"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>ออโต้</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-200/80 dark:bg-slate-800/80 my-1" />

          {/* Menu Items */}
          <div className="space-y-0.5">
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <Sliders className="w-4 h-4 text-sky-500 shrink-0" />
                <span>ตั้งค่าการใช้งานส่วนบุคคล</span>
              </button>
            )}

            {showAdminCenterLink && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                <span>ศูนย์ผู้ดูแลระบบ (Admin Center)</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

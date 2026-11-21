'use client';

/**
 * ============================================================================
 * ManStat: Brand Identity & AppLogo Component (Geometric M-Bar)
 * ============================================================================
 * - Option 1: Geometric M-Bar Monogram
 * - Navy background container (#0B1320)
 * - Gradient letter 'M' with statistical data bar (#38BDF8 -> #6366F1)
 * - Single Source of Truth for Favicons, Navigation Headers, and Auth Screens
 * ============================================================================
 */

import React from 'react';

export interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'icon' | 'full';
  className?: string;
  badgeText?: string;
  subtitle?: string;
}

const SIZE_MAP: Record<string, { container: string; pixel: number }> = {
  xs: { container: 'w-6 h-6 rounded-lg', pixel: 24 },
  sm: { container: 'w-8 h-8 rounded-xl', pixel: 32 },
  md: { container: 'w-10 h-10 rounded-xl', pixel: 40 },
  lg: { container: 'w-12 h-12 rounded-2xl', pixel: 48 },
  xl: { container: 'w-16 h-16 rounded-2xl', pixel: 64 },
};

/**
 * Pure SVG Geometric M-Bar Icon
 */
export function AppLogoIcon({
  size = 40,
  className = '',
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="ManStat Logo"
    >
      <defs>
        <linearGradient id="manstatLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>

      {/* Dark Navy Background Base */}
      <rect width="64" height="64" rx="15" fill="#0B1320" />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="14.25"
        stroke="#38BDF8"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />

      {/* Center Statistical Bar */}
      <rect x="28.5" y="41" width="7" height="9" rx="3.5" fill="url(#manstatLogoGrad)" />

      {/* Primary Geometric M Monogram */}
      <path
        d="M 16.5 50 V 17.5 L 32 33.5 L 47.5 17.5 V 50"
        stroke="url(#manstatLogoGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * AppLogo Component supporting Icon-only and Full Lockup variants
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  variant = 'icon',
  className = '',
  badgeText,
  subtitle,
}) => {
  const sizeConfig = typeof size === 'number' ? { pixel: size, container: '' } : SIZE_MAP[size] || SIZE_MAP.md;

  if (variant === 'icon') {
    return (
      <div className={`inline-flex shrink-0 items-center justify-center shadow-md shadow-sky-950/20 ${className}`}>
        <AppLogoIcon size={sizeConfig.pixel} />
      </div>
    );
  }

  // Full Brand Lockup
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="shrink-0 shadow-md shadow-sky-950/20">
        <AppLogoIcon size={sizeConfig.pixel} />
      </div>
      <div className="text-left">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
            ManStat
          </span>
          {badgeText && (
            <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-semibold rounded bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30">
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

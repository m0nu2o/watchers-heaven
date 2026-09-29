'use client';
import React from 'react';
import Link from 'next/link';

interface LuminaLogoProps {
  variant?: 'full' | 'icon' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  className?: string;
}

export function LuminaLogo({
  variant = 'full',
  size = 'md',
  href,
  className = '',
}: LuminaLogoProps) {
  const iconDimensions = {
    sm: { size: 'w-6 h-6' },
    md: { size: 'w-8 h-8' },
    lg: { size: 'w-10 h-10' },
  }[size];

  const textStyles = {
    sm: { title: 'text-xs tracking-[0.22em]', subtitle: 'text-[9px] tracking-[0.25em]' },
    md: { title: 'text-sm tracking-[0.25em]', subtitle: 'text-[10px] tracking-[0.3em]' },
    lg: { title: 'text-lg tracking-[0.28em]', subtitle: 'text-xs tracking-[0.35em]' },
  }[size];

  const LogoIcon = (
    <div
      className={`relative flex items-center justify-center shrink-0 ${iconDimensions.size} rounded-xl bg-gradient-to-b from-white/[0.12] to-white/[0.03] dark:from-white/[0.08] dark:to-white/[0.02] p-1 border border-black/10 dark:border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_4px_16px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,0,0,0.6)] transition-all duration-300 group-hover:border-blue-500/40 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]`}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="lumina-lens-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="lumina-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Outer Precision Ring */}
        <circle
          cx="16"
          cy="16"
          r="13"
          stroke="url(#lumina-ring-grad)"
          strokeWidth="1.25"
          strokeDasharray="3 1.5"
          className="opacity-80"
        />

        {/* Dynamic Celestial Iris Blades */}
        <path
          d="M16 5C17.5 9 20 11.5 24 13C20 14.5 17.5 17 16 21C14.5 17 12 14.5 8 13C12 11.5 14.5 9 16 5Z"
          fill="url(#lumina-lens-glow)"
          className="filter drop-shadow-[0_0_4px_rgba(99,102,241,0.6)]"
        />

        {/* Inner Luminous Core */}
        <circle cx="16" cy="13" r="2.5" fill="#ffffff" />
        <circle cx="16" cy="13" r="4.5" stroke="#ffffff" strokeWidth="0.75" strokeOpacity="0.6" />
      </svg>
    </div>
  );

  const content = (
    <div className={`group inline-flex items-center gap-2.5 select-none ${className}`}>
      {LogoIcon}

      {variant !== 'icon' && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1">
            <span
              className={`font-black uppercase text-slate-900 dark:text-white ${textStyles.title}`}
            >
              Lumina
            </span>
            <span
              className={`font-extrabold uppercase bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 bg-clip-text text-transparent ${textStyles.title}`}
            >
              Cinema
            </span>
          </div>
          {variant === 'full' && (
            <span
              className={`font-medium uppercase text-slate-500 dark:text-slate-400 mt-0.5 ${textStyles.subtitle}`}
            >
              Vision &bull; Stream &bull; Anime
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}

export default LuminaLogo;

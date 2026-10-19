'use client';
import React, { useId } from 'react';
import Link from 'next/link';

export interface LuminaLogoProps {
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
  const uid = useId().replace(/:/g, '');

  const iconDimensions = {
    sm: 'w-7 h-7 sm:w-8 sm:h-8',
    md: 'w-9 h-9 sm:w-10 sm:h-10',
    lg: 'w-12 h-12 sm:w-14 sm:h-14',
  }[size];

  const textStyles = {
    sm: {
      title: 'text-xs sm:text-sm tracking-[0.22em]',
      badge: 'text-[9px] px-1.5 py-0.5 tracking-wider',
      subtitle: 'text-[8px] tracking-[0.3em]',
    },
    md: {
      title: 'text-sm sm:text-base tracking-[0.24em]',
      badge: 'text-[10px] px-2 py-0.5 tracking-wider',
      subtitle: 'text-[9px] tracking-[0.32em]',
    },
    lg: {
      title: 'text-xl sm:text-2xl tracking-[0.26em]',
      badge: 'text-xs px-2.5 py-1 tracking-wider',
      subtitle: 'text-[11px] tracking-[0.35em]',
    },
  }[size];

  const LogoIcon = (
    <div
      className={`relative flex items-center justify-center shrink-0 ${iconDimensions} rounded-2xl p-0.5 transition-all duration-300 ease-out group-hover:scale-105 group-hover:filter group-hover:drop-shadow-[0_0_16px_rgba(56,189,248,0.5)]`}
    >
      <svg
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full aspect-square select-none filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
      >
        <defs>
          {/* Deep Space Obsidian Glass Container */}
          <linearGradient id={`bg-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d1527" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Precision Specular Metallic Rim */}
          <linearGradient id={`rim-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="80%" stopColor="#818cf8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
          </linearGradient>

          {/* Vertical Laser Beam Gradient (Monogram 'L' Spine) */}
          <linearGradient id={`beam-v-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="35%" stopColor="#38bdf8" />
            <stop offset="70%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          {/* Horizontal Cinema Floor Beam Gradient */}
          <linearGradient id={`beam-h-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          {/* Prismatic Overlap Shard */}
          <linearGradient id={`prism-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#4338ca" stopOpacity="0.9" />
          </linearGradient>

          {/* Anamorphic Star Flare Gradient */}
          <linearGradient id={`flare-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#a5f3fc" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* Ambient Nebula Core Glow */}
          <radialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Apple-Grade Tactile Glass Squircle */}
        <rect
          x="3"
          y="3"
          width="90"
          height="90"
          rx="26"
          fill={`url(#bg-${uid})`}
          stroke={`url(#rim-${uid})`}
          strokeWidth="2"
        />

        {/* 2. Ambient Starlight Nebula Behind Flare */}
        <circle cx="64" cy="32" r="26" fill={`url(#glow-${uid})`} />

        {/* 3. Subtle Negative Space Cinema Play Indicator (▶) */}
        <path
          d="M40 28L66 44C67.5 45 67.5 47 66 48L40 64C38.5 65 36 64 36 62V30C36 28 38.5 27 40 28Z"
          fill="#38bdf8"
          fillOpacity="0.1"
        />

        {/* 4. Master Monogram 'L' - Vertical Projection Pillar */}
        <path
          d="M20 22C20 19.8 21.8 18 24 18H34C36.2 18 38 19.8 38 22V56H20V22Z"
          fill={`url(#beam-v-${uid})`}
        />

        {/* 5. Master Monogram 'L' - Horizontal Floor Beam */}
        <path
          d="M20 56H72C74.2 56 76 57.8 76 60V70C76 72.2 74.2 74 72 74H24C21.8 74 20 72.2 20 70V56Z"
          fill={`url(#beam-h-${uid})`}
        />

        {/* 6. Prismatic Joint Corner Facet */}
        <polygon
          points="20,56 38,56 38,74 20,74"
          fill={`url(#prism-${uid})`}
        />

        {/* 7. Specular Inner Edge Lights */}
        <line x1="22" y1="20" x2="22" y2="72" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
        <line x1="22" y1="72" x2="74" y2="72" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />

        {/* 8. Anamorphic Cinema Lens Flare (Horizontal Streak) */}
        <ellipse cx="64" cy="32" rx="28" ry="1.5" fill="#a5f3fc" fillOpacity="0.9" />
        <ellipse cx="64" cy="32" rx="14" ry="2.8" fill="#ffffff" />

        {/* 9. Radiant 8-Point Starlight Nova */}
        {/* 4 Cardinal Rays */}
        <path
          d="M64 16C64.8 24 72 31.2 80 32C72 32.8 64.8 40 64 48C63.2 40 56 31.2 48 32C56 31.2 63.2 24 64 16Z"
          fill="#ffffff"
        />
        {/* 4 Diagonal Micro Rays */}
        <path
          d="M64 22L66.5 29.5L74 32L66.5 34.5L64 42L61.5 34.5L54 32L61.5 29.5L64 22Z"
          fill="#67e8f9"
        />
        {/* Center Diamond Core */}
        <circle cx="64" cy="32" r="3" fill="#ffffff" />
      </svg>
    </div>
  );

  const content = (
    <div className={`group inline-flex items-center gap-2.5 select-none shrink-0 whitespace-nowrap ${className}`}>
      {LogoIcon}

      {variant !== 'icon' && (
        <div className="flex flex-col leading-none shrink-0">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span
              className={`font-black uppercase text-slate-900 dark:text-white ${textStyles.title} transition-colors group-hover:text-blue-500 dark:group-hover:text-blue-400`}
            >
              Lumina
            </span>
            <span
              className={`font-black uppercase rounded-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 text-white shadow-[0_0_14px_rgba(59,130,246,0.4)] ${textStyles.badge}`}
            >
              Cinema
            </span>
          </div>
          {variant === 'full' && (
            <span
              className={`font-medium uppercase text-slate-500 dark:text-slate-400 mt-1 whitespace-nowrap ${textStyles.subtitle}`}
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
      <Link href={href} className="inline-flex items-center shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}

export default LuminaLogo;

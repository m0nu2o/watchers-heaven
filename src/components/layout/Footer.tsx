'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Compass, Film, Tv, Sparkles, ArrowUpRight } from 'lucide-react';
import { LuminaLogo } from '@/components/brand/LuminaLogo';

export function Footer() {
  const pathname = usePathname() || '/';
  
  // Extract locale
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] && ['en', 'am', 'om', 'ti', 'so'].includes(segments[0]) ? segments[0] : 'en';
  const currentPath = '/' + segments.slice(1).join('/');

  // Hide footer entirely when in a Watch Party room
  if (currentPath.startsWith('/party/')) {
    return null;
  }

  return (
    <footer className="w-full mt-8 sm:mt-10 border-t border-black/[0.08] dark:border-white/[0.08] bg-slate-100/50 dark:bg-black/30 backdrop-blur-xl transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col gap-2.5">
        
        {/* Row 1: Brand Logo & Navigation Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-2.5">
            <LuminaLogo variant="full" size="sm" href={`/${locale}`} />
            <span className="hidden md:inline text-[11px] text-slate-500 dark:text-slate-400 border-l border-white/10 pl-2.5">
              Cinema, series & animation verified streaming.
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
            <Link 
              href={`/${locale}/explore`}
              className="inline-flex items-center gap-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <Compass className="w-3 h-3" />
              <span>Explore</span>
            </Link>
            <Link 
              href={`/${locale}/movies`}
              className="inline-flex items-center gap-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <Film className="w-3 h-3" />
              <span>Movies</span>
            </Link>
            <Link 
              href={`/${locale}/tv`}
              className="inline-flex items-center gap-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <Tv className="w-3 h-3" />
              <span>TV Shows</span>
            </Link>
            <Link 
              href={`/${locale}/anime`}
              className="inline-flex items-center gap-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400" />
              <span>Animation</span>
            </Link>
          </div>
        </div>

        {/* Row 2: Copyright, Compact Disclaimer, and Creator Credit */}
        <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 shrink-0">
            <span>&copy; {new Date().getFullYear()} Lumina Cinema</span>
            <span>•</span>
            <span>All rights reserved</span>
          </div>

          {/* Micro Legal Disclaimer */}
          <p className="text-center md:text-left text-[9.5px] text-slate-400 dark:text-slate-500 truncate max-w-xl">
            Disclaimer: Lumina does not host or store files. All media is provided by non-affiliated third-party services.
          </p>

          {/* Creator Credit Handle */}
          <a
            href="https://instagram.com/itxz_baka"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1 text-[10.5px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title="Follow creator @itxz_baka on Instagram"
          >
            <span>Created by</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors">
              @itxz_baka
            </span>
            <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-transform" />
          </a>
        </div>
      </div>
    </footer>
  );
}

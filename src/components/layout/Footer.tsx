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
    <footer className="w-full mt-20 border-t border-black/[0.08] dark:border-white/[0.08] bg-slate-100/60 dark:bg-black/40 backdrop-blur-2xl transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        
        {/* Footer Top Row: Branding and Navigation Links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-1.5">
            <LuminaLogo variant="full" size="md" href={`/${locale}`} />
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
              Cinema, series, and anime with multi-language audio verification and instant playback.
            </p>
          </div>

          <div className="flex items-center gap-5 flex-wrap justify-center text-xs text-slate-600 dark:text-slate-300 font-semibold">
            <Link 
              href={`/${locale}/explore`}
              className="inline-flex items-center gap-1.5 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore</span>
            </Link>
            <Link 
              href={`/${locale}/movies`}
              className="inline-flex items-center gap-1.5 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Movies</span>
            </Link>
            <Link 
              href={`/${locale}/tv`}
              className="inline-flex items-center gap-1.5 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>TV Shows</span>
            </Link>
            <Link 
              href={`/${locale}/anime`}
              className="inline-flex items-center gap-1.5 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Anime Hub</span>
            </Link>
          </div>
        </div>

        {/* Sub-Footer Row: Copyright & Transparent Social Handle */}
        <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} Lumina Cinema</span>
            <span>•</span>
            <span>All rights reserved</span>
          </div>

          {/* Small, Transparent Creator Handle */}
          <a
            href="https://instagram.com/itxz_baka"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 bg-transparent border-0 p-0 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Follow creator @itxz_baka on Instagram"
          >
            <span>Created by</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors">
              @itxz_baka
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 dark:group-hover:text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>

        {/* Legal Disclaimer */}
        <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          <p className="max-w-2xl mx-auto leading-relaxed">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400">Disclaimer:</span>{' '}
            Lumina does not store, host, or distribute any media files. All content is provided by non-affiliated third-party streaming services. All trademarks and copyrights belong to their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}

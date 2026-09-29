'use client';
import { 
  Home, Search, MonitorPlay, Tv, Settings, Radio, Film, Compass, Folder, Bookmark
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LuminaLogo } from '@/components/brand/LuminaLogo';

export function FloatingNav() {
  const pathname = usePathname() || '/';
  const t = useTranslations('Navigation');

  // Extract locale from pathname (e.g., /en/settings -> en)
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] && ['en','am','om','ti','so'].includes(segments[0]) ? segments[0] : 'en';
  // The path after locale
  const currentPath = '/' + segments.slice(1).join('/');

  const navItems = [
    { icon: Home, path: '/', label: t('home') },
    { icon: Search, path: '/search', label: t('search') },
    { icon: MonitorPlay, path: '/movies', label: t('movies') },
    { icon: Tv, path: '/tv', label: t('tvShows') },
    { icon: Compass, path: '/anime', label: t('anime') },
    { icon: Radio, path: '/live', label: t('live') },
    { icon: Film, path: '/k-drama', label: t('kDrama') },
    { icon: Bookmark, path: '/watchlist', label: t('watchlist') },
    { icon: Folder, path: '/collections', label: t('collections') },
  ];

  const bottomItems = [
    { icon: Settings, path: '/settings', label: t('settings') },
  ];

  const isItemActive = (path: string) => {
    if (path === '/') return currentPath === '/' || currentPath === '';
    return currentPath.startsWith(path);
  };

  const localePath = (path: string) => `/${locale}${path === '/' ? '' : path}`;

  // Hide navigation entirely when in a Watch Party room
  if (currentPath.startsWith('/party/')) {
    return null;
  }

  return (
    <nav className="fixed bottom-3 left-3 right-3 lg:bottom-auto lg:left-4 lg:right-auto lg:top-1/2 lg:-translate-y-1/2 z-50 flex items-center justify-center pointer-events-none">
      <div className="apple-glass pointer-events-auto rounded-2xl lg:rounded-3xl shadow-2xl shadow-black/80 flex flex-row lg:flex-col items-center py-2 px-3 lg:py-3.5 lg:px-2 w-full lg:w-16 h-14 lg:h-auto lg:max-h-[90vh] gap-1.5 justify-between lg:justify-start lg:overflow-visible transition-all duration-300">
        

        {/* Main nav icons */}
        <div 
          className="flex flex-row lg:flex-col items-center gap-1 w-full lg:w-auto px-1 overflow-x-auto lg:overflow-visible scrollbar-none flex-1 lg:flex-initial"
          data-lenis-prevent
        >
          {navItems.map((item) => {
            const isActive = isItemActive(item.path);
            return (
              <Link 
                key={item.label} 
                href={localePath(item.path)}
                className="relative group flex justify-center flex-shrink-0"
              >
                <div className={`p-2.5 rounded-xl transition-all duration-200 relative flex items-center justify-center ${
                  isActive 
                    ? 'bg-gradient-to-b from-blue-500/25 to-indigo-600/20 text-blue-400 border border-blue-400/30 shadow-[0_0_16px_rgba(59,130,246,0.3)]' 
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06] hover:scale-105 active:scale-95'
                }`}>
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.4 : 1.8} />
                  {isActive && (
                    <span className="hidden lg:block absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                  )}
                </div>
                
                {/* VisionOS Style Frosted Tooltip */}
                <div className="absolute hidden lg:block opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 bottom-full left-1/2 -translate-x-1/2 mb-3 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:left-full lg:translate-x-0 lg:ml-3 px-3 py-1.5 apple-glass text-slate-100 text-[11px] font-semibold rounded-xl whitespace-nowrap z-[100] shadow-2xl border border-white/10 backdrop-blur-xl">
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
        
        {/* Apple Micro Divider */}
        <div className="w-px h-6 lg:w-8 lg:h-px bg-white/[0.08] my-0 mx-2 lg:my-1.5 lg:mx-0 shrink-0" />

        {/* Bottom Settings & Creator icons */}
        <div className="flex flex-row lg:flex-col items-center gap-1 shrink-0 px-1 lg:overflow-visible">
          {bottomItems.map((item) => {
            const isActive = isItemActive(item.path);
            return (
              <Link 
                key={item.label} 
                href={localePath(item.path)}
                className="relative group flex justify-center flex-shrink-0"
              >
                <div className={`p-2.5 rounded-xl transition-all duration-200 relative flex items-center justify-center ${
                  isActive 
                    ? 'bg-gradient-to-b from-blue-500/25 to-indigo-600/20 text-blue-400 border border-blue-400/30 shadow-[0_0_16px_rgba(59,130,246,0.3)]' 
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06] hover:scale-105 active:scale-95'
                }`}>
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.4 : 1.8} />
                  {isActive && (
                    <span className="hidden lg:block absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                  )}
                </div>
                
                {/* VisionOS Style Frosted Tooltip */}
                <div className="hidden lg:block absolute opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 bottom-full left-1/2 -translate-x-1/2 mb-3 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:left-full lg:translate-x-0 lg:ml-3 px-3 py-1.5 apple-glass text-slate-100 text-[11px] font-semibold rounded-xl whitespace-nowrap z-[100] shadow-2xl border border-white/10 backdrop-blur-xl">
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

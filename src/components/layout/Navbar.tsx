'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Home, 
  Film, 
  Tv, 
  Sparkles, 
  Radio, 
  Bookmark, 
  Folder, 
  Search, 
  Settings, 
  Sun, 
  Moon,
  Layers,
  Bot
} from 'lucide-react';
import { LuminaLogo } from '@/components/brand/LuminaLogo';
import { AiChatModal } from '@/components/chat/AiChatModal';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

export function Navbar() {
  const pathname = usePathname() || '/';
  const t = useTranslations('Navigation');
  const [isDark, setIsDark] = useState(true);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // Extract locale from pathname (e.g., /en/movies -> en)
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] && ['en', 'am', 'om', 'ti', 'so'].includes(segments[0]) ? segments[0] : 'en';
  const currentPath = '/' + segments.slice(1).join('/');

  // Initialize theme state on client mount
  useEffect(() => {
    const checkTheme = () => {
      const mode = localStorage.getItem('setting-theme-mode');
      if (mode === 'light') {
        setIsDark(false);
      } else {
        setIsDark(document.documentElement.classList.contains('dark'));
      }
    };
    checkTheme();

    const handleThemeChange = () => {
      checkTheme();
    };

    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('setting-theme-mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('setting-theme-mode', 'light');
    }
    window.dispatchEvent(new Event('theme-change'));
  };

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: t('home') || 'Home',
      path: '/',
      icon: Home,
    },
    {
      id: 'movies',
      label: t('movies') || 'Movies',
      path: '/movies',
      icon: Film,
    },
    {
      id: 'tv',
      label: t('tvShows') || 'TV Shows',
      path: '/tv',
      icon: Tv,
    },
    {
      id: 'anime',
      label: t('anime') || 'Anime',
      path: '/anime',
      icon: Sparkles,
    },
    {
      id: 'live',
      label: t('live') || 'Live TV',
      path: '/live',
      icon: Radio,
    },
    {
      id: 'kdrama',
      label: t('kDrama') || 'K-Drama',
      path: '/k-drama',
      icon: Layers,
    },
    {
      id: 'watchlist',
      label: t('watchlist') || 'Watchlist',
      path: '/watchlist',
      icon: Bookmark,
    },
    {
      id: 'collections',
      label: t('collections') || 'Collections',
      path: '/collections',
      icon: Folder,
    },
  ];

  const isItemActive = (path: string) => {
    if (path === '/') return currentPath === '/' || currentPath === '';
    return currentPath.startsWith(path);
  };

  const localePath = (path: string) => `/${locale}${path === '/' ? '' : path}`;

  // Hide navigation entirely in Watch Party room for cinema focus
  if (currentPath.startsWith('/party/')) {
    return null;
  }

  return (
    <>
      {/* ──────────────── Apple-grade Desktop Pin-Shaped Left Floating Capsule Dock ──────────────── */}
      <aside className="hidden lg:flex fixed left-3.5 top-1/2 -translate-y-1/2 z-50 w-14 py-3 px-1.5 flex-col items-center justify-center gap-1 rounded-3xl apple-glass shadow-2xl border border-black/10 dark:border-white/10 transition-all duration-300 pointer-events-auto">
        {/* Brand Anchor */}
        <div className="w-full flex justify-center py-1 shrink-0">
          <LuminaLogo variant="icon" size="sm" href={localePath('/')} />
        </div>
        <div className="w-6 h-px bg-black/10 dark:bg-white/10 my-0.5 shrink-0" />

        {/* Center: Vertical Stack of Navigation Icons with Icon-Only Apple Tooltips */}
        <nav className="flex flex-col items-center gap-1 w-full my-0.5" data-lenis-prevent>
          {navItems.map((item) => {
            const active = isItemActive(item.path);
            const isHovered = hoveredItem === item.id;

            return (
              <div
                key={item.id}
                className="relative w-full flex justify-center"
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link
                  href={localePath(item.path)}
                  aria-label={item.label}
                  className={`relative w-9.5 h-9.5 flex items-center justify-center transition-all duration-300 cursor-pointer ${
                    active
                      ? 'rounded-full bg-blue-600/20 text-blue-500 dark:text-white font-semibold ring-2 ring-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.75)] scale-105'
                      : 'rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:scale-105 active:scale-95'
                  }`}
                >
                  <item.icon className="w-4.5 h-4.5" strokeWidth={active ? 2.4 : 1.9} />
                </Link>

                {/* Apple visionOS Frosted Floating Tooltip — Shows ONLY the Icon Name */}
                {isHovered && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl border border-black/10 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold whitespace-nowrap z-50 animate-fadeIn tracking-wide">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="w-6 h-px bg-black/10 dark:bg-white/10 my-0.5 shrink-0" />

        {/* Bottom Utilities: AI Copilot, Search, Theme Toggle, Settings */}
        <div className="flex flex-col items-center gap-1 shrink-0 w-full">
          {/* AI Copilot Button */}
          <div
            className="relative w-full flex justify-center"
            onMouseEnter={() => setHoveredItem('util-ai')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <button
              onClick={() => setIsAiChatOpen(true)}
              aria-label="Lumina AI Copilot"
              className="w-9 h-9 rounded-xl text-blue-500 hover:text-white bg-blue-500/10 hover:bg-blue-600 border border-blue-500/25 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
            >
              <Bot className="w-4 h-4" strokeWidth={2.2} />
            </button>
            {hoveredItem === 'util-ai' && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl border border-black/10 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold whitespace-nowrap z-50 animate-fadeIn tracking-wide">
                Lumina AI
              </div>
            )}
          </div>

          {/* Quick Search */}
          <div
            className="relative w-full flex justify-center"
            onMouseEnter={() => setHoveredItem('util-search')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Link
              href={localePath('/search')}
              aria-label="Search"
              className="w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
            >
              <Search className="w-4 h-4" strokeWidth={2} />
            </Link>
            {hoveredItem === 'util-search' && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl border border-black/10 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold whitespace-nowrap z-50 animate-fadeIn tracking-wide">
                Search
              </div>
            )}
          </div>

          {/* Instant Sun/Moon Theme Toggle */}
          <div
            className="relative w-full flex justify-center"
            onMouseEnter={() => setHoveredItem('util-theme')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <button
              onClick={toggleTheme}
              aria-label="Theme"
              className="w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform duration-300" strokeWidth={2} />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 hover:-rotate-12 transition-transform duration-300" strokeWidth={2} />
              )}
            </button>
            {hoveredItem === 'util-theme' && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl border border-black/10 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold whitespace-nowrap z-50 animate-fadeIn tracking-wide">
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </div>
            )}
          </div>

          {/* Preferences / Settings */}
          <div
            className="relative w-full flex justify-center"
            onMouseEnter={() => setHoveredItem('util-settings')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Link
              href={localePath('/settings')}
              aria-label="Settings"
              className="w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
            >
              <Settings className="w-4 h-4" strokeWidth={2} />
            </Link>
            {hoveredItem === 'util-settings' && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl border border-black/10 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold whitespace-nowrap z-50 animate-fadeIn tracking-wide">
                Settings
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ──────────────── Mobile Navigation (Top Slim Bar + iOS Native Bottom Bar) ──────────────── */}
      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 h-14 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/[0.08] px-4 flex items-center justify-between transition-colors duration-300">
        <LuminaLogo variant="compact" size="sm" href={localePath('/')} />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsAiChatOpen(true)}
            aria-label="Lumina AI"
            className="p-2 rounded-full text-blue-500 hover:text-blue-400"
          >
            <Bot className="w-4 h-4" />
          </button>
          <Link
            href={localePath('/search')}
            aria-label="Search"
            className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white"
          >
            <Search className="w-4 h-4" />
          </Link>
          <button
            onClick={toggleTheme}
            aria-label="Theme"
            className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
          <Link
            href={localePath('/settings')}
            aria-label="Settings"
            className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Frosted Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 h-16 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-around px-2 shadow-2xl transition-colors duration-300">
        {[
          { label: 'Home', path: '/', icon: Home },
          { label: 'Movies', path: '/movies', icon: Film },
          { label: 'Series', path: '/tv', icon: Tv },
          { label: 'Anime', path: '/anime', icon: Sparkles },
          { label: 'Live TV', path: '/live', icon: Radio },
          { label: 'Watchlist', path: '/watchlist', icon: Bookmark },
        ].map((item) => {
          const active = isItemActive(item.path);
          return (
            <Link
              key={item.label}
              href={localePath(item.path)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                active
                  ? 'text-blue-500 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <item.icon className="w-[19px] h-[19px]" strokeWidth={active ? 2.4 : 1.8} />
              <span className="text-[10px] tracking-tight mt-1 leading-none font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Lumina AI Chat Modal */}
      <AiChatModal isOpen={isAiChatOpen} onClose={() => setIsAiChatOpen(false)} />
    </>
  );
}
export default Navbar;

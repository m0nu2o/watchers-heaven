'use client';

import { Download, X, Film, Tv, ExternalLink } from 'lucide-react';
import { ApiGateway } from '@/lib/api/gateway';

interface DownloadModalProps {
  id: string | number;
  title: string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  onClose: () => void;
}

export function DownloadModal({
  id, title, type, season, episode, onClose,
}: DownloadModalProps) {
  const isTv = type === 'tv' && season !== undefined;

  const downloadUrl = isTv
    ? ApiGateway.getTvDownloadUrl(id, season!, episode || 1)
    : ApiGateway.getMovieDownloadUrl(id);

  const cleanTitle = title.replace(/Anime #\d+|Show #\d+|Movie #\d+/g, '').trim();
  const isAnime = type === 'tv' && (title.toLowerCase().includes('arc') || title.toLowerCase().includes('season'));

  const downloadOptions = [
    {
      name: 'RiveStream Direct / High-Speed',
      quality: '1080p / Direct',
      badge: 'Direct',
      color: 'bg-blue-600',
      url: downloadUrl,
    },
    {
      name: '1337x Multi-Audio & Subtitles',
      quality: '1080p / Multi-Language',
      badge: 'Dual Audio',
      color: 'bg-amber-600',
      url: `https://1337x.to/search/${encodeURIComponent(cleanTitle + (isTv ? ` S${String(season || 1).padStart(2, '0')}E${String(episode || 1).padStart(2, '0')}` : ''))}/1/`,
    },
    ...(isTv
      ? [
          {
            name: 'Nyaa 1080p Batch / Episode Search',
            quality: '1080p / Sub & Dub',
            badge: 'Anime',
            color: 'bg-emerald-600',
            url: `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(cleanTitle + (episode ? ` ${episode}` : ''))}`,
          },
        ]
      : [
          {
            name: 'YTS 1080p High-Speed Magnet',
            quality: '1080p / BluRay',
            badge: 'HD',
            color: 'bg-emerald-600',
            url: `https://yts.mx/browse-movies/${encodeURIComponent(cleanTitle)}/all/all/0/latest/0/all`,
          },
        ]),
  ];

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/60 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <Download className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white leading-tight">Download</h2>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-[220px] truncate">{title}</p>
              {isTv && (
                <p className="text-[10px] text-blue-400 font-semibold mt-0.5">
                  Season {season} · Episode {episode}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content type badge */}
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {type === 'movie'
            ? <><Film className="w-3 h-3" /> Movie</>
            : <><Tv className="w-3 h-3" /> TV Show</>
          }
        </div>

        {/* Download Links */}
        <div className="space-y-2">
          <p className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
            Available Download Options
          </p>
          <div className="space-y-2.5">
            {downloadOptions.map((opt, i) => (
              <a
                key={i}
                href={opt.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 w-full px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/40 rounded-2xl transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg text-white shrink-0 ${opt.color}`}>
                    {opt.badge}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate">
                      {opt.name}
                    </p>
                    <p className="text-[10px] text-slate-500">{opt.quality}</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition shrink-0" />
              </a>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          Downloads are routed through external verified streaming servers.
        </p>
      </div>
    </div>
  );
}

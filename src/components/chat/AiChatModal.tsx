'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Sparkles, 
  Send, 
  X, 
  Bot, 
  User, 
  Play, 
  Loader2,
  Film,
  Tv,
  Compass
} from 'lucide-react';

interface ResultItem {
  id: number | string;
  title: string;
  year?: string;
  posterPath?: string | null;
  mediaType?: 'movie' | 'tv' | 'anime';
  rating?: number;
  overview?: string;
  audioBadges?: string[];
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  results?: ResultItem[];
  timestamp: string;
}

const PRESET_PROMPTS = [
  '🇰🇷 Trending Korean Dramas',
  '🇨🇳 Popular Chinese Dramas (C-Drama)',
  '🇮🇳 Hindi Dubbed Bollywood Movies',
  '🇯🇵 English Dubbed Anime',
  '🔥 Find Naruto Shippuden',
];

export function AiChatModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am Lumina AI, your entertainment copilot. Ask me to find movies, anime, K-dramas, or check verified audio availability (Sub/Dub/Hindi). How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sendMessage = async (queryText?: string) => {
    const query = (queryText || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const data = await res.json();
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'Here is what I found for your request:',
        results: data.results || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Sorry, I encountered a temporary connection glitch while checking the catalogs. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xl animate-fadeIn">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div 
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl bg-slate-900/95 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden text-slate-100 z-10"
        data-lenis-prevent
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                Lumina AI Copilot
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Live
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Verified stream finder & catalog recommendations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close AI Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Transcript */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-[300px] max-h-[55vh]">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-3`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-slate-800/80 text-slate-200 border border-white/5 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className="block text-[9px] mt-1 opacity-60 text-right">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Render verified content cards */}
                  {msg.results && msg.results.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {msg.results.map((item) => {
                        const watchPath = `/${locale}/watch/${item.id}?type=${item.mediaType || 'movie'}`;
                        return (
                          <Link
                            key={item.id}
                            href={watchPath}
                            onClick={onClose}
                            className="group flex gap-2.5 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-blue-500/40 transition-all shadow-sm"
                          >
                            <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-slate-950 shrink-0">
                              {item.posterPath ? (
                                <img
                                  src={item.posterPath}
                                  alt={item.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                  {item.mediaType === 'tv' ? <Tv className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                                </div>
                              )}
                              <div className="absolute inset-0 bg-blue-600/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Play className="w-4 h-4 text-white fill-white" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                              <div>
                                <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                                  {item.title}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                  {item.year && <span>{item.year}</span>}
                                  {item.rating && (
                                    <span className="text-amber-400 font-semibold">
                                      ★ {item.rating.toFixed(1)}
                                    </span>
                                  )}
                                  <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-white/10 text-slate-300">
                                    {item.mediaType || 'movie'}
                                  </span>
                                </div>
                              </div>

                              {/* Audio badges */}
                              {item.audioBadges && item.audioBadges.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.audioBadges.slice(0, 2).map((badge, bIdx) => (
                                    <span
                                      key={bIdx}
                                      className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium truncate max-w-[140px]"
                                    >
                                      {badge}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs py-1">
              <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              </div>
              <span className="animate-pulse">Searching entertainment catalog & verifying streams...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 border-t border-white/5 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <Compass className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
          {PRESET_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="text-[11px] whitespace-nowrap px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 hover:border-blue-500/30 transition-all shrink-0 cursor-pointer disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-950/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Lumina AI (e.g. 'Find Hindi movies' or 'Demon Slayer dub')..."
              className="flex-1 bg-slate-800/80 border border-white/10 focus:border-blue-500/60 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/30 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

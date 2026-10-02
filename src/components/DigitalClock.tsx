import React, { useState, useEffect } from 'react';
import { Clock, Calendar, ShieldCheck, PlayCircle } from 'lucide-react';

interface DigitalClockProps {
  sessionStartTime?: number; // timestamp ms
  onTriggerTestTimeout?: () => void;
  compact?: boolean;
}

export const DigitalClock: React.FC<DigitalClockProps> = ({
  sessionStartTime,
  onTriggerTestTimeout,
  compact = false,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // Her saniye saati güncelle
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Formatlama
  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');

  // Türkçe Tarih
  const dateFormatted = currentTime.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const dayName = currentTime.toLocaleDateString('tr-TR', { weekday: 'long' });

  // Oturumdan geçen süre hesabı
  let elapsedMinutes = 0;
  let remainingMinutes = 60;
  if (sessionStartTime) {
    const diffMs = Math.max(0, currentTime.getTime() - sessionStartTime);
    elapsedMinutes = Math.floor(diffMs / 60000);
    remainingMinutes = Math.max(0, 60 - elapsedMinutes);
  }

  return (
    <div className="relative inline-block select-none">
      <div
        id="digital-clock-display"
        onClick={() => setShowDetails(!showDetails)}
        className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#061124]/90 hover:bg-[#0a1b38] border border-cyan-500/40 hover:border-cyan-400/80 shadow-md shadow-cyan-950/40 cursor-pointer transition-all ${
          compact ? 'text-xs' : 'text-xs sm:text-sm'
        }`}
        title="Dijital Saat & 1 Saatlik Oturum Bilgisi (Tıklayarak Detayları Görün)"
      >
        {/* Canlı Yeşil Nabız Göstergesi */}
        <div className="relative flex items-center justify-center shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
          <span className="absolute w-4 h-4 rounded-full bg-emerald-400/30 animate-ping" />
        </div>

        {/* Dijital Saat Göstergesi */}
        <div className="flex items-center font-mono font-black tracking-wider text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
          <span className="text-white">{hours}</span>
          <span className="text-cyan-400 animate-pulse px-0.5">:</span>
          <span className="text-white">{minutes}</span>
          <span className="text-cyan-400 animate-pulse px-0.5">:</span>
          <span className="text-cyan-300 text-[11px] sm:text-xs font-bold">{seconds}</span>
        </div>

        {/* Tarih (Geniş Ekranda) */}
        {!compact && (
          <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-blue-900/60 text-[11px] text-slate-300 font-medium">
            <Calendar className="w-3 h-3 text-cyan-400/80" />
            <span>{dateFormatted}</span>
            <span className="text-slate-400 hidden lg:inline">({dayName})</span>
          </div>
        )}

        {/* Oturum Sayacı Rozeti */}
        {sessionStartTime && (
          <div className="hidden xl:flex items-center gap-1 pl-2 border-l border-blue-900/60 text-[10px] font-mono font-bold text-amber-300">
            <Clock className="w-2.5 h-2.5 text-amber-400" />
            <span>{elapsedMinutes}/60 dk</span>
          </div>
        )}
      </div>

      {/* Tıklanınca Açılan Detaylı Oturum & Saat Paneli */}
      {showDetails && (
        <div
          id="digital-clock-popover"
          className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 p-3.5 rounded-2xl bg-[#08152e] border border-cyan-500/50 shadow-2xl shadow-cyan-950/80 z-50 text-slate-200 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-blue-900/60 mb-2.5">
            <div className="flex items-center gap-1.5 font-bold text-cyan-300">
              <Clock className="w-3.5 h-3.5" />
              <span>DİJİTAL SAAT & OTURUM</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(false);
              }}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Şu Anki Saat:</span>
              <span className="font-bold text-cyan-300">
                {hours}:{minutes}:{seconds}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Tarih:</span>
              <span>{dateFormatted}</span>
            </div>
            {sessionStartTime && (
              <>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Oturumda Geçen:</span>
                  <span className="text-emerald-300 font-bold">{elapsedMinutes} dakika</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Uyarısına Kalan:</span>
                  <span className="text-amber-300 font-bold">{remainingMinutes} dakika</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-blue-900/50 text-[10px] text-slate-400 leading-tight">
            ℹ️ Sayfaya girişten <strong className="text-amber-300">1 saat</strong> sonra ekranda devam onayı istenir. Butona basılmazsa otomatik çıkış yapılır.
          </div>

          {/* Test Butonu */}
          {onTriggerTestTimeout && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(false);
                onTriggerTestTimeout();
              }}
              className="mt-2.5 w-full py-1.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <PlayCircle className="w-3 h-3" />
              <span>1 Saatlik Uyarı Ekranını Test Et</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

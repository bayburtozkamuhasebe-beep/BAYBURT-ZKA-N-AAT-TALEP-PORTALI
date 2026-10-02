import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Clock, ShieldAlert, CheckCircle2, LogOut, RefreshCw } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onLogout: () => void;
  countdownSeconds?: number; // Varsayılan 60 saniye
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  onContinue,
  onLogout,
  countdownSeconds = 60,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(countdownSeconds);
  const audioPlayedRef = useRef<boolean>(false);

  // Modal açıldığında sesli uyarı çal (Web Audio API)
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(countdownSeconds);
      if (!audioPlayedRef.current) {
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.45);
          }
        } catch {
          // Tarayıcı otomatik ses engeline karşı sessizce geç
        }
        audioPlayedRef.current = true;
      }
    } else {
      audioPlayedRef.current = false;
    }
  }, [isOpen, countdownSeconds]);

  // Geri sayım sayacı
  useEffect(() => {
    if (!isOpen) return;

    if (timeLeft <= 0) {
      // Süre doldu, butona tıklanmadı -> Çıkış yap
      onLogout();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft, onLogout]);

  if (!isOpen) return null;

  const percentage = Math.max(0, Math.min(100, (timeLeft / countdownSeconds) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-[#0a152d] border-2 border-amber-500/80 rounded-3xl shadow-2xl shadow-amber-950/80 p-6 sm:p-8 text-center text-slate-100 overflow-hidden">
        {/* Üst Uyarı Arka Plan Işıması */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* İkon */}
        <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-5 shadow-lg shadow-amber-950/60 animate-bounce">
          <AlertTriangle className="w-9 h-9 sm:w-11 sm:h-11 text-amber-400" />
        </div>

        {/* Başlık */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Clock className="w-3.5 h-3.5 animate-spin" />
          <span>1 Saatlik Oturum Süresi Doldu</span>
        </div>

        <h3
          id="session-timeout-title"
          className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1"
        >
          Çalışmaya Devam Edilsin mi?
        </h3>

        {/* Açıklama Metni */}
        <p className="text-slate-300 text-xs sm:text-sm mt-3 leading-relaxed">
          Sayfaya girişinizin üzerinden <strong className="text-amber-300 font-bold">1 saat (60 dakika)</strong> geçti.
          Güvenliğiniz için oturumunuz kontrol ediliyor.
        </p>

        <div className="mt-4 p-3.5 rounded-2xl bg-[#060e1e] border border-amber-500/30 text-xs text-slate-300">
          <p>
            Eğer <strong className="text-amber-400 font-bold">aşağıdaki butona tıklamazsanız</strong>, sistem güvenliğiniz için otomatik olarak çıkış yapacak ve şifre ekranına dönecektir.
          </p>

          {/* Geri Sayım Göstergesi */}
          <div className="mt-3 flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Kalan Yanıt Süresi:
            </span>
            <span className={`font-black text-base ${timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-amber-300'}`}>
              {timeLeft} saniye
            </span>
          </div>

          {/* İlerleme Çubuğu */}
          <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                timeLeft <= 10 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-500 to-amber-300'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Butonlar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="btn-session-continue"
            type="button"
            onClick={onContinue}
            className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-emerald-950/60 border border-emerald-300 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <CheckCircle2 className="w-5 h-5 text-slate-950" />
            <span>EVET, DEVAM ET</span>
          </button>

          <button
            id="btn-session-logout"
            type="button"
            onClick={onLogout}
            className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-[#0c1830] hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-slate-700/60 hover:border-rose-600 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Şimdi Çıkış Yap</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Building2,
  Loader2,
} from 'lucide-react';
import { LogoIcon } from './Logo';
import { DigitalClock } from './DigitalClock';
import { checkAllUserPassword, UserAuthRecord } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess: (kullaniciAdi?: string, isTamYetkili?: boolean) => void;
}

export const AUTH_STORAGE_KEY = 'ozka_talep_auth_token';
export const AUTH_REMEMBER_KEY = 'ozka_talep_remember_me';
export const AUTH_USER_KEY = 'ozka_talep_auth_user';
export const AUTH_USER_DETAILS_KEY = 'ozka_talep_user_details';
export const AUTH_IS_ADMIN_KEY = 'ozka_talep_tam_yetkili';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Oturum açma işlemini tamamla
  const completeLogin = (userName: string, record?: UserAuthRecord | null) => {
    const isTamYetkili = record?.tablo_adi === 'kullanicilar';
    const token = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, token);
      localStorage.setItem(AUTH_REMEMBER_KEY, 'true');
      localStorage.setItem(AUTH_USER_KEY, userName);
      localStorage.setItem(AUTH_IS_ADMIN_KEY, isTamYetkili ? 'true' : 'false');
      if (record) {
        localStorage.setItem(AUTH_USER_DETAILS_KEY, JSON.stringify(record));
      }
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, token);
      sessionStorage.setItem(AUTH_USER_KEY, userName);
      sessionStorage.setItem(AUTH_IS_ADMIN_KEY, isTamYetkili ? 'true' : 'false');
      if (record) {
        sessionStorage.setItem(AUTH_USER_DETAILS_KEY, JSON.stringify(record));
      }
      localStorage.removeItem(AUTH_REMEMBER_KEY);
    }

    onLoginSuccess(userName, isTamYetkili);
  };

  // Form gönderildiğinde (Sadece Giriş Yap butonuna basılınca veya Enter ile çalışır)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanPassword = password.trim();

    if (!cleanPassword) {
      setErrorMsg('Lütfen sistem parolasını giriniz.');
      triggerShake();
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Güvenli sunucu doğrulaması (RPC)
      const result = await checkAllUserPassword(cleanPassword);

      if (result.success && result.kullanici_adi) {
        completeLogin(result.kullanici_adi, result.record);
      } else {
        setErrorMsg(result.error || 'Hatalı parola! Lütfen kontrol edip tekrar deneyiniz.');
        triggerShake();
        setIsSubmitting(false);
        if (inputRef.current) {
          inputRef.current.select();
        }
      }
    } catch (err: any) {
      setErrorMsg('Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.');
      triggerShake();
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="login-screen-container"
      className="min-h-screen w-full bg-[#050b17] flex items-center justify-center p-4 sm:p-6 text-slate-100 relative overflow-hidden"
    >
      {/* Üst Sağ Dijital Saat */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <DigitalClock />
      </div>

      {/* Arka plan ışık efektleri */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div
        className={`relative w-full max-w-md bg-[#0b1933]/95 border border-blue-900/60 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl transition-all ${
          isShaking ? 'animate-shake ring-2 ring-rose-500/50' : ''
        }`}
      >
        {/* Üst Logo ve Başlık */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 rounded-2xl bg-blue-950/80 border border-blue-500/40 shadow-xl shadow-blue-950/50 mb-3.5">
            <LogoIcon size={56} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/50 border border-blue-500/30 text-blue-300 text-[11px] font-bold tracking-wider uppercase mb-2">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>BAYBURT ÖZKA İNŞAAT</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            GİRİŞ PORTALI
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Lütfen parolanızı giriniz
          </p>
        </div>

        {/* Hata Bildirimi */}
        {errorMsg && (
          <div
            id="login-error-alert"
            className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* SADECE PAROLA İLE GİRİŞ FORMU */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-password-input"
              className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2"
            >
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>PAROLANIZ</span>
              </span>
            </label>

            {/* PAROLA TEXTBOX ALANI */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4 text-blue-400" />
              </div>

              <input
                ref={inputRef}
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Parolanızı yazınız..."
                className="w-full pl-10 pr-12 py-3 bg-[#071328] rounded-xl text-sm font-semibold text-white border border-blue-900/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-500 focus:outline-none shadow-inner"
              />

              <button
                type="button"
                id="btn-toggle-password-visibility"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={showPassword ? 'Parolayı Gizle' : 'Parolayı Göster'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Beni Hatırla Seçeneği */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500/40 cursor-pointer"
              />
              <span>Beni hatırla</span>
            </label>
          </div>

          {/* GİRİŞ YAP BUTONU */}
          <button
            type="submit"
            id="btn-login-submit"
            disabled={isSubmitting || !password.trim()}
            className={`w-full mt-2 py-3.5 px-4 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
              password.trim() && !isSubmitting
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-950/60 hover:scale-[1.01] active:scale-[0.99] ring-1 ring-blue-400/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Giriş Yapılıyor...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-blue-300" />
                <span>GİRİŞ YAP</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        {/* Alt Bilgi */}
        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Bayburt Özka İnşaat • Giriş Portalı</span>
        </div>
      </div>
    </div>
  );
};

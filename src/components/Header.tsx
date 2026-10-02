import React from 'react';
import { SiteConfig } from '../types';
import { Layers, RefreshCw, History, ArrowLeft, ArrowRight, FileText, LogOut, User, ShieldCheck, CreditCard } from 'lucide-react';
import { LogoIcon } from './Logo';
import { DigitalClock } from './DigitalClock';

interface HeaderProps {
  activeSite: SiteConfig;
  totalRecords: number;
  totalAmount: number;
  onRefresh: () => void;
  isLoading: boolean;
  currentView?: 'santiye_listesi' | 'talepler' | 'gecmis_odemeler' | 'cari_muavin_pdf' | 'sirket_ibanlar';
  onNavigateToSirketIbanlar?: () => void;
  onNavigateToSantiyeListesi?: () => void;
  onNavigateToGecmis?: () => void;
  onNavigateToTalepler?: () => void;
  onNavigateToPdf?: () => void;
  onLogout?: () => void;
  currentUser?: string;
  isTamYetkili?: boolean;
  sessionStartTime?: number;
  onTriggerTestTimeout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSite,
  totalRecords,
  totalAmount,
  onRefresh,
  isLoading,
  currentView = 'talepler',
  onNavigateToSirketIbanlar,
  onNavigateToSantiyeListesi,
  onNavigateToGecmis,
  onNavigateToTalepler,
  onNavigateToPdf,
  onLogout,
  currentUser,
  isTamYetkili = false,
  sessionStartTime,
  onTriggerTestTimeout,
}) => {
  const isGecmis = currentView === 'gecmis_odemeler';

  return (
    <header
      id="portal-header"
      className="bg-[#0b1933] border-b border-blue-900/50 px-4 sm:px-6 py-3.5 sticky top-0 z-20 backdrop-blur-md"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        {/* Title & Active Site */}
        <div className="flex items-center gap-3.5">
          <div className="p-1 rounded-xl bg-blue-950/80 border border-blue-500/40 shadow-inner flex items-center justify-center shrink-0">
            <LogoIcon size={38} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-blue-400 tracking-wider uppercase flex items-center gap-1.5">
              <span>BAYBURT ÖZKA İNŞAAT</span>
              <span className="text-slate-500">•</span>
              <span className={isGecmis ? 'text-amber-400 font-bold' : 'text-slate-400 font-normal'}>
                {isGecmis ? 'GEÇMİŞ ÖDEME ARŞİVİ' : 'TALEP PORTALI'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {isGecmis ? `${activeSite.name} - ÖDENENLER` : `${activeSite.name} SAYFASI`}
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-900/60 border border-blue-700/50 text-blue-300">
                {activeSite.code}
              </span>
              {isGecmis && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  ARŞİV
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action & Stats & Navigation & Digital Clock */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
          {/* Dijital Saat Bileşeni */}
          <DigitalClock
            sessionStartTime={sessionStartTime}
            onTriggerTestTimeout={onTriggerTestTimeout}
          />

          {/* Stats Box */}
          <div className="flex items-center gap-3 bg-[#081329] px-3.5 py-2 rounded-xl border border-blue-900/50 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Toplam:</span>
              <strong className="text-white font-bold">{totalRecords}</strong>
            </div>
            <div className="w-px h-4 bg-blue-900/60" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="hidden sm:inline">Tutar:</span>
              <strong className="text-emerald-400 font-bold font-mono">
                {new Intl.NumberFormat('tr-TR', {
                  style: 'currency',
                  currency: 'TRY',
                  minimumFractionDigits: 2,
                }).format(totalAmount)}
              </strong>
            </div>
          </div>

          {/* ŞİRKET IBANLAR Butonu (Yenile Butonunun Hemen Solunda) */}
          {onNavigateToSirketIbanlar && (
            <button
              id="btn-top-sirket-ibanlar"
              onClick={onNavigateToSirketIbanlar}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs transition-all shadow-md shadow-blue-950/50 cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-cyan-400/50"
              title="Şirket IBAN ve Banka Hesap Numaraları Sayfasını Aç"
            >
              <CreditCard className="w-3.5 h-3.5 text-cyan-200" />
              <span>ŞİRKET IBANLAR</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            id="btn-refresh-data"
            onClick={onRefresh}
            disabled={isLoading}
            title="Verileri Yenile"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0e1f3d] hover:bg-blue-600 text-slate-200 hover:text-white border border-blue-800/50 hover:border-blue-500 transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Yenile</span>
          </button>

          {/* Cari Muavin (PDF) button */}
          {onNavigateToPdf && (
            <button
              id="btn-top-cari-muavin-pdf"
              onClick={onNavigateToPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#091b38] hover:bg-[#0f2c5c] text-sky-200 hover:text-white border border-sky-500/40 hover:border-sky-400 text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title="Cari Muavin PDF İnceleme Sayfası"
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span className="hidden md:inline">Cari Muavin (PDF)</span>
            </button>
          )}

          {/* View Switcher Button (Top Right as requested) */}
          {!isGecmis ? (
            <button
              id="btn-top-gecmis-odemeler"
              onClick={onNavigateToGecmis}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-950/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <History className="w-4 h-4 text-slate-950" />
              <span>Geçmiş Ödeme Kayıtları</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950 hidden sm:inline" />
            </button>
          ) : (
            <button
              id="btn-top-geri-don"
              onClick={onNavigateToTalepler}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-extrabold text-xs shadow-md shadow-blue-950/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ödeme Talep Alanına Geri Dön</span>
            </button>
          )}
          {/* Current User Badge */}
          {currentUser && (
            <div
              id="header-user-badge"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isTamYetkili
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-200 shadow-sm shadow-amber-950/50'
                  : 'bg-[#091733] border-blue-700/40 text-blue-200'
              }`}
              title={
                isTamYetkili
                  ? `Tam Yetkili Yönetici: ${currentUser} (Tüm Veriler Açık)`
                  : `Giriş Yapan Kullanıcı: ${currentUser}`
              }
            >
              {isTamYetkili ? (
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              )}
              <span className="text-slate-400 hidden xl:inline">
                {isTamYetkili ? 'Yetki:' : 'Kullanıcı:'}
              </span>
              <strong className="text-white font-mono">{currentUser}</strong>
              {isTamYetkili && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider">
                  Tam Yetkili
                </span>
              )}
            </div>
          )}

          {/* Logout Button */}
          {onLogout && (
            <button
              id="btn-logout"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 border border-rose-800/40 hover:border-rose-600 transition-all text-xs font-semibold cursor-pointer"
              title="Güvenli Çıkış Yap"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { SiteConfig } from '../types';
import { SITES, ODENENLER_SITES, getSiteColor } from '../lib/supabase';
import { LogoIcon } from './Logo';
import { DigitalClock } from './DigitalClock';
import {
  Building2,
  ClipboardList,
  History,
  FileText,
  ArrowRight,
  LogOut,
  User,
  Layers,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  CreditCard,
} from 'lucide-react';

interface SantiyeBirimSecimSayfasiProps {
  currentUser?: string;
  isTamYetkili?: boolean;
  siteCounts: Record<string, number>;
  gecmisSiteCounts: Record<string, number>;
  onSelectSiteAndNavigate: (
    site: SiteConfig,
    view: 'talepler' | 'gecmis_odemeler' | 'cari_muavin_pdf'
  ) => void;
  onNavigateToSirketIbanlar?: () => void;
  onLogout: () => void;
  sessionStartTime?: number;
  onTriggerTestTimeout?: () => void;
}

export const SantiyeBirimSecimSayfasi: React.FC<SantiyeBirimSecimSayfasiProps> = ({
  currentUser,
  isTamYetkili = false,
  siteCounts,
  gecmisSiteCounts,
  onSelectSiteAndNavigate,
  onNavigateToSirketIbanlar,
  onLogout,
  sessionStartTime,
  onTriggerTestTimeout,
}) => {
  // Toplam talep ve ödeme sayıları
  const totalTalepCount = (Object.values(siteCounts) as (number | undefined)[]).reduce<number>((a, b) => a + (Number(b) || 0), 0);
  const totalGecmisCount = (Object.values(gecmisSiteCounts) as (number | undefined)[]).reduce<number>((a, b) => a + (Number(b) || 0), 0);

  return (
    <div
      id="santiye-birim-secim-sayfasi"
      className="min-h-screen bg-[#071124] text-slate-100 flex flex-col antialiased relative overflow-x-hidden"
    >
      {/* Arka plan ışık vurguları */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[350px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Üst Bar (Header) */}
      <header className="bg-[#0b1933]/95 border-b border-blue-900/60 px-4 sm:px-8 py-3.5 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Şirket Başlığı */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-950 border border-blue-600/40 shadow-md">
              <LogoIcon size={34} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">
                  BAYBURT ÖZKA İNŞAAT
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-900/60 text-blue-300 border border-blue-700/40">
                  PORTAL
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                Ödeme Talepleri ve Muhasebe Yönetimi
              </h1>
            </div>
          </div>

          {/* Dijital Saat, Kullanıcı Rozeti & Çıkış Yap Butonu */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap">
            {/* Dijital Saat */}
            <DigitalClock
              sessionStartTime={sessionStartTime}
              onTriggerTestTimeout={onTriggerTestTimeout}
            />

            {currentUser && (
              <div
                id="secim-user-badge"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm border ${
                  isTamYetkili
                    ? 'bg-amber-950/80 border-amber-500/60 text-amber-200 shadow-amber-950/50'
                    : 'bg-[#0e2142] border-blue-700/50 text-blue-200'
                }`}
                title={
                  isTamYetkili
                    ? `Tam Yetkili Yönetici: ${currentUser} (Bütün Veriler Görünür)`
                    : `Giriş Yapan: ${currentUser}`
                }
              >
                {isTamYetkili ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <User className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span className="text-slate-400 hidden md:inline">
                  {isTamYetkili ? 'Yetki:' : 'Kullanıcı:'}
                </span>
                <strong className="text-white font-mono">{currentUser}</strong>
                {isTamYetkili && (
                  <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider">
                    Tam Yetkili
                  </span>
                )}
              </div>
            )}

            {/* ŞİRKET IBANLAR Butonu */}
            {onNavigateToSirketIbanlar && (
              <button
                id="btn-secim-sirket-ibanlar"
                onClick={onNavigateToSirketIbanlar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-md border border-cyan-400/40 transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Şirket IBAN ve Banka Hesap Numaraları Sayfasını Aç"
              >
                <CreditCard className="w-3.5 h-3.5 text-cyan-200" />
                <span>ŞİRKET IBANLAR</span>
              </button>
            )}

            <button
              id="btn-secim-logout"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-800/40 transition-all text-xs font-bold cursor-pointer"
              title="Güvenli Çıkış Yap"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Çıkış Yap</span>
            </button>
          </div>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10 flex flex-col justify-between">
        <div>
          {/* Başlık ve Yönlendirme Alanı */}
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-extrabold tracking-wider uppercase mb-3 shadow-inner">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>ŞANTİYE & BİRİM SEÇİM ALANI</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              ŞANTİYE & BİRİM LİSTESİ
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-2 font-normal">
              İşlem yapmak veya ödeme taleplerini yönetmek istediğiniz şantiyeyi aşağıdaki butonlardan seçiniz.
            </p>

            {/* İstatistik Özet Şeridi */}
            <div className="mt-4 flex items-center justify-center gap-3 sm:gap-6 flex-wrap text-xs">
              <div className="px-3.5 py-1.5 rounded-xl bg-[#0c1c38] border border-blue-900/70 text-slate-300 flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5 text-blue-400" />
                <span>Toplam Aktif Talep:</span>
                <strong className="text-blue-300 font-mono text-sm">{totalTalepCount}</strong>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-[#0c1c38] border border-blue-900/70 text-slate-300 flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span>Kayıtlı Geçmiş Ödeme:</span>
                <strong className="text-amber-300 font-mono text-sm">{totalGecmisCount}</strong>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-[#0c1c38] border border-blue-900/70 text-slate-300 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Aktif Birim Sayısı:</span>
                <strong className="text-emerald-300 font-mono text-sm">7 Şantiye</strong>
              </div>
            </div>
          </div>

          {/* 7 ADET ŞANTİYE & BİRİM BUTONU (KART GRID YAPISI) */}
          <div
            id="santiye-butonlari-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
          >
            {SITES.map((site, index) => {
              const talepCount = siteCounts[site.id] || 0;
              const gecmisCount = gecmisSiteCounts[site.id] || 0;
              const odenenSite = ODENENLER_SITES.find((s) => s.id === site.id) || site;
              const color = getSiteColor(site.id);

              return (
                <div
                  key={site.id}
                  id={`santiye-card-${site.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectSiteAndNavigate(site, 'talepler')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSiteAndNavigate(site, 'talepler');
                    }
                  }}
                  className={`group relative bg-[#0b1933]/95 hover:bg-[#0f2349] border-2 border-blue-900/70 ${color.cardBorderHover} rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-200 flex flex-col justify-between cursor-pointer active:scale-[0.99] select-none`}
                  title={`${site.name} - Tıklayarak Giriş Yap`}
                >
                  {/* Kart Üst Bilgisi */}
                  <div>
                    <div className="flex items-center justify-between mb-3.5 pointer-events-none">
                      {/* Sıra & Kod Rozeti */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${color.badgeBg} border ${color.badgeBorder} text-xs font-mono font-extrabold ${color.badgeText}`}>
                        <span className={`w-2 h-2 rounded-full ${color.dotColor} animate-pulse`} />
                        {site.code} • #{index + 1}
                      </span>

                      {/* Aktif Talep Sayısı Rozeti */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                          talepCount > 0
                            ? `${color.badgeBg} ${color.badgeText} ${color.badgeBorder}`
                            : 'bg-slate-800/40 text-slate-400 border-slate-700/40'
                        }`}
                      >
                        {talepCount} Talep
                      </span>
                    </div>

                    {/* Şantiye Adı Başlığı - Her Şantiye Kendi Özel Canlı Renginde */}
                    <div className="w-full text-left group-hover:translate-x-0.5 transition-transform pointer-events-none">
                      <h3 className="text-lg sm:text-xl font-black tracking-tight flex items-center justify-between">
                        <span className={`${color.nameColor} ${color.nameColorHover} transition-colors drop-shadow-sm`}>
                          {site.name}
                        </span>
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        Ödeme talepleri listesi, yeni talep girişi ve işlem onayları
                      </p>
                    </div>

                    {/* İstatistik Satırı */}
                    <div className="mt-3.5 pt-3 border-t border-blue-950/80 flex items-center justify-between text-xs text-slate-400 pointer-events-none">
                      <span>Aktif Talep: <strong className={`${color.nameColor} font-mono`}>{talepCount}</strong></span>
                      <span>Geçmiş: <strong className="text-amber-300 font-mono">{gecmisCount}</strong></span>
                    </div>
                  </div>

                  {/* Buton Aksiyonları (Kartın her yerine tıklanınca giriş yapılır) */}
                  <div className="mt-4 pt-3.5 border-t border-blue-900/60 space-y-2">
                    {/* Ana Giriş Butonu Görünümü - Şantiyenin Kendi Renginde Canlı Gradient */}
                    <div
                      id={`btn-go-talepler-${site.id}`}
                      className={`w-full py-2.5 px-3 rounded-xl bg-gradient-to-r ${color.btnBg} text-white font-black text-xs shadow-md shadow-blue-950/60 flex items-center justify-between transition-all group-hover:brightness-110`}
                    >
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>Giriş Yap ({site.name})</span>
                      </div>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>

                    {/* Alt İkili Buton: Geçmiş Ödemeler & Cari Muavin PDF */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        id={`btn-go-gecmis-${site.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSiteAndNavigate(odenenSite, 'gecmis_odemeler');
                        }}
                        className="py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 hover:text-amber-100 border border-amber-500/30 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Geçmiş Ödemeler Tablosu"
                      >
                        <History className="w-3 h-3 text-amber-400" />
                        <span className="truncate">Geçmiş</span>
                      </button>

                      <button
                        type="button"
                        id={`btn-go-pdf-${site.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSiteAndNavigate(site, 'cari_muavin_pdf');
                        }}
                        className="py-1.5 px-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/25 text-sky-300 hover:text-sky-100 border border-sky-500/30 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Cari Muavin PDF Sayfası"
                      >
                        <FileText className="w-3 h-3 text-sky-400" />
                        <span className="truncate">Cari Muavin</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alt Güvenlik & Telif Bilgisi */}
        <footer className="mt-12 pt-6 border-t border-blue-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Bayburt Özka İnşaat A.Ş. • Şantiye Finans & Ödeme Portalı</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>7 Şantiye Birimi Entegre</span>
            <span>•</span>
            <span className="text-slate-400 font-mono">v2.4.0</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

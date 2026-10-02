import React from 'react';
import { SITES, ODENENLER_SITES, getSiteColor } from '../lib/supabase';
import { SiteConfig, SiteId } from '../types';
import {
  Layers,
  ChevronRight,
  ClipboardList,
  History,
  FileText,
  Building2,
  CheckCircle2,
  Lock,
  ArrowLeft,
} from 'lucide-react';

interface SantiyeBirimListesiPanelProps {
  activeSiteId: SiteId;
  onSelectSite: (site: SiteConfig) => void;
  siteCounts: Record<string, number>;
  currentView?: 'santiye_listesi' | 'talepler' | 'gecmis_odemeler' | 'cari_muavin_pdf' | 'sirket_ibanlar';
  onSwitchView?: (view: 'santiye_listesi' | 'talepler' | 'gecmis_odemeler' | 'cari_muavin_pdf' | 'sirket_ibanlar') => void;
}

export const SantiyeBirimListesiPanel: React.FC<SantiyeBirimListesiPanelProps> = ({
  activeSiteId,
  onSelectSite,
  siteCounts,
  currentView = 'talepler',
  onSwitchView,
}) => {
  const isGecmis = currentView === 'gecmis_odemeler';
  const isPdf = currentView === 'cari_muavin_pdf';
  const currentSites = isGecmis ? ODENENLER_SITES : SITES;

  const activeSite = currentSites.find((s) => s.id === activeSiteId) || currentSites[0];

  return (
    <div
      id="santiye-birim-listesi-panel"
      className="bg-[#0e1d38] border border-blue-900/60 rounded-2xl p-5 shadow-xl flex flex-col justify-between h-full"
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-blue-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-950 border border-blue-700/50 shadow-inner text-sky-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
                ŞANTİYE & BİRİM LİSTESİ
              </h3>
              <p className="text-[11px] text-blue-300 font-medium">
                7 Şantiye Sayfası • Tek Tıkla Geçiş
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-blue-950 border border-blue-800/60 text-[10px] font-mono text-sky-300 font-bold">
            7 BİRİM
          </span>
        </div>

        {/* View Switcher Tabs inside Panel */}
        {onSwitchView && (
          <div className="mb-3.5 space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#071124] rounded-xl border border-blue-900/50">
              <button
                type="button"
                id="panel-tab-talepler"
                onClick={() => onSwitchView('talepler')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'talepler'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/60 ring-1 ring-blue-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-blue-950/50'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Talepler</span>
              </button>

              <button
                type="button"
                id="panel-tab-gecmis"
                onClick={() => onSwitchView('gecmis_odemeler')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'gecmis_odemeler'
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-950/60 ring-1 ring-amber-400 font-extrabold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-blue-950/50'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Geçmiş</span>
              </button>
            </div>

            <button
              type="button"
              id="panel-tab-muavin-pdf"
              onClick={() => onSwitchView('cari_muavin_pdf')}
              className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isPdf
                  ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-950/60 ring-1 ring-sky-400'
                  : 'bg-[#09152b] text-sky-300 hover:text-white hover:bg-blue-950 border-blue-900/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Cari Muavin (PDF İnceleme)</span>
            </button>
          </div>
        )}

        {/* 7 Şantiye Butonları: Tıklanan hariç diğerleri enabled=false (disabled) */}
        <div className="space-y-1.5" role="tablist" aria-label="Şantiye Birimleri">
          {currentSites.map((site, index) => {
            const isActive = site.id === activeSiteId;
            const count = siteCounts[site.tableName] ?? 0;
            // TIKLANAN BUTON HARİÇ DİĞER BUTONLAR ENABLED FALSE (disabled={true})
            const isClickDisabled = !isActive;
            const color = getSiteColor(site.id);

            return (
              <button
                key={site.id}
                id={`panel-santiye-btn-${site.id}`}
                type="button"
                disabled={isClickDisabled}
                aria-disabled={isClickDisabled}
                onClick={() => onSelectSite(site)}
                className={`w-full group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 border ${
                  isActive
                    ? isGecmis
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold border-amber-300 shadow-md shadow-amber-950/50 scale-[1.01] cursor-default'
                      : 'bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 text-white font-bold border-sky-300 shadow-md shadow-sky-950/60 scale-[1.01] cursor-default ring-2 ring-sky-400/40'
                    : 'bg-[#060e1d]/80 border-blue-950/70 opacity-60 cursor-not-allowed select-none'
                }`}
                title={
                  isActive
                    ? `${site.name} (Seçili & Aktif Birim)`
                    : `${site.name} (Devre Dışı - Birim değiştirmek için Şantiye Listesi sayfasına dönünüz)`
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-black shrink-0 ${
                      isActive
                        ? isGecmis
                          ? 'bg-black/20 text-slate-950 font-black'
                          : 'bg-white/20 text-white shadow-inner font-black'
                        : `${color.badgeBg} ${color.badgeBorder} ${color.nameColor} border`
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`truncate text-xs font-bold tracking-wide ${
                      isActive
                        ? isGecmis
                          ? 'text-slate-950 font-black'
                          : 'text-white font-black'
                        : color.nameColor
                    }`}
                  >
                    {site.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isClickDisabled ? (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 font-mono">
                      <Lock className="w-2.5 h-2.5 text-slate-500" />
                      <span>Kilitli</span>
                    </span>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono transition-colors ${
                        count >= 1
                          ? 'bg-emerald-600 text-white border border-emerald-400 shadow-xs font-black'
                          : isGecmis
                          ? 'bg-slate-950/30 text-slate-950'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      {count}
                    </span>
                  )}

                  {isActive ? (
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        isGecmis ? 'text-slate-950' : 'text-emerald-300'
                      }`}
                    />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Belirgin ŞANTİYE LİSTESİNE DÖN Butonu */}
        {onSwitchView && (
          <div className="mt-3.5">
            <button
              type="button"
              id="panel-btn-santiye-listesine-don"
              onClick={() => onSwitchView('santiye_listesi')}
              className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-500 hover:via-sky-400 hover:to-indigo-500 text-white font-black text-xs tracking-wider uppercase border-2 border-sky-300 shadow-lg shadow-sky-950/70 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ring-2 ring-sky-400/40"
              title="Şantiye & Birim Listesi sayfasına geri dönün"
            >
              <ArrowLeft className="w-4 h-4 text-white shrink-0" />
              <Layers className="w-4 h-4 text-sky-100 shrink-0" />
              <span>ŞANTİYE LİSTESİNE DÖN</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="mt-3 pt-3 border-t border-blue-900/50 bg-[#071124]/70 -mx-2 -mb-2 p-3 rounded-xl">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] text-slate-400">Aktif Seçili:</span>
            <strong className="text-white font-bold truncate max-w-[130px]">
              {activeSite.name}
            </strong>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-blue-950 text-sky-300 border border-blue-800/60 font-mono text-[10px]">
            {activeSite.tableName}
          </span>
        </div>
      </div>
    </div>
  );
};

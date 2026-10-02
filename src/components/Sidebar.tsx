import React from 'react';
import { SITES, ODENENLER_SITES, getSiteColor } from '../lib/supabase';
import { SiteConfig, SiteId } from '../types';
import { ChevronRight, FileSpreadsheet, Building2, History, ClipboardList, FileText, Layers, CreditCard } from 'lucide-react';
import { BrandLogo } from './Logo';

interface SidebarProps {
  activeSiteId: SiteId;
  onSelectSite: (site: SiteConfig) => void;
  siteCounts: Record<string, number>;
  currentView?: 'santiye_listesi' | 'talepler' | 'gecmis_odemeler' | 'cari_muavin_pdf' | 'sirket_ibanlar';
  onSwitchView?: (view: 'santiye_listesi' | 'talepler' | 'gecmis_odemeler' | 'cari_muavin_pdf' | 'sirket_ibanlar') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSiteId,
  onSelectSite,
  siteCounts,
  currentView = 'talepler',
  onSwitchView,
}) => {
  const isGecmis = currentView === 'gecmis_odemeler';
  const isPdf = currentView === 'cari_muavin_pdf';
  const currentSites = isGecmis ? ODENENLER_SITES : SITES;

  return (
    <aside
      id="portal-sidebar"
      className="w-full lg:w-72 bg-[#09152b] border-r border-blue-900/40 flex flex-col shrink-0 min-h-screen"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-blue-900/40 bg-[#060e1e]">
        <BrandLogo size={46} showText={true} />
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/80 border border-blue-800/40 text-[11px] font-medium text-blue-300 w-full justify-center">
          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
          <span>Talep & Ödeme Portalı</span>
        </div>
      </div>

      {/* View Switcher Tabs inside Sidebar */}
      {onSwitchView && (
        <div className="p-3 border-b border-blue-900/40 bg-[#081224] space-y-1.5">
          {/* Şantiye & Birim Listesi Ana Sayfası Butonu */}
          <button
            type="button"
            id="sidebar-tab-santiye-listesi"
            onClick={() => onSwitchView('santiye_listesi')}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              currentView === 'santiye_listesi'
                ? 'bg-blue-700 text-white border-blue-400 shadow-md shadow-blue-950/60 ring-1 ring-blue-400/50'
                : 'bg-[#0b1b38] text-blue-200 hover:text-white hover:bg-blue-900/60 border-blue-700/50'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Şantiye & Birim Listesi</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#050b18] rounded-xl border border-blue-900/40">
            <button
              id="sidebar-tab-talepler"
              onClick={() => onSwitchView('talepler')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentView === 'talepler'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-blue-950/40'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Talepler</span>
            </button>

            <button
              id="sidebar-tab-gecmis"
              onClick={() => onSwitchView('gecmis_odemeler')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentView === 'gecmis_odemeler'
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-blue-950/40'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Geçmiş</span>
            </button>
          </div>

          <button
            id="sidebar-tab-muavin-pdf"
            onClick={() => onSwitchView('cari_muavin_pdf')}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isPdf
                ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-950/60 ring-1 ring-sky-400/50'
                : 'bg-[#060f21] text-sky-300 hover:text-white hover:bg-blue-950/60 border-blue-900/60'
            }`}
          >
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Cari Muavin (PDF İnceleme)</span>
          </button>

          {/* Şirket IBANlar Butonu */}
          <button
            id="sidebar-tab-sirket-ibanlar"
            onClick={() => onSwitchView('sirket_ibanlar')}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              currentView === 'sirket_ibanlar'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400/50'
                : 'bg-[#06142a] text-cyan-300 hover:text-white hover:bg-blue-950/60 border-cyan-900/60'
            }`}
          >
            <CreditCard className="w-4 h-4 text-cyan-400" />
            <span>Şirket IBANlar</span>
          </button>
        </div>
      )}

      {/* Navigation Title */}
      <div className="px-5 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between">
        <span className={isGecmis ? 'text-amber-400/90' : 'text-blue-400/80'}>
          {isGecmis ? 'GEÇMİŞ ÖDENENLER (7 ŞANTİYE)' : 'ŞANTİYE & BİRİM LİSTESİ (7 SAYFA)'}
        </span>
      </div>

      {/* 7 Vertical Buttons */}
      <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto" aria-label="Şantiyeler">
        {currentSites.map((site, index) => {
          const isActive = site.id === activeSiteId;
          const count = siteCounts[site.tableName] ?? 0;
          const color = getSiteColor(site.id);

          return (
            <button
              key={site.id}
              id={`nav-btn-${isGecmis ? 'gecmis-' : ''}${site.id}`}
              onClick={() => onSelectSite(site)}
              className={`w-full group relative flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                isActive
                  ? isGecmis
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-950/40'
                    : 'bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 text-white font-bold shadow-lg shadow-sky-950/60 border border-sky-300/60 scale-[1.01]'
                  : 'bg-[#0c1b36] hover:bg-[#152c56] border border-blue-900/60 hover:border-sky-400/50 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0 ${
                    isActive
                      ? isGecmis
                        ? 'bg-black/20 text-slate-950'
                        : 'bg-white/20 text-white shadow-inner font-extrabold'
                      : `${color.badgeBg} ${color.badgeBorder} ${color.nameColor} border`
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`truncate text-sm tracking-wide ${
                    isActive
                      ? isGecmis
                        ? 'text-slate-950 font-bold'
                        : 'text-white font-bold'
                      : `${color.nameColor} font-bold`
                  }`}
                >
                  {site.name}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                    count >= 1
                      ? 'bg-emerald-600 text-white border border-emerald-400 shadow-sm font-black'
                      : isActive
                      ? isGecmis
                        ? 'bg-slate-950/30 text-slate-950 font-semibold'
                        : 'bg-white/20 text-white font-semibold'
                      : 'bg-blue-950 text-slate-400 border border-blue-900/60'
                  }`}
                >
                  {count}
                </span>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    isActive
                      ? isGecmis
                        ? 'text-slate-950 translate-x-0.5'
                        : 'text-white translate-x-0.5'
                      : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-blue-900/40 bg-[#060e1e] text-xs text-slate-400 space-y-2">
        <div className="text-[11px] text-slate-400 font-medium tracking-wide">
          Yazılım ve Tasarım : <span className="text-slate-200 font-semibold">Emirhan KALHAN</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            Sistem Aktif
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 text-[10px] font-medium">
            Supabase Bağlı
          </span>
        </div>
      </div>
    </aside>
  );
};

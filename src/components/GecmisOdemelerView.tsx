import React, { useState } from 'react';
import { SiteConfig, TalepRecord } from '../types';
import { ODENENLER_SITES, getSiteColor } from '../lib/supabase';
import { TalepTable } from './TalepTable';
import { BottomMuavinPdfViewer } from './BottomMuavinPdfViewer';
import {
  ArrowLeft,
  History,
  Archive,
  Layers,
  Database,
  CheckCircle2,
} from 'lucide-react';

interface GecmisOdemelerViewProps {
  activeSite: SiteConfig;
  onSelectSite: (site: SiteConfig) => void;
  records: TalepRecord[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onBackToTalepler: () => void;
  onBackToSantiyeListesi?: () => void;
  onDeleteRecord: (id: string | number) => Promise<void>;
  onUpdateRecord?: (
    id: string | number,
    updatedData: {
      firma_unvani: string;
      iban_no: string;
      aciklama: string;
      odenecek_tutar: number;
      talep_eden: string;
      durumu: string;
      cari_bakiye?: number | string | null;
      fatura_no?: string;
      fatura_tarihi?: string;
      fatura_tutari?: number;
      fatura_dosya_adi?: string;
      fatura_dosya_url?: string;
    }
  ) => Promise<boolean>;
  siteCounts: Record<string, number>;
  onOpenMuavinPdf?: (site: SiteConfig, firma: string) => void;
  currentUser?: string;
  isTamYetkili?: boolean;
}

export const GecmisOdemelerView: React.FC<GecmisOdemelerViewProps> = ({
  activeSite,
  onSelectSite,
  records,
  isLoading,
  onRefresh,
  onBackToTalepler,
  onBackToSantiyeListesi,
  onDeleteRecord,
  onUpdateRecord,
  siteCounts,
  onOpenMuavinPdf,
  currentUser,
  isTamYetkili = false,
}) => {
  const [bottomPdfQuery, setBottomPdfQuery] = useState<string>('');

  const handleScrollToBottomPdf = (site: SiteConfig, firmaUnvani?: string) => {
    if (firmaUnvani) {
      setBottomPdfQuery(firmaUnvani);
    }
    setTimeout(() => {
      const el = document.getElementById('bottom-muavin-pdf-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        const input = document.getElementById('bottom-pdf-search-input') as HTMLInputElement;
        if (input) input.focus();
      }
    }, 150);
  };

  // Calculate total amount for the active past payments table
  const totalAmount = records.reduce((sum, r) => {
    const val = r.odenecek_tutar ?? r.tutar ?? r.odenen_tutar ?? 0;
    const num = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
    return sum + num;
  }, 0);

  return (
    <div className="space-y-6 max-w-[1920px] w-full mx-auto animate-fade-in">
      {/* 1. Top Navigation & Return Bar */}
      <div className="bg-[#0b1933] border border-blue-900/60 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            id="btn-back-to-talepler"
            onClick={onBackToTalepler}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-950/50 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-blue-400/30"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            <span>Taleplere Dön</span>
          </button>

          {onBackToSantiyeListesi && (
            <button
              id="btn-back-to-santiye-listesi"
              onClick={onBackToSantiyeListesi}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-blue-200 hover:text-white font-bold text-xs sm:text-sm shadow-md border border-blue-600/50 transition-all cursor-pointer"
              title="Şantiye & Birim Listesi Sayfası"
            >
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Şantiye Listesi</span>
            </button>
          )}

          <div className="h-8 w-px bg-blue-900/60 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <History className="w-4 h-4" />
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                GEÇMİŞ ÖDEME KAYITLARI
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tamamlanan ve arşive aktarılan şantiye ödemeleri listesi
            </p>
          </div>
        </div>

        {/* Quick Site Info Banner */}
        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#081329] border border-blue-900/50 text-xs">
            <Archive className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Aktif Sekme:</span>
            <strong className="text-white font-bold">{activeSite.name}</strong>
            <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 text-[10px] font-mono">
              {activeSite.tableName}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#081329] border border-blue-900/50 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Toplam:</span>
            <strong className="text-emerald-300 font-bold font-mono">
              {new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: 'TRY',
                minimumFractionDigits: 2,
              }).format(totalAmount)}
            </strong>
          </div>
        </div>
      </div>

      {/* 2. 7 Horizontal Tabs (Sekmeler) as requested */}
      <div className="bg-[#09152b] border border-blue-900/60 rounded-2xl p-2.5 shadow-lg">
        <div className="text-[11px] font-bold text-blue-400/90 uppercase tracking-wider px-3 pt-1 pb-2 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5" />
          <span>ŞANTİYE & BİRİM SEKMELERİ (7 SEKME)</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 scrollbar-thin scrollbar-thumb-blue-800">
          {ODENENLER_SITES.map((site, index) => {
            const isActive = site.id === activeSite.id;
            const count = siteCounts[site.tableName] ?? (isActive ? records.length : 0);
            const color = getSiteColor(site.id);

            return (
              <button
                key={site.id}
                id={`gecmis-tab-${site.id}`}
                onClick={() => onSelectSite(site)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-md shadow-amber-950/50 scale-[1.02]'
                    : 'bg-[#0e1d38] hover:bg-[#162a4d] border-blue-900/60 hover:border-blue-700'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold ${
                    isActive
                      ? 'bg-black/20 text-slate-950'
                      : `${color.badgeBg} ${color.badgeBorder} ${color.nameColor} border`
                  }`}
                >
                  {index + 1}
                </span>

                <span
                  className={`tracking-wide ${
                    isActive ? 'text-slate-950 font-black' : `${color.nameColor} font-bold`
                  }`}
                >
                  {site.name}
                </span>

                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors ${
                    count >= 1
                      ? 'bg-emerald-600 text-white border border-emerald-400 shadow-sm font-black'
                      : isActive
                      ? 'bg-slate-950/30 text-slate-950'
                      : 'bg-blue-950 text-slate-400 border border-blue-900/60'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Table of Past Payments for the Active Tab */}
      <TalepTable
        activeSite={activeSite}
        records={records}
        isLoading={isLoading}
        onRefresh={onRefresh}
        onDeleteRecord={onDeleteRecord}
        onUpdateRecord={onUpdateRecord}
        isPastPayments={true}
        customTitle={`${activeSite.name} — Geçmiş Ödenenler Listesi`}
        onOpenMuavinPdf={onOpenMuavinPdf}
        currentUser={currentUser}
        isTamYetkili={isTamYetkili}
      />

      {/* EN ALTTA: Seçili alanın Muavin PDF'i ve Arama Textbox'ı */}
      <BottomMuavinPdfViewer
        activeSite={activeSite}
        initialSearchQuery={bottomPdfQuery}
        onOpenFullScreen={onOpenMuavinPdf}
      />
    </div>
  );
};

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  CreditCard,
  Building,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Check,
  Calendar,
  Banknote,
  Search,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Database,
  Layers,
  History,
  FileSpreadsheet,
  Info,
} from 'lucide-react';
import { SiteConfig, TalepRecord } from '../types';
import { analyzeIBAN } from '../utils/iban';
import { formatCurrency, formatDate, formatIBAN } from '../utils/formatters';
import {
  fetchTalepRecords,
  searchFirmaInOdenenlerTables,
  FirmaOdenenlerSearchResult,
  FirmaOdenenlerMatch,
  ODENENLER_PRIORITY_TABLES,
  OdenenlerTableDefinition,
  getOdenenlerTableForSite,
  normalizeTurkishText,
} from '../lib/supabase';

interface IbanSorgulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIban: string;
  currentFirma?: string;
  activeSite?: SiteConfig;
  onSelectBoth?: (firma: string, iban: string) => void;
  onSelectFirma?: (firma: string) => void;
  onSelectIban?: (iban: string) => void;
}

interface EnrichedOdenenlerRow {
  id: string | number;
  tableDef: OdenenlerTableDefinition;
  firma_unvani: string;
  iban_no: string;
  tutar: number;
  odeme_tarihi?: string;
  aciklama?: string;
  talep_eden?: string;
  durumu?: string;
  rawRecord: TalepRecord;
}

/**
 * Arama terimini metin içinde görsel olarak vurgulayan yardımcı fonksiyon
 */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <span>{text || '-'}</span>;

  const qTrim = query.trim().toLocaleLowerCase('tr-TR');
  const textLower = text.toLocaleLowerCase('tr-TR');
  const index = textLower.indexOf(qTrim);

  if (index === -1) {
    return <span>{text}</span>;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + qTrim.length);
  const after = text.slice(index + qTrim.length);

  return (
    <span>
      {before}
      <mark className="bg-emerald-500/30 text-emerald-300 font-extrabold px-0.5 rounded border border-emerald-500/40">
        {match}
      </mark>
      {after}
    </span>
  );
}

export const IbanSorgulaModal: React.FC<IbanSorgulaModalProps> = ({
  isOpen,
  onClose,
  initialIban,
  currentFirma = '',
  activeSite,
  onSelectBoth,
  onSelectFirma,
  onSelectIban,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Determine relevant page's table definition
  const relevantTableDef: OdenenlerTableDefinition = useMemo(() => {
    return getOdenenlerTableForSite(activeSite);
  }, [activeSite]);

  // Selected filter view: 'relevant' | 'all' | specific tableName
  const [selectedTableView, setSelectedTableView] = useState<string>('relevant');

  // Search query for Firma Ünvanı (Canlı filtreleme metni)
  const [queryFirma, setQueryFirma] = useState(currentFirma || '');
  const [isSearchingFirma, setIsSearchingFirma] = useState(false);
  const [firmaSearchResult, setFirmaSearchResult] =
    useState<FirmaOdenenlerSearchResult | null>(null);

  // Table rows and loading state
  const [allOdenenlerRows, setAllOdenenlerRows] = useState<EnrichedOdenenlerRow[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);

  // Copy feedback state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Helper to load records from the 5 priority tables
  const loadOdenenlerRecords = useCallback(async () => {
    setIsLoadingRows(true);
    try {
      const allRows: EnrichedOdenenlerRow[] = [];

      // Fetch from all 5 priority tables in parallel
      const results = await Promise.all(
        ODENENLER_PRIORITY_TABLES.map(async (tableDef) => {
          const { data } = await fetchTalepRecords(tableDef.tableName);
          return { tableDef, data: data || [] };
        })
      );

      results.forEach(({ tableDef, data }) => {
        data.forEach((r) => {
          const firma = (r.firma_unvani || r.firma_adi || r.firma || '').trim();
          const iban = (r.iban_no || r.iban || '').trim();
          const tutar =
            typeof r.odenecek_tutar === 'number'
              ? r.odenecek_tutar
              : typeof r.tutar === 'number'
              ? r.tutar
              : parseFloat(String(r.odenecek_tutar || r.tutar || '0').replace(/[^0-9.-]+/g, '')) || 0;

          if (firma || iban) {
            allRows.push({
              id: r.id || `${tableDef.tableName}_${Math.random()}`,
              tableDef,
              firma_unvani: firma,
              iban_no: iban,
              tutar,
              odeme_tarihi: r.odeme_tarihi || r.created_at,
              aciklama: r.aciklama,
              talep_eden: r.talep_eden,
              durumu: r.durumu || r.durum,
              rawRecord: r,
            });
          }
        });
      });

      setAllOdenenlerRows(allRows);
    } catch (err) {
      console.error('Geçmiş ödemeler tabloları yüklenirken hata:', err);
    } finally {
      setIsLoadingRows(false);
    }
  }, []);

  const hasInitializedRef = useRef(false);

  // Execute Firma deep search across 5 priority tables
  const handleSearchFirma = useCallback(
    async (searchTerm?: string) => {
      const term = (searchTerm !== undefined ? searchTerm : searchInputRef.current?.value || '').trim();
      if (!term || term.length < 2) {
        setFirmaSearchResult(null);
        return;
      }

      setIsSearchingFirma(true);
      try {
        const result = await searchFirmaInOdenenlerTables(term);
        setFirmaSearchResult(result);
      } catch (err) {
        console.error('Firma aranırken hata:', err);
      } finally {
        setIsSearchingFirma(false);
      }
    },
    []
  );

  // Sync state ONLY when modal opens (never during typing)
  useEffect(() => {
    if (isOpen && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const initialF = (currentFirma || '').trim();
      setQueryFirma(initialF);
      setSelectedTableView('relevant');
      loadOdenenlerRecords();

      if (initialF.length >= 2) {
        handleSearchFirma(initialF);
      } else {
        setFirmaSearchResult(null);
      }

      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 80);
    } else if (!isOpen) {
      hasInitializedRef.current = false;
    }
  }, [isOpen, currentFirma, loadOdenenlerRecords, handleSearchFirma]);

  // Debounced background search across tables as user types
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = queryFirma.trim();
    if (!trimmed || trimmed.length < 2) {
      setFirmaSearchResult(null);
      return;
    }

    const timer = setTimeout(() => {
      handleSearchFirma(trimmed);
    }, 300);

    return () => clearTimeout(timer);
  }, [queryFirma, isOpen, handleSearchFirma]);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Instant real-time in-memory filtered rows as the user types manually
  const displayedRows = useMemo(() => {
    let list = allOdenenlerRows;

    // Filter by selected table view
    if (selectedTableView === 'relevant') {
      list = list.filter((r) => r.tableDef.tableName === relevantTableDef.tableName);
    } else if (selectedTableView !== 'all') {
      list = list.filter((r) => r.tableDef.tableName === selectedTableView);
    }

    // Filter by firma query if entered (real-time, starting from first letter)
    const trimmedQuery = queryFirma.trim();
    if (trimmedQuery.length > 0) {
      const rawLower = trimmedQuery.toLocaleLowerCase('tr-TR');
      const normQuery = normalizeTurkishText(trimmedQuery);
      const queryWords = normQuery.split(' ').filter((w) => w.length > 0);
      const cleanIbanQuery = trimmedQuery.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      list = list.filter((r) => {
        const rawFirma = (r.firma_unvani || '').toLocaleLowerCase('tr-TR');
        const normFirma = normalizeTurkishText(r.firma_unvani);
        const rawIban = (r.iban_no || '').replace(/\s+/g, '').toLowerCase();
        const rawAciklama = (r.aciklama || '').toLocaleLowerCase('tr-TR');

        // 1. Doğrudan ham Türkçe küçük harf eşleşmesi (Anında ve hassas)
        if (
          rawFirma.includes(rawLower) ||
          rawAciklama.includes(rawLower) ||
          (cleanIbanQuery.length >= 3 && rawIban.includes(cleanIbanQuery))
        ) {
          return true;
        }

        // 2. Türkçe harf normalizasyonu (ı/i, ş/s, ğ/g, ü/u, ö/o, ç/c)
        if (normQuery.length > 0 && normFirma.includes(normQuery)) {
          return true;
        }

        // 3. Çoklu kelime eşleşmesi (örn: "harun donmez")
        if (queryWords.length > 1 && queryWords.every((w) => normFirma.includes(w))) {
          return true;
        }

        return false;
      });
    }

    return list;
  }, [allOdenenlerRows, selectedTableView, relevantTableDef.tableName, queryFirma]);

  // Check if matches exist in other tables when current table yields 0
  const matchesInOtherTablesCount = useMemo(() => {
    const trimmed = queryFirma.trim();
    if (!trimmed || selectedTableView === 'all') return 0;

    const rawLower = trimmed.toLocaleLowerCase('tr-TR');
    const normQuery = normalizeTurkishText(trimmed);

    const otherRows = allOdenenlerRows.filter((r) => {
      if (selectedTableView === 'relevant') {
        return r.tableDef.tableName !== relevantTableDef.tableName;
      }
      return r.tableDef.tableName !== selectedTableView;
    });

    return otherRows.filter((r) => {
      const rawFirma = (r.firma_unvani || '').toLocaleLowerCase('tr-TR');
      const normFirma = normalizeTurkishText(r.firma_unvani);
      return rawFirma.includes(rawLower) || (normQuery.length > 0 && normFirma.includes(normQuery));
    }).length;
  }, [allOdenenlerRows, queryFirma, selectedTableView, relevantTableDef.tableName]);

  // Determine the effective top match (either from multi-table search or from current filtered list)
  const effectiveFirstMatch: FirmaOdenenlerMatch | null = useMemo(() => {
    if (firmaSearchResult?.firstMatch) {
      return firmaSearchResult.firstMatch;
    }

    if (queryFirma.trim().length > 0 && displayedRows.length > 0) {
      const bestWithIban =
        displayedRows.find((r) => r.iban_no && r.iban_no.trim().length > 5) || displayedRows[0];

      return {
        record: bestWithIban.rawRecord,
        table: bestWithIban.tableDef,
        firma_unvani: bestWithIban.firma_unvani,
        iban_no: bestWithIban.iban_no,
        tutar: bestWithIban.tutar,
        created_at: bestWithIban.odeme_tarihi,
        aciklama: bestWithIban.aciklama,
        matchIndex: 1,
      };
    }

    return null;
  }, [firmaSearchResult, queryFirma, displayedRows]);

  // Handle transfer to form
  const handleApplyBoth = (firma: string, iban: string) => {
    const cleanFirma = (firma || '').trim();
    const cleanIban = (iban || '').trim();

    if (onSelectBoth) {
      onSelectBoth(cleanFirma, cleanIban);
    } else {
      if (onSelectFirma && cleanFirma) onSelectFirma(cleanFirma);
      if (onSelectIban && cleanIban) onSelectIban(cleanIban);
    }
    onClose();
  };

  const handleCopyText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-firma-iban-gecmis-odemeler"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-slate-100 overflow-hidden my-4 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. MODAL BAŞLIĞI */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Geçmiş Ödemelerden Firma & İBAN Sorgulama
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-900/60 text-blue-200 border border-blue-400/40">
                  İlgili Sayfa: {relevantTableDef.siteName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Arama kutusuna yazdıkça tablo anında filtrelenir; firma ünvanı veya İBAN'ı tek tıkla talep formuna aktarabilirsiniz.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-firma-sorgula-modal"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Kapat (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. SORGULAMA VE FİLTRELEME ÇUBUĞU (MANUEL YAZIP YAZDIKÇA CANLI FİLTRELEME) */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 space-y-3 shrink-0">
          {/* Arama Girişi */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                ref={searchInputRef}
                id="input-sorgula-firma-unvani"
                type="text"
                value={queryFirma}
                onChange={(e) => {
                  setQueryFirma(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchFirma(queryFirma);
                  }
                }}
                placeholder="Firma ünvanı yazın (yazdıkça anında canlı filtreler)... Örn: Harun, Kaya, Özka, Demir..."
                className="w-full pl-10 pr-24 py-2.5 bg-slate-900 rounded-xl text-sm font-semibold text-white border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none shadow-inner transition-all"
              />
              {queryFirma && (
                <button
                  type="button"
                  onClick={() => {
                    setQueryFirma('');
                    setFirmaSearchResult(null);
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }}
                  className="absolute inset-y-0 right-2 px-2 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  title="Aramayı Temizle"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-modal-do-firma-sorgula"
                onClick={() => handleSearchFirma(queryFirma)}
                disabled={isSearchingFirma || !queryFirma.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Search className={`w-4 h-4 ${isSearchingFirma ? 'animate-spin' : ''}`} />
                <span>{isSearchingFirma ? 'Aranıyor...' : 'Tümünde Ara'}</span>
              </button>

              <button
                type="button"
                onClick={loadOdenenlerRecords}
                disabled={isLoadingRows}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                title="Tablo Verilerini Yenile"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRows ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Yenile</span>
              </button>
            </div>
          </div>

          {/* Tablo Filtre Sekmeleri */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5 text-slate-500" /> Tablo Seçimi:
            </span>

            {/* İlgili Sayfa Butonu */}
            <button
              type="button"
              id="tab-filter-relevant"
              onClick={() => setSelectedTableView('relevant')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedTableView === 'relevant'
                  ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${selectedTableView === 'relevant' ? 'opacity-100' : 'opacity-0'}`} />
              <span>İlgili Sayfa: {relevantTableDef.siteName}</span>
            </button>

            {/* Tüm Tablolar Butonu */}
            <button
              type="button"
              id="tab-filter-all"
              onClick={() => setSelectedTableView('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedTableView === 'all'
                  ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${selectedTableView === 'all' ? 'opacity-100' : 'opacity-0'}`} />
              <span>Tüm 5 Şantiye (Öncelikli)</span>
            </button>

            {/* Diğer 5 Öncelikli Tablo Düğmeleri */}
            {ODENENLER_PRIORITY_TABLES.map((t) => {
              const isSelected = selectedTableView === t.tableName;
              return (
                <button
                  key={t.tableName}
                  type="button"
                  onClick={() => setSelectedTableView(t.tableName)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white ring-1 ring-indigo-400 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {t.siteCode} - {t.siteName}
                </button>
              );
            })}

            <div className="ml-auto text-xs text-slate-400 font-medium flex items-center gap-2">
              {queryFirma.trim() && (
                <span className="text-emerald-400 font-bold text-[11px]">
                  Filtre: "{queryFirma.trim()}"
                </span>
              )}
              <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
                {displayedRows.length} kayıt listeleniyor
              </span>
            </div>
          </div>
        </div>

        {/* 3. MODAL GÖVDESİ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          
          {/* ÖNE ÇIKAN İLK EŞLEŞEN KAYIT KARTI (Canlı Yazarken Eşleşen En İyi Kayıt) */}
          {effectiveFirstMatch && queryFirma.trim().length > 0 && (
            <div
              id="card-ilk-bulunan-eslesme"
              className="p-4 sm:p-4.5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/70 shadow-xl space-y-3 animate-fadeIn"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/25 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>CANLI EŞLEŞEN KAYIT</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-300">
                    {effectiveFirstMatch.table.tableLabel} ({effectiveFirstMatch.table.tableName})
                  </span>
                </div>

                <a
                  href={effectiveFirstMatch.table.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Database className="w-3 h-3" />
                  <span>Supabase</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* Bilgiler ve Aktar Butonu */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Firma Ünvanı */}
                <div className="md:col-span-5 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Kayıtlı Firma Ünvanı
                  </span>
                  <p className="text-sm sm:text-base font-extrabold text-white break-words">
                    <HighlightText text={effectiveFirstMatch.firma_unvani} query={queryFirma} />
                  </p>
                  {effectiveFirstMatch.tutar !== undefined && (
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span>
                        Tutar: <strong className="text-emerald-400 font-mono">{formatCurrency(effectiveFirstMatch.tutar)}</strong>
                      </span>
                      {effectiveFirstMatch.created_at && (
                        <span>Tarih: {formatDate(effectiveFirstMatch.created_at)}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* İBAN Bilgisi */}
                <div className="md:col-span-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Kayıtlı İBAN No
                    </span>
                    {analyzeIBAN(effectiveFirstMatch.iban_no).bankInfo && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-200 border border-blue-400/30">
                        {analyzeIBAN(effectiveFirstMatch.iban_no).bankInfo?.shortName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs sm:text-sm font-mono font-bold text-emerald-300 tracking-wide break-all">
                      {formatIBAN(effectiveFirstMatch.iban_no)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopyText(effectiveFirstMatch.iban_no)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                      title="İBAN Kopyala"
                    >
                      {copiedText === effectiveFirstMatch.iban_no ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Aktar Butonu */}
                <div className="md:col-span-3 flex flex-col justify-center">
                  <button
                    type="button"
                    id="btn-aktar-ilk-eslesen"
                    onClick={() => handleApplyBoth(effectiveFirstMatch.firma_unvani, effectiveFirstMatch.iban_no)}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-black transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Forma Aktar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Diğer Tablolarda Eşleşme Bildirimi (Mevcut Tabloda 0 Eşleşme Varsa) */}
          {queryFirma.trim().length > 0 && displayedRows.length === 0 && matchesInOtherTablesCount > 0 && (
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/50 text-blue-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <Info className="w-5 h-5 text-blue-400 shrink-0" />
                <span>
                  Seçili <strong>{relevantTableDef.siteName}</strong> sayfasında <strong>"{queryFirma}"</strong> için kayıt bulunamadı, ancak diğer şantiyelerde <strong>{matchesInOtherTablesCount} adet</strong> eşleşen kayıt var.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTableView('all')}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <span>Tüm Şantiyelerde Göster ({matchesInOtherTablesCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Hiçbir Tabloda Kayıt Bulunamadı Uyarı Alanı */}
          {queryFirma.trim().length > 0 && displayedRows.length === 0 && matchesInOtherTablesCount === 0 && !isLoadingRows && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-white">
                  Kriterlere Uygun Kayıt Bulunamadı
                </p>
                <p className="text-amber-200/90 mt-1">
                  <strong>"{queryFirma}"</strong> araması için geçmiş ödemeler tablolarında kayıt bulunamadı.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQueryFirma('');
                      if (searchInputRef.current) searchInputRef.current.focus();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"
                  >
                    Aramayı Temizle ve Tümünü Göster
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GEÇMİŞ ÖDEMELER GERÇEK TABLOSU */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                <span>Geçmiş Ödemeler Kayıtları Tablosu</span>
                {isLoadingRows && (
                  <span className="text-blue-400 font-normal text-[11px] animate-pulse">
                    (Yükleniyor...)
                  </span>
                )}
              </h3>
              <span className="text-[11px] text-slate-400">
                {queryFirma.trim() ? (
                  <span>
                    <strong>"{queryFirma}"</strong> ile filtrelendi ({displayedRows.length} sonuç)
                  </span>
                ) : (
                  <span>
                    Her satırdaki <strong>"Aktar"</strong> butonuna basarak firma ve İBAN'ı forma aktarabilirsiniz.
                  </span>
                )}
              </span>
            </div>

            {isLoadingRows && allOdenenlerRows.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400 mb-2" />
                <span>Ödenenler tablosu yükleniyor, lütfen bekleyiniz...</span>
              </div>
            ) : displayedRows.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center">
                <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-300">
                  Kayıt Bulunmuyor
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                  Arama kutusunu temizleyerek veya yukarıdaki tab sekmelerinden diğer şantiyeleri seçerek geçmiş ödeme kayıtlarına ulaşabilirsiniz.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/80 shadow-inner">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 w-28">Şantiye</th>
                      <th className="py-3 px-3 min-w-[180px]">Firma Ünvanı</th>
                      <th className="py-3 px-3 min-w-[240px]">İBAN Numarası & Banka</th>
                      <th className="py-3 px-3 w-32 text-right">Ödenen Tutar</th>
                      <th className="py-3 px-3 w-24">Tarih</th>
                      <th className="py-3 px-3 min-w-[160px]">Açıklama</th>
                      <th className="py-3 px-3 w-28 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {displayedRows.slice(0, 100).map((row, idx) => {
                      const bankInfo = row.iban_no ? analyzeIBAN(row.iban_no).bankInfo : null;
                      const hasIban = Boolean(row.iban_no && row.iban_no.trim().length > 5);

                      return (
                        <tr
                          key={`${row.tableDef.tableName}_${row.id}_${idx}`}
                          className="hover:bg-slate-900/70 transition-colors group"
                        >
                          {/* Sıra */}
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500 text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Şantiye / Tablo */}
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${row.tableDef.badgeColor}`}
                              title={row.tableDef.tableName}
                            >
                              {row.tableDef.siteCode}
                            </span>
                          </td>

                          {/* Firma Ünvanı (Canlı arama vurgusu ile) */}
                          <td className="py-2.5 px-3 font-bold text-white">
                            <div className="flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="break-words">
                                <HighlightText text={row.firma_unvani} query={queryFirma} />
                              </span>
                            </div>
                          </td>

                          {/* İBAN No & Banka */}
                          <td className="py-2.5 px-3 font-mono">
                            {hasIban ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-emerald-300 font-bold tracking-tight text-[11px]">
                                    {formatIBAN(row.iban_no)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(row.iban_no)}
                                    className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                    title="İBAN Kopyala"
                                  >
                                    {copiedText === row.iban_no ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                                {bankInfo && (
                                  <span className="inline-block text-[10px] font-sans font-semibold text-slate-400">
                                    {bankInfo.shortName}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-600 font-sans text-[11px] italic">
                                İBAN Kayıtlı Değil
                              </span>
                            )}
                          </td>

                          {/* Tutar */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {row.tutar > 0 ? formatCurrency(row.tutar) : '-'}
                          </td>

                          {/* Tarih */}
                          <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                            {row.odeme_tarihi ? formatDate(row.odeme_tarihi) : '-'}
                          </td>

                          {/* Açıklama */}
                          <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs truncate" title={row.aciklama}>
                            <HighlightText text={row.aciklama || '-'} query={queryFirma} />
                          </td>

                          {/* AKTAR BUTONU */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleApplyBoth(row.firma_unvani, row.iban_no)}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer hover:shadow hover:scale-[1.03]"
                              title="Bu Firma ve İBAN'ı Talep Formuna Aktar"
                            >
                              <span>Aktar</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 4. MODAL ALT BİLGİ VE KAPAT ÇUBUĞU */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              Aktar seçimi yapıldığında hem <strong>Firma Ünvanı</strong> hem de <strong>İBAN No</strong> otomatik olarak forma doldurulur.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            Vazgeç / Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Search,
  Building2,
  Copy,
  Check,
  FileSpreadsheet,
  CreditCard,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { formatCurrency, formatIBAN, formatDate } from '../utils/formatters';
import { fetchAllCariRecords, CariTransaction } from '../lib/supabase';

interface CariKontrolModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFirma?: string;
  onSelectIban?: (iban: string) => void;
  onSelectFirma?: (firma: string) => void;
}

export const CariKontrolModal: React.FC<CariKontrolModalProps> = ({
  isOpen,
  onClose,
  initialFirma = '',
  onSelectIban,
  onSelectFirma,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialFirma);
  const [transactions, setTransactions] = useState<CariTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  // Sync initialFirma when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm(initialFirma || '');
      loadCariData(initialFirma || '');
    }
  }, [isOpen, initialFirma]);

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

  const loadCariData = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const records = await fetchAllCariRecords(query);
      setTransactions(records);
    } catch (err) {
      console.error('Cari kayıtları yüklenirken hata oluştu:', err);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCariData(searchTerm);
  };

  // Helper getters
  const getFirma = (r: CariTransaction) => r.firma_unvani || r.firma_adi || r.firma || 'Belirtilmemiş';
  const getIban = (r: CariTransaction) => {
    const raw = r.iban_no || r.iban;
    return raw && raw.trim() ? raw.trim().toUpperCase() : '-';
  };
  const getAciklama = (r: CariTransaction) => r.aciklama || r.description || '-';
  const getTutar = (r: CariTransaction): number => {
    const raw = r.odenecek_tutar ?? r.tutar ?? 0;
    return typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.-]+/g, '')) || 0;
  };
  const getDurum = (r: CariTransaction): string => {
    if (r.sourceType === 'gecmis_odeme') return 'Ödendi';
    return r.durumu || r.durum || 'Beklemede';
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const d = getDurum(t);
        if (statusFilter === 'Ödendi' && d !== 'Ödendi') return false;
        if (statusFilter === 'Beklemede' && d !== 'Beklemede') return false;
        if (statusFilter === 'Onaylandı' && d !== 'Onaylandı') return false;
        if (statusFilter === 'İşlemde' && d !== 'İşlemde') return false;
        if (statusFilter === 'Reddedildi' && d !== 'Reddedildi') return false;
      }
      // Site filter
      if (siteFilter !== 'ALL' && t.siteName !== siteFilter) {
        return false;
      }
      return true;
    });
  }, [transactions, statusFilter, siteFilter]);

  // Unique sites from records for site dropdown
  const uniqueSites = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.siteName) set.add(t.siteName);
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Unique firms for suggestions
  const uniqueFirms = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      const f = getFirma(t);
      if (f && f !== 'Belirtilmemiş') set.add(f);
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Aggregates & Metrics
  const metrics = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;
    let paidCount = 0;
    let pendingCount = 0;

    filteredTransactions.forEach((t) => {
      const amount = getTutar(t);
      const durum = getDurum(t);
      if (durum === 'Ödendi') {
        totalPaid += amount;
        paidCount++;
      } else {
        totalPending += amount;
        pendingCount++;
      }
    });

    const totalVolume = totalPaid + totalPending;

    // Distinct IBAN extraction with counts
    const ibanMap = new Map<string, { iban: string; count: number; lastDate: string }>();
    filteredTransactions.forEach((t) => {
      const iban = getIban(t);
      if (iban && iban !== '-') {
        const existing = ibanMap.get(iban);
        const date = t.created_at || '';
        if (existing) {
          existing.count += 1;
          if (date && (!existing.lastDate || date > existing.lastDate)) {
            existing.lastDate = date;
          }
        } else {
          ibanMap.set(iban, { iban, count: 1, lastDate: date });
        }
      }
    });

    return {
      totalCount: filteredTransactions.length,
      paidCount,
      pendingCount,
      totalPaid,
      totalPending,
      totalVolume,
      ibans: Array.from(ibanMap.values()).sort((a, b) => b.count - a.count),
    };
  }, [filteredTransactions]);

  const handleCopyIban = (iban: string) => {
    if (!iban || iban === '-') return;
    navigator.clipboard.writeText(iban.replace(/\s+/g, ''));
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2000);
  };

  const handleApplyIban = (iban: string) => {
    if (onSelectIban) {
      onSelectIban(iban.replace(/\s+/g, ''));
    }
    if (onSelectFirma && searchTerm.trim()) {
      onSelectFirma(searchTerm.trim());
    }
    onClose();
  };

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) return;

    const rows = filteredTransactions.map((t, idx) => ({
      'Sıra No': idx + 1,
      'Şantiye': t.siteName,
      'Kayıt Türü': t.sourceType === 'gecmis_odeme' ? 'Geçmiş Ödeme' : 'Aktif Talep',
      'Tarih': formatDate(t.created_at),
      'Firma Ünvanı': getFirma(t),
      'İBAN No': getIban(t),
      'Açıklama': getAciklama(t),
      'Ödenen / Talep Edilen Tutar (TL)': getTutar(t),
      'Talep Eden': t.talep_eden || t.requester || '-',
      'Durumu': getDurum(t),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 32 },
      { wch: 32 },
      { wch: 38 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    const cleanSheetName = (searchTerm || 'Cari_Ekstre').replace(/[\\/*?[\]:]/g, '').slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);

    const safeFileName = `Cari_Ekstre_${(searchTerm || 'Genel').replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, safeFileName);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ödendi':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 border border-emerald-600 text-emerald-950">
            <CheckCircle className="w-3 h-3 text-emerald-700" /> Ödendi
          </span>
        );
      case 'Onaylandı':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 border border-blue-600 text-blue-950">
            <Check className="w-3 h-3 text-blue-700" /> Onaylandı
          </span>
        );
      case 'İşlemde':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-cyan-100 border border-cyan-600 text-cyan-950">
            <Clock className="w-3 h-3 text-cyan-700" /> İşlemde
          </span>
        );
      case 'Reddedildi':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 border border-rose-600 text-rose-950">
            <XCircle className="w-3 h-3 text-rose-700" /> Reddedildi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 border border-amber-600 text-amber-950">
            <Clock className="w-3 h-3 text-amber-700" /> Beklemede
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="cari-kontrol-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="cari-kontrol-modal-box"
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-white border-2 border-slate-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-black shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Cari Kontrol & Hesap Geçmişi
                </h3>
                {searchTerm.trim() && (
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-bold">
                    {searchTerm.trim()}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Tüm şantiyeler ve geçmiş ödeme arşivindeki işlem hareketleri ve onaylı İBAN listesi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Kapat (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-100 border-b-2 border-slate-300 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shrink-0">
          {/* Firma Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Firma ünvanı yazınız (örn: Bayburt Özka, X İnşaat)..."
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-slate-900 shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50 shadow-sm flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sorgula</span>
            </button>
          </form>

          {/* Quick Filters: Site and Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="px-3 py-2 bg-white border-2 border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-slate-900 shadow-sm cursor-pointer"
            >
              <option value="ALL">Tüm Şantiyeler</option>
              {uniqueSites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border-2 border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-slate-900 shadow-sm cursor-pointer"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="Ödendi">Ödenenler</option>
              <option value="Beklemede">Beklemede</option>
              <option value="Onaylandı">Onaylandı</option>
              <option value="İşlemde">İşlemde</option>
              <option value="Reddedildi">Reddedildi</option>
            </select>

            {filteredTransactions.length > 0 && (
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
                title="Cari Ekstreyi Excel'e İndir (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-3.5 rounded-xl bg-white border-2 border-slate-900 shadow-sm">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Toplam Kayıt
              </div>
              <div className="text-xl font-black text-slate-950 mt-1">
                {metrics.totalCount} Adet
              </div>
              <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                {metrics.paidCount} Ödendi, {metrics.pendingCount} Bekleyen
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border-2 border-emerald-600 shadow-sm">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                <span>Ödenen Tutar</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-700 mt-1 font-mono">
                {formatCurrency(metrics.totalPaid)}
              </div>
              <div className="text-[11px] font-bold text-emerald-800 mt-0.5">
                {metrics.paidCount} işlem tamamlandı
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border-2 border-amber-600 shadow-sm">
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                <span>Bekleyen / Onaylanan</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xl font-black text-amber-700 mt-1 font-mono">
                {formatCurrency(metrics.totalPending)}
              </div>
              <div className="text-[11px] font-bold text-amber-800 mt-0.5">
                {metrics.pendingCount} açık talep
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border-2 border-blue-600 shadow-sm">
              <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                Toplam İşlem Hacmi
              </div>
              <div className="text-xl font-black text-blue-700 mt-1 font-mono">
                {formatCurrency(metrics.totalVolume)}
              </div>
              <div className="text-[11px] font-bold text-blue-800 mt-0.5">
                {metrics.ibans.length} Kayıtlı İBAN
              </div>
            </div>
          </div>

          {/* Registered IBANs Section */}
          {metrics.ibans.length > 0 && (
            <div className="bg-white border-2 border-slate-900 rounded-xl p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Kayıtlı İBAN Bilgileri ({metrics.ibans.length} Adet)
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  Talep formuna aktarmak veya kopyalamak için butonları kullanabilirsiniz
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {metrics.ibans.map((item) => (
                  <div
                    key={item.iban}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-300 hover:border-slate-500 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-black text-slate-950 tracking-wider truncate">
                        {formatIBAN(item.iban)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                        <span>{item.count} kez kullanıldı</span>
                        {item.lastDate && <span>• Son: {formatDate(item.lastDate)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyIban(item.iban)}
                        className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="İBAN Kopyala"
                      >
                        {copiedIban === item.iban ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Kopyalandı</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Kopyala</span>
                          </>
                        )}
                      </button>

                      {onSelectIban && (
                        <button
                          type="button"
                          onClick={() => handleApplyIban(item.iban)}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                          title="Bu İBAN'ı Formdaki İBAN alanına aktar ve kapat"
                        >
                          <span>Forma Aktar</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions Ledger Table */}
          <div className="bg-white border-2 border-black rounded-xl overflow-hidden shadow-md">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-black">
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <span>Cari Hesap Hareketleri Listesi</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {filteredTransactions.length} Kayıt
                </span>
              </h4>
              <span className="text-[11px] text-slate-300 font-medium hidden sm:inline">
                Tüm veritabanından filtrelenen sonuçlar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-black font-extrabold border-b-2 border-black uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10 border-r border-slate-300">#</th>
                    <th className="py-2.5 px-3 min-w-[130px] border-r border-slate-300">Tarih</th>
                    <th className="py-2.5 px-3 min-w-[140px] border-r border-slate-300">Şantiye / Tür</th>
                    <th className="py-2.5 px-3 min-w-[180px] border-r border-slate-300">Firma Ünvanı</th>
                    <th className="py-2.5 px-3 min-w-[200px] border-r border-slate-300">İBAN No</th>
                    <th className="py-2.5 px-3 min-w-[220px] border-r border-slate-300">Açıklama</th>
                    <th className="py-2.5 px-3 text-right min-w-[140px]">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-800">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-2" />
                          <p className="text-xs font-bold text-slate-900">Cari veriler taranıyor...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 px-4 text-center">
                        <div className="max-w-md mx-auto flex flex-col items-center justify-center text-slate-700">
                          <AlertCircle className="w-8 h-8 text-amber-600 mb-2" />
                          <h5 className="text-sm font-black text-slate-950 uppercase">
                            Kayıt Bulunamadı
                          </h5>
                          <p className="text-xs text-slate-600 mt-1 font-medium">
                            {searchTerm.trim()
                              ? `"${searchTerm.trim()}" için herhangi bir talep veya ödeme hareketi bulunamadı.`
                              : 'Veritabanında sorgulamak için bir firma ünvanı yazınız.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t, idx) => {
                      const amount = getTutar(t);
                      const durum = getDurum(t);
                      const iban = getIban(t);
                      const isOdenen = durum === 'Ödendi';

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-700 font-mono font-bold text-xs border-r border-slate-300">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 text-slate-900 font-medium text-xs border-r border-slate-300 whitespace-nowrap">
                            {formatDate(t.created_at)}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-300">
                            <div className="font-extrabold text-slate-950 text-xs">{t.siteName}</div>
                            <span
                              className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                                t.sourceType === 'gecmis_odeme'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-400'
                                  : 'bg-blue-100 text-blue-900 border border-blue-400'
                              }`}
                            >
                              {t.sourceType === 'gecmis_odeme' ? 'Geçmiş Ödeme' : 'Aktif Talep'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-extrabold text-black text-xs border-r border-slate-300">
                            {getFirma(t)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-black text-xs border-r border-slate-300">
                            <div className="flex items-center gap-1.5">
                              <span>{formatIBAN(iban)}</span>
                              {iban !== '-' && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyIban(iban)}
                                  className="p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-black transition-colors cursor-pointer"
                                  title="İBAN Kopyala"
                                >
                                  {copiedIban === iban ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 text-xs border-r border-slate-300 font-medium max-w-[260px]">
                            <p className="line-clamp-2" title={getAciklama(t)}>
                              {getAciklama(t)}
                            </p>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-black text-sm whitespace-nowrap ${
                              isOdenen ? 'text-emerald-950' : 'text-slate-950'
                            }`}
                          >
                            {formatCurrency(amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t-2 border-slate-300 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-700 font-bold">
            {filteredTransactions.length > 0 && (
              <span>
                Toplam {filteredTransactions.length} işlem • Hacim:{' '}
                <strong className="text-slate-950 font-mono">
                  {formatCurrency(metrics.totalVolume)}
                </strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-sm"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

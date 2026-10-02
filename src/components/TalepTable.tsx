import React, { useState, useMemo, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { SiteConfig, TalepRecord } from '../types';
import { formatCurrency, formatDate, formatIBAN } from '../utils/formatters';
import { EditTalepModal } from './EditTalepModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { BulkDeleteConfirmModal } from './BulkDeleteConfirmModal';
import { CariKontrolModal } from './CariKontrolModal';
import { FaturaEkleModal } from './FaturaEkleModal';
import {
  saveTalepFileMapping,
  getCariFaturalarFileList,
  isFirmaEvrakExisting,
  invalidateCariFaturalarCache,
  CariFaturalarFileItem,
  isUserRecordMatch,
} from '../lib/supabase';
import {
  Search,
  Download,
  Trash2,
  Edit3,
  Copy,
  Check,
  Inbox,
  Clock,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  RefreshCw,
  FileSpreadsheet,
  CheckSquare,
  Square,
  MinusSquare,
  X,
  Building2,
  PlusCircle,
  Calendar,
  CalendarDays,
  ExternalLink,
  FileText,
  Eye,
  ShieldCheck,
} from 'lucide-react';

interface TalepTableProps {
  activeSite: SiteConfig;
  records: TalepRecord[];
  isLoading: boolean;
  onRefresh?: () => Promise<void>;
  onDeleteRecord: (id: string | number) => Promise<void>;
  onUpdateStatus?: (id: string | number, newStatus: string) => Promise<void>;
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
    }
  ) => Promise<boolean>;
  isPastPayments?: boolean;
  customTitle?: string;
  onOpenMuavinPdf?: (site: SiteConfig, firma: string) => void;
  currentUser?: string;
  isTamYetkili?: boolean;
}

export const TalepTable: React.FC<TalepTableProps> = ({
  activeSite,
  records,
  isLoading,
  onRefresh,
  onDeleteRecord,
  onUpdateStatus,
  onUpdateRecord,
  isPastPayments = false,
  customTitle,
  onOpenMuavinPdf,
  currentUser,
  isTamYetkili = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedIban, setCopiedIban] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<TalepRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<TalepRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Checkbox Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Date Filtering State (Geçmiş Ödemeler için)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<
    'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'LAST_3_MONTHS' | 'THIS_YEAR' | 'CUSTOM'
  >('ALL');

  // Cari Kontrol Modal State
  const [cariModalOpen, setCariModalOpen] = useState(false);
  const [selectedCariFirma, setSelectedCariFirma] = useState('');

  // Fatura Ekle Modal State
  const [faturaModalRecord, setFaturaModalRecord] = useState<TalepRecord | null>(null);

  // Tablo Bildirim/Toast State
  const [tableToast, setTableToast] = useState<{ type: 'success' | 'warning' | 'info'; message: string } | null>(null);

  const showTableToast = (type: 'success' | 'warning' | 'info', message: string) => {
    setTableToast({ type, message });
    setTimeout(() => {
      setTableToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // CARIFATURALAR Bucket Dosya Listesi ve Evrak Varlık Durumu
  const [cariFaturalarFiles, setCariFaturalarFiles] = useState<Array<CariFaturalarFileItem>>([]);
  const [isLoadingCariFiles, setIsLoadingCariFiles] = useState(false);

  const loadCariFaturalar = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoadingCariFiles(true);
      const files = await getCariFaturalarFileList(forceRefresh);
      setCariFaturalarFiles(files || []);
    } catch (err) {
      console.error('loadCariFaturalar error:', err);
    } finally {
      setIsLoadingCariFiles(false);
    }
  }, []);

  useEffect(() => {
    loadCariFaturalar();
  }, [loadCariFaturalar, records]);

  const handleOpenCari = (firma: string) => {
    setSelectedCariFirma(firma);
    setCariModalOpen(true);
  };

  const handleSaveFatura = async (
    recordId: string | number,
    faturaData: {
      faturaNo: string;
      faturaTarihi: string;
      faturaTutari: number;
      yeniCariBakiye?: number;
      aciklama?: string;
      dosyaAdi?: string;
      dosyaUrl?: string;
      dosyaPath?: string;
    }
  ): Promise<boolean> => {
    if (!onUpdateRecord) return false;
    const existing = records.find((r) => r.id === recordId);
    if (!existing) return false;

    // Kullanıcı talebi: Tablodaki kayıtların açıklamalarını DEĞİŞTİRME, mevcut açıklamayı aynen koru
    const unchangedAciklama = existing.aciklama || existing.description || '';

    // Kullanıcı talebi: KAYIT SONRASINDA CARİ BAKİYEYİ DEĞİŞTİRME, KAYIT TABLOSUNDA NEYSE ÖYLE KALSIN.
    const success = await onUpdateRecord(recordId, {
      firma_unvani: existing.firma_unvani || existing.company || '',
      iban_no: existing.iban_no || existing.iban || '',
      aciklama: unchangedAciklama,
      odenecek_tutar: existing.odenecek_tutar ?? existing.tutar ?? 0,
      talep_eden: existing.talep_eden || existing.requester || '',
      durumu: existing.durumu || existing.durum || 'Beklemede',
      cari_bakiye: existing.cari_bakiye ?? existing.bakiye ?? null,
      fatura_no: faturaData.faturaNo || '',
      fatura_tarihi: faturaData.faturaTarihi || '',
      fatura_tutari: faturaData.faturaTutari || 0,
      fatura_dosya_adi: faturaData.dosyaAdi,
      fatura_dosya_url: faturaData.dosyaUrl,
    });

    if (success && faturaData.dosyaAdi && faturaData.dosyaUrl) {
      saveTalepFileMapping(
        activeSite.tableName,
        recordId,
        faturaData.dosyaAdi,
        faturaData.dosyaUrl,
        faturaData.dosyaPath
      );
      invalidateCariFaturalarCache();
      loadCariFaturalar(true);
    }

    return success;
  };

  const handleCopyIban = (iban: string) => {
    if (!iban) return;
    navigator.clipboard.writeText(iban.replace(/\s+/g, ''));
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2000);
  };

  // CARIFATURALAR Klasöründen Cari/Firma Ünvanı Tam Adıyla Evrak Gösterme
  const handleEvrakGoster = async (record: TalepRecord) => {
    const firma = getFirma(record);
    if (!firma || !firma.trim()) {
      showTableToast('warning', 'Firma ünvanı bulunamadı.');
      return;
    }

    // 1. Önce hafızadaki listeden tam adda eşleşen evrak var mı kontrol et
    let evrak = isFirmaEvrakExisting(firma, cariFaturalarFiles, record.id, record);

    // 2. Hafızada yoksa, kullanıcının Supabase depolama alanına (CARIFATURALAR) yeni yüklemiş olabileceği
    // ihtimaline karşı anlık taze liste çekerek tekrar TAM ADDA ara
    if (!evrak.exists || !evrak.matchedFileUrl) {
      try {
        const freshList = await getCariFaturalarFileList(true);
        setCariFaturalarFiles(freshList || []);
        evrak = isFirmaEvrakExisting(firma, freshList || [], record.id, record);
      } catch (err) {
        console.error('Evrak kontrolü hatası:', err);
      }
    }

    // 3. Dosya bulunduysa yeni sekmede aç
    if (evrak.exists && evrak.matchedFileUrl) {
      window.open(evrak.matchedFileUrl, '_blank', 'noopener,noreferrer');
      showTableToast('success', `"${evrak.matchedFileName || 'Evrak'}" yeni sekmede açıldı.`);
    } else {
      showTableToast(
        'warning',
        `CARIFATURALAR klasöründe "${firma}" ünvanına tam eşleşen (tam adda) bir evrak bulunamadı.`
      );
    }
  };

  // Safe data access helpers
  const getFirma = (r: TalepRecord) => r.firma_unvani || r.firma_adi || r.firma || '-';
  const getIban = (r: TalepRecord) => r.iban_no || r.iban || '-';
  const getAciklama = (r: TalepRecord) => r.aciklama || r.description || '-';
  const getTutar = (r: TalepRecord) => {
    const val = r.odenecek_tutar ?? r.tutar ?? 0;
    return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
  };
  const getTalepEden = (r: TalepRecord) => r.talep_eden || r.requester || '-';
  const getDurum = (r: TalepRecord) => r.durumu || r.durum || (isPastPayments ? 'Ödendi' : 'Beklemede');
  const getCariBakiye = (r: TalepRecord) => {
    const val = r.cari_bakiye ?? r.bakiye ?? r.cari_bakiyesi ?? r.cari_bakiye_tutari;
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '.'));
    return isNaN(num) ? val : num;
  };

  // Helper to extract YYYY-MM-DD from record date
  const getRecordDateString = (r: TalepRecord): string | null => {
    const val = r.created_at || r.tarih || r.odeme_tarihi || r.date;
    if (!val) return null;
    if (typeof val === 'string' && val.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return val.slice(0, 10);
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Preset Date Range Helper
  const applyDatePreset = (
    preset: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'LAST_3_MONTHS' | 'THIS_YEAR'
  ) => {
    setDatePreset(preset);
    const now = new Date();
    const formatYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      const todayStr = formatYMD(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'THIS_WEEK') {
      const dayOfWeek = now.getDay() || 7; // 1 = Monday
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek + 1);
      setStartDate(formatYMD(monday));
      setEndDate(formatYMD(now));
    } else if (preset === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatYMD(startOfMonth));
      setEndDate(formatYMD(now));
    } else if (preset === 'LAST_30_DAYS') {
      const past30 = new Date(now);
      past30.setDate(now.getDate() - 30);
      setStartDate(formatYMD(past30));
      setEndDate(formatYMD(now));
    } else if (preset === 'LAST_3_MONTHS') {
      const past90 = new Date(now);
      past90.setDate(now.getDate() - 90);
      setStartDate(formatYMD(past90));
      setEndDate(formatYMD(now));
    } else if (preset === 'THIS_YEAR') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      setStartDate(formatYMD(startOfYear));
      setEndDate(formatYMD(now));
    }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Sadece sisteme giriş yapan kullanıcının talep ettiği verileri göster (tam yetkili yönetici DEĞİLSE)
      // Tam yetkili ise tablodaki bütün verileri görür.
      if (!isTamYetkili && currentUser && currentUser.trim()) {
        const talepEdenVal = getTalepEden(r);
        if (!isUserRecordMatch(talepEdenVal, currentUser)) {
          return false;
        }
      }

      const firma = getFirma(r).toLowerCase();
      const talepEden = getTalepEden(r).toLowerCase();
      const aciklama = getAciklama(r).toLowerCase();
      const iban = getIban(r).toLowerCase();
      const cariBakiyeStr = String(r.cari_bakiye ?? '').toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        firma.includes(search) ||
        talepEden.includes(search) ||
        aciklama.includes(search) ||
        iban.includes(search) ||
        cariBakiyeStr.includes(search);

      const durum = getDurum(r);
      const matchesStatus = statusFilter === 'ALL' || durum === statusFilter;

      // Date filtering
      let matchesDate = true;
      if (startDate || endDate) {
        const recDateStr = getRecordDateString(r);
        if (recDateStr) {
          if (startDate && recDateStr < startDate) matchesDate = false;
          if (endDate && recDateStr > endDate) matchesDate = false;
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [records, searchTerm, statusFilter, startDate, endDate, currentUser, isTamYetkili]);

  const totalFilteredAmount = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + getTutar(r), 0);
  }, [filteredRecords]);

  const totalCariBakiye = useMemo(() => {
    return filteredRecords.reduce((sum, r) => {
      const b = getCariBakiye(r);
      return typeof b === 'number' ? sum + b : sum;
    }, 0);
  }, [filteredRecords]);

  const hasAnyCariBakiye = useMemo(() => {
    return filteredRecords.some((r) => getCariBakiye(r) !== null);
  }, [filteredRecords]);

  // Selected records array
  const selectedRecords = useMemo(() => {
    return records.filter((r) => r.id !== undefined && selectedIds.has(r.id));
  }, [records, selectedIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedRecords.reduce((sum, r) => sum + getTutar(r), 0);
  }, [selectedRecords]);

  // Selection handlers
  const handleToggleSelectRecord = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    const validFilteredIds = filteredRecords
      .map((r) => r.id)
      .filter((id): id is string | number => id !== undefined);

    if (validFilteredIds.length === 0) return;

    const allSelected = validFilteredIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        validFilteredIds.forEach((id) => next.delete(id));
      } else {
        validFilteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Check selection state for header checkbox
  const validFilteredIds = useMemo(() => {
    return filteredRecords
      .map((r) => r.id)
      .filter((id): id is string | number => id !== undefined);
  }, [filteredRecords]);

  const isAllFilteredSelected =
    validFilteredIds.length > 0 &&
    validFilteredIds.every((id) => selectedIds.has(id));

  const isSomeFilteredSelected =
    validFilteredIds.some((id) => selectedIds.has(id)) && !isAllFilteredSelected;

  // Excel Export Handler (.xlsx)
  const exportToExcel = (dataToExport: TalepRecord[], exportTitle = 'talepler') => {
    if (dataToExport.length === 0) return;

    const exportRows = dataToExport.map((r, idx) => ({
      'Sıra No': idx + 1,
      'Tarih': r.created_at ? formatDate(r.created_at) : '',
      'Firma Ünvanı': getFirma(r),
      'İBAN No': getIban(r),
      'Açıklama': getAciklama(r),
      'Ödenecek Tutar (TL)': getTutar(r),
      'Talep Eden': getTalepEden(r),
      'Durumu': getDurum(r),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);

    // Set column widths for clean readability in Excel
    worksheet['!cols'] = [
      { wch: 8 },  // Sıra
      { wch: 14 }, // Tarih
      { wch: 30 }, // Firma
      { wch: 32 }, // IBAN
      { wch: 35 }, // Açıklama
      { wch: 18 }, // Tutar
      { wch: 20 }, // Talep Eden
      { wch: 14 }, // Durumu
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeSite.name.slice(0, 31));

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${activeSite.tableName}_${exportTitle}_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  // Bulk Delete Execution Handler
  const handleConfirmBulkDelete = async () => {
    if (selectedRecords.length === 0) return;
    try {
      setIsBulkDeleting(true);
      for (const rec of selectedRecords) {
        if (rec.id !== undefined) {
          await onDeleteRecord(rec.id);
        }
      }
      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ödendi':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 border border-emerald-600 text-emerald-950 shadow-xs whitespace-nowrap">
            <CheckCircle className="w-3 h-3 text-emerald-700 shrink-0" /> Ödendi
          </span>
        );
      case 'Onaylandı':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 border border-blue-600 text-blue-950 shadow-xs whitespace-nowrap">
            <Check className="w-3 h-3 text-blue-700 shrink-0" /> Onaylandı
          </span>
        );
      case 'İşlemde':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 border border-cyan-600 text-cyan-950 shadow-xs whitespace-nowrap">
            <Clock className="w-3 h-3 text-cyan-700 shrink-0" /> İşlemde
          </span>
        );
      case 'Reddedildi':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 border border-rose-600 text-rose-950 shadow-xs whitespace-nowrap">
            <XCircle className="w-3 h-3 text-rose-700 shrink-0" /> Reddedildi
          </span>
        );
      case 'Beklemede':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 border border-amber-600 text-amber-950 shadow-xs whitespace-nowrap">
            <Clock className="w-3 h-3 text-amber-700 shrink-0" /> Beklemede
          </span>
        );
    }
  };

  return (
    <div
      id="talep-table-container"
      className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-2xl space-y-4"
    >
      {/* Table Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-2 border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
            <span>{customTitle || `${activeSite.name} — ${isPastPayments ? 'Geçmiş Ödeme Listesi' : 'Talep Listesi'}`}</span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm transition-colors ${
                records.length >= 1
                  ? 'bg-emerald-600 text-white border border-emerald-500'
                  : 'bg-slate-900 text-white border border-slate-800'
              }`}
            >
              {records.length} Kayıt
            </span>
            {selectedIds.size > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 border border-blue-500 text-blue-900 shadow-sm">
                {selectedIds.size} Seçili
              </span>
            )}
            {isTamYetkili ? (
              <span
                id="table-admin-badge"
                className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-500 text-amber-950 shadow-sm flex items-center gap-1.5"
                title="Tam Yetkili: Tablodaki bütün kullanıcıların kayıtları görüntülenmektedir"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Tam Yetkili ({currentUser}) — Bütün Veriler Görünür</span>
              </span>
            ) : currentUser ? (
              <span
                id="table-user-filter-badge"
                className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 border border-blue-600 text-blue-950 shadow-sm flex items-center gap-1"
                title="Yalnızca sizin talep ettiğiniz kayıtlar görüntülenmektedir"
              >
                <CheckCircle2 className="w-3 h-3 text-blue-700 shrink-0" />
                <span>Kullanıcı: <strong className="font-mono">{currentUser}</strong></span>
              </span>
            ) : null}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            {isPastPayments
              ? 'Veritabanında arşivlenen tamamlanmış geçmiş ödeme kayıtları'
              : 'Veritabanındaki aktif talepler, ödeme listesi ve işlem yönetimi'}
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Firma, talep eden veya açıklama ara..."
              className="w-full pl-9 pr-3 py-2 bg-white border-2 border-slate-300 rounded-xl text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 shadow-sm"
            />
          </div>

          {/* Status Filter - Hidden in Geçmiş Ödemeler */}
          {!isPastPayments && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border-2 border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-slate-900 shadow-sm cursor-pointer"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="Beklemede">Beklemede</option>
              <option value="Onaylandı">Onaylandı</option>
              <option value="İşlemde">İşlemde</option>
              <option value="Ödendi">Ödendi</option>
              <option value="Reddedildi">Reddedildi</option>
            </select>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={async () => {
                await onRefresh();
                await loadCariFaturalar(true);
              }}
              disabled={isLoading || isLoadingCariFiles}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-black border-2 border-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              title="Veritabanından Verileri ve CARIFATURALAR Evrak Listesini Yenile"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading || isLoadingCariFiles ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>
          )}

          {/* Excel Export (All / Filtered) */}
          {records.length > 0 && (
            <button
              onClick={() => exportToExcel(filteredRecords, 'tum_liste')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800 text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Tüm Listeyi Excel (.xlsx) Olarak İndir"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>Excel'e Aktar</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Range Filter Bar (Geçmiş Ödemeler ve Tarih Filtresi) */}
      <div
        id="talep-table-date-filter"
        className={`border-2 rounded-xl p-3.5 shadow-sm transition-all ${
          isPastPayments
            ? 'bg-gradient-to-r from-amber-50 via-sky-50 to-blue-50 border-amber-300'
            : 'bg-slate-50 border-slate-300'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Label & Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 mr-1">
              <CalendarDays className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Tarih Filtresi:</span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'ALL', label: 'Tüm Tarihler' },
                { id: 'TODAY', label: 'Bugün' },
                { id: 'THIS_WEEK', label: 'Bu Hafta' },
                { id: 'THIS_MONTH', label: 'Bu Ay' },
                { id: 'LAST_30_DAYS', label: 'Son 30 Gün' },
                { id: 'LAST_3_MONTHS', label: 'Son 3 Ay' },
                { id: 'THIS_YEAR', label: 'Bu Yıl' },
              ].map((p) => {
                const isActive = datePreset === p.id && (p.id !== 'ALL' || (!startDate && !endDate));
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyDatePreset(p.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700'
                        : 'bg-white hover:bg-slate-200 text-slate-800 border border-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Manual Date Inputs & Clear Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span className="text-[11px] text-slate-500 font-semibold">Başlangıç:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="px-2.5 py-1 bg-white border-2 border-slate-300 rounded-lg text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600 shadow-xs cursor-pointer"
                title="Başlangıç Tarihi"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span className="text-[11px] text-slate-500 font-semibold">Bitiş:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="px-2.5 py-1 bg-white border-2 border-slate-300 rounded-lg text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600 shadow-xs cursor-pointer"
                title="Bitiş Tarihi"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => applyDatePreset('ALL')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Tarih Filtresini Temizle"
              >
                <X className="w-3.5 h-3.5" />
                <span>Temizle</span>
              </button>
            )}

            {(startDate || endDate) && (
              <div className="text-[11px] font-black text-blue-900 bg-blue-100 border border-blue-400 px-2.5 py-1 rounded-lg shadow-xs">
                {filteredRecords.length} / {records.length} Kayıt Gösteriliyor
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating / Active Bulk Selection Toolbar */}
      {selectedIds.size > 0 && (
        <div
          id="bulk-selection-toolbar"
          className="p-3.5 rounded-xl bg-slate-900 border-2 border-black text-white flex flex-wrap items-center justify-between gap-3 shadow-xl animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
              {selectedIds.size}
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{selectedIds.size} Kayıt Seçildi</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-emerald-400 font-extrabold">
                  {formatCurrency(selectedTotalAmount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Seçtiğiniz kayıtlar üzerinde toplu işlem yapabilirsiniz.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Export Selected to Excel */}
            <button
              onClick={() => exportToExcel(selectedRecords, `secilen_${selectedRecords.length}_kayit`)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              title="Seçilen Kayıtları Excel (.xlsx) Olarak İndir"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Seçilenleri Excel'e Aktar ({selectedIds.size})</span>
            </button>

            {/* Delete Selected Records - Hidden in Geçmiş Ödemeler */}
            {!isPastPayments && (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                title="Seçilen Kayıtları Kalıcı Olarak Sil"
              >
                <Trash2 className="w-4 h-4" />
                <span>Seçilenleri Sil ({selectedIds.size})</span>
              </button>
            )}

            {/* Clear Selection */}
            <button
              onClick={handleClearSelection}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 text-xs font-semibold transition-all cursor-pointer"
              title="Seçimi Temizle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Real Supabase Data Table - White background with black line row dividers */}
      <div className="overflow-x-auto rounded-xl border-2 border-black shadow-md bg-white">
        <table className="w-full min-w-[1240px] text-left text-xs border-collapse bg-white">
          <thead className="bg-slate-100 text-black font-extrabold border-b-2 border-black uppercase tracking-wider text-[11px]">
            <tr>
              {/* Header Checkbox (Select All Filtered) */}
              <th className="py-3 px-2 text-center w-10 border-r border-slate-300">
                <button
                  type="button"
                  onClick={handleToggleSelectAllFiltered}
                  disabled={filteredRecords.length === 0}
                  className="p-1 rounded hover:bg-slate-200 text-slate-900 transition-colors cursor-pointer disabled:opacity-40"
                  title={isAllFilteredSelected ? 'Tüm Seçimleri Kaldır' : 'Tümünü Seç'}
                  aria-label="Tümünü Seç"
                >
                  {isAllFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-700" />
                  ) : isSomeFilteredSelected ? (
                    <MinusSquare className="w-4 h-4 text-blue-700" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </th>
              <th className="py-3 px-2 text-center w-10 border-r border-slate-300">#</th>
              {/* Firma Ünvanı / Cari Ünvanı (Genişletilmiş) */}
              <th className="py-3 px-3.5 w-[320px] min-w-[280px] max-w-[380px] border-r border-slate-300">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-extrabold text-black">Cari / Firma Ünvanı</span>
                  <button
                    type="button"
                    onClick={() => (onOpenMuavinPdf ? onOpenMuavinPdf(activeSite, '') : handleOpenCari(''))}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 hover:bg-blue-700 text-white text-[10px] font-bold normal-case tracking-normal cursor-pointer transition-colors shadow-xs shrink-0"
                    title="Cari Muavin PDF ve Arama Sayfası"
                  >
                    <Building2 className="w-3 h-3" />
                    <span>Cari</span>
                  </button>
                </div>
              </th>
              {/* İBAN No (Daraltılmış) */}
              <th className="py-3 px-2.5 w-[155px] min-w-[145px] max-w-[165px] border-r border-slate-300">İBAN No</th>
              <th className="py-3 px-3 min-w-[200px] border-r border-slate-300">Açıklama</th>
              <th className="py-3 px-3 text-right w-[150px] min-w-[140px] border-r border-slate-300">Ödenecek Tutar</th>
              {/* Cari Bakiye - Ödenecek Tutar ile Talep Eden Arasında (Geçmiş Ödenenler Listesinde Gizlenir) */}
              {!isPastPayments && (
                <th className="py-3 px-3 text-right w-[150px] min-w-[140px] border-r border-slate-300 bg-slate-200/60">
                  Cari Bakiye
                </th>
              )}
              <th className="py-3 px-3 w-[130px] min-w-[120px] border-r border-slate-300">Talep Eden</th>
              <th className="py-3 px-2 text-center w-[215px] min-w-[205px]">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={isPastPayments ? 8 : 9} className="py-16 text-center text-slate-700 bg-white border-b-2 border-black">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm font-bold text-slate-900">Veritabanından veriler yükleniyor...</p>
                    <p className="text-xs text-slate-600 mt-1 font-medium">{activeSite.name} ({activeSite.tableName})</p>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              /* Explicit Requirement: VERİ YOKSA TABLODA VERİ BULUNMUYOR YAZISI OLSUN */
              <tr>
                <td colSpan={isPastPayments ? 8 : 9} className="py-14 px-6 text-center bg-white border-b-2 border-black">
                  <div
                    id="empty-talep-notice"
                    className="flex flex-col items-center justify-center max-w-md mx-auto bg-amber-50/70 border-2 border-dashed border-amber-400 rounded-2xl p-6 shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 mb-3 shadow-inner">
                      <Inbox className="w-6 h-6 text-amber-700" />
                    </div>
                    <h4 className="text-base font-black text-amber-950 uppercase tracking-wide">
                      TABLODA VERİ BULUNMUYOR
                    </h4>
                    <p className="text-xs text-slate-800 mt-1.5 leading-relaxed font-medium">
                      <strong>{activeSite.name}</strong> şantiyesine ait veritabanında henüz kayıtlı talep verisi bulunmamaktadır.
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1 font-medium">
                      Yeni talep eklemek için yukarıdaki kayıt formunu kullanabilirsiniz.
                    </p>
                  </div>
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={isPastPayments ? 8 : 9} className="py-12 px-6 text-center text-slate-700 bg-white border-b-2 border-black">
                  <p className="text-sm font-bold text-slate-900">
                    Arama kriterlerine uygun talep kaydı bulunamadı.
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('ALL');
                      applyDatePreset('ALL');
                    }}
                    className="mt-2 text-xs text-blue-700 hover:underline cursor-pointer font-bold"
                  >
                    Filtreleri Temizle
                  </button>
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => {
                const id = record.id ?? index;
                const isSelected = record.id !== undefined && selectedIds.has(record.id);
                const iban = getIban(record);
                const isCopied = copiedIban === iban;
                const currentStatus = getDurum(record);

                return (
                  <tr
                    key={id}
                    className={`transition-colors group border-b-2 border-black ${
                      isSelected
                        ? 'bg-blue-100/70 border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50 bg-white'
                    }`}
                  >
                    {/* Row Checkbox */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-300">
                      {record.id !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleToggleSelectRecord(record.id!)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          aria-label={isSelected ? 'Kaydı Seçimden Çıkar' : 'Kaydı Seç'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-700" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                          )}
                        </button>
                      )}
                    </td>

                    {/* # Index */}
                    <td className="py-2.5 px-2 text-center text-slate-900 font-mono font-bold text-xs border-r border-slate-300">
                      {index + 1}
                    </td>

                    {/* Firma Ünvanı / Cari Ünvanı (Genişletilmiş) */}
                    <td className="py-2.5 px-3.5 font-bold text-black border-r border-slate-300 w-[320px] min-w-[280px] max-w-[380px]">
                      <div className="flex flex-col gap-1.5">
                        <div className="min-w-0">
                          <div className="text-xs font-black text-black leading-snug break-words" title={getFirma(record)}>
                            {getFirma(record)}
                          </div>
                          {record.created_at && (
                            <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                              {formatDate(record.created_at)}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          id={`btn-table-cari-kontrol-${record.id}`}
                          onClick={() => {
                            const firma = getFirma(record);
                            if (onOpenMuavinPdf) {
                              onOpenMuavinPdf(activeSite, firma !== '-' ? firma : '');
                            } else {
                              handleOpenCari(firma);
                            }
                          }}
                          className="inline-flex items-center justify-center gap-1 w-full px-2.5 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                          title={`${getFirma(record)} - Cari Muavin PDF ve Hesap Kontrolü`}
                        >
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">Cari Kontrol Et</span>
                        </button>
                      </div>
                    </td>

                    {/* İBAN No (Daraltılmış) */}
                    <td className="py-2.5 px-2.5 font-mono text-black font-bold border-r border-slate-300 w-[155px] min-w-[145px] max-w-[165px]">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[11px] tracking-tight text-black break-all leading-tight" title={iban}>
                          {iban !== '-' ? formatIBAN(iban) : '-'}
                        </span>
                        {iban !== '-' && (
                          <button
                            type="button"
                            onClick={() => handleCopyIban(iban)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-black transition-colors shrink-0 cursor-pointer"
                            title="İBAN Kopyala"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Açıklama - Kullanıcı Talebi: AÇIKLAMALAR ALTINDA DOSYA YOLU OLMASIN */}
                    <td className="py-2.5 px-3 text-slate-800 border-r border-slate-300">
                      <p className="line-clamp-3 text-xs leading-relaxed font-medium text-slate-800" title={getAciklama(record)}>
                        {getAciklama(record)}
                      </p>
                    </td>

                    {/* Ödenecek Tutar (Büyütülmüş) */}
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-950 text-[15px] tracking-tight whitespace-nowrap border-r border-slate-300">
                      {formatCurrency(getTutar(record))}
                    </td>

                    {/* Cari Bakiye - Ödenecek Tutar ile Talep Eden Arasında (Geçmiş Ödenenler Listesinde Gizlenir) */}
                    {!isPastPayments && (
                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap border-r border-slate-300 bg-slate-50/50">
                        {(() => {
                          const tutar = getTutar(record);
                          const rawBakiye = getCariBakiye(record);
                          let numBakiye: number | null = null;
                          if (typeof rawBakiye === 'number') {
                            numBakiye = rawBakiye;
                          } else if (typeof rawBakiye === 'string' && rawBakiye.trim() !== '') {
                            const parsed = parseFloat(rawBakiye.replace(/[^0-9.-]+/g, ''));
                            if (!isNaN(parsed)) numBakiye = parsed;
                          }

                          const isBakiyeDusuk = numBakiye === null || numBakiye < tutar;
                          const isBakiyeYeterli = numBakiye !== null && numBakiye >= tutar;

                          if (isBakiyeDusuk) {
                            return (
                              <div className="flex flex-col items-end gap-1.5 py-0.5">
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 text-white font-black text-xs shadow-sm ring-2 ring-rose-400 animate-pulse tracking-tight"
                                  title={`Cari Bakiye (${numBakiye !== null ? formatCurrency(numBakiye) : '0 ₺'}), Ödenecek Tutardan (${formatCurrency(tutar)}) Düşük!`}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-white" />
                                  <span>{numBakiye !== null ? formatCurrency(numBakiye) : (rawBakiye ? String(rawBakiye) : '0,00 ₺')}</span>
                                </span>
                              </div>
                            );
                          }

                          if (isBakiyeYeterli) {
                            return (
                              <div className="flex flex-col items-end gap-1 py-0.5">
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600 text-white font-black text-xs shadow-sm ring-2 ring-emerald-400/80 tracking-tight"
                                  title={`Cari Bakiye (${formatCurrency(numBakiye)}) Ödenecek Tutarı (${formatCurrency(tutar)}) Karşılıyor`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-100" />
                                  <span>{formatCurrency(numBakiye)}</span>
                                </span>
                              </div>
                            );
                          }

                          return <span className="text-slate-400 font-medium text-xs">-</span>;
                        })()}
                      </td>
                    )}

                    {/* Talep Eden */}
                    <td className="py-2.5 px-3 text-slate-950 font-bold whitespace-nowrap text-xs border-r border-slate-300">
                      {getTalepEden(record)}
                    </td>

                    {/* İşlemler Sütunu - GÜNCELLE VE SİL ÜSTTE, FATURA EKLE ALTTA */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {record.id !== undefined && (
                        <div className="flex flex-col items-center justify-center gap-1.5 py-0.5">
                          {/* ÜST SATIR: Güncelle ve Sil Butonları (Yalnızca Aktif Talepler) */}
                          {!isPastPayments && (
                            <div className="flex items-center justify-center gap-1.5 w-full">
                              {/* Güncelle Butonu */}
                              <button
                                id={`btn-edit-talep-${record.id}`}
                                type="button"
                                onClick={() => setEditingRecord(record)}
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex-1"
                                title="Kaydı Güncelle"
                              >
                                <Edit3 className="w-3.5 h-3.5 shrink-0" />
                                <span>Güncelle</span>
                              </button>

                              {/* Sil Butonu */}
                              <button
                                id={`btn-delete-talep-${record.id}`}
                                type="button"
                                onClick={() => setDeletingRecord(record)}
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex-1"
                                title="Kaydı Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Sil</span>
                              </button>
                            </div>
                          )}

                          {/* ALT SATIR: Fatura Ekle Butonu ve Evrak Göster Düğmesi */}
                          {(() => {
                            const firma = getFirma(record);
                            const evrakCheck = isFirmaEvrakExisting(firma, cariFaturalarFiles, record.id, record);
                            const hasEvrak = evrakCheck.exists;

                            return (
                              <div className="flex items-center justify-center gap-1.5 w-full">
                                {/* Fatura Ekle Butonu */}
                                <button
                                  id={`btn-fatura-talep-${record.id}`}
                                  type="button"
                                  onClick={() => setFaturaModalRecord(record)}
                                  className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 border flex-1 ${
                                    hasEvrak
                                      ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border-emerald-300 shadow-emerald-950/30 ring-1 ring-emerald-400/40'
                                      : 'bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-100 border-slate-400/80 shadow-slate-950/30 ring-1 ring-slate-400/30'
                                  }`}
                                  title={
                                    hasEvrak
                                      ? `CARIFATURALAR klasöründe bu firmaya ait evrak MEVCUT: ${evrakCheck.matchedFileName}`
                                      : `CARIFATURALAR klasöründe evrak bulunamadı. Fatura eklemek için tıklayın`
                                  }
                                >
                                  {hasEvrak ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                                  ) : (
                                    <PlusCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                  )}
                                  <span className="whitespace-nowrap">Fatura Ekle</span>
                                </button>

                                {/* Evrak Göster Düğmesi - Kullanıcı Talebi: CARİ/FİRMA ÜNVANI ADINDA EVRAK VARSA TAM ADDA OLACAK GÖSTER */}
                                <button
                                  id={`btn-view-evrak-${record.id}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEvrakGoster(record);
                                  }}
                                  className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 border flex-1 ${
                                    hasEvrak
                                      ? 'bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white border-emerald-300 shadow-emerald-950/30 ring-1 ring-emerald-400/40'
                                      : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 border-slate-600/80 shadow-slate-950/30'
                                  }`}
                                  title={
                                    hasEvrak
                                      ? `CARIFATURALAR Evrakını Yeni Sekmede Aç: ${evrakCheck.matchedFileName}`
                                      : `CARIFATURALAR klasöründe "${firma}" adına evrak ara ve göster`
                                  }
                                >
                                  <Eye className="w-3.5 h-3.5 shrink-0 text-white" />
                                  <span className="whitespace-nowrap">Evrak Göster</span>
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {/* Table Footer Summary */}
          <tfoot className="bg-slate-100 border-t-2 border-black text-black font-extrabold text-xs">
            <tr>
              <td colSpan={5} className="py-3 px-3 text-right font-black text-black border-r border-slate-300">
                Filtrelenen Toplam ({filteredRecords.length} Talep):
              </td>
              <td className="py-3 px-3 text-right font-mono font-black text-emerald-950 text-base border-r border-slate-300 whitespace-nowrap">
                {formatCurrency(totalFilteredAmount)}
              </td>
              {!isPastPayments && (
                <td className="py-3 px-3 text-right font-mono font-black text-xs border-r border-slate-300 whitespace-nowrap">
                  {hasAnyCariBakiye ? (
                    <span className={totalCariBakiye < 0 ? 'text-rose-800' : totalCariBakiye > 0 ? 'text-emerald-800' : 'text-slate-700'}>
                      {formatCurrency(totalCariBakiye)}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">-</span>
                  )}
                </td>
              )}
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Single Edit Modal */}
      <EditTalepModal
        isOpen={editingRecord !== null}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        activeSite={activeSite}
        onSave={onUpdateRecord}
        onOpenMuavinPdf={onOpenMuavinPdf}
        currentUser={currentUser}
      />

      {/* Single Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deletingRecord !== null}
        onClose={() => {
          if (!isDeleting) setDeletingRecord(null);
        }}
        record={deletingRecord}
        siteName={activeSite.name}
        isDeleting={isDeleting}
        onConfirm={async () => {
          if (!deletingRecord || deletingRecord.id === undefined) return;
          try {
            setIsDeleting(true);
            await onDeleteRecord(deletingRecord.id);
          } finally {
            setIsDeleting(false);
            setDeletingRecord(null);
          }
        }}
      />

      {/* Bulk Delete Confirmation Modal */}
      <BulkDeleteConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => {
          if (!isBulkDeleting) setIsBulkDeleteModalOpen(false);
        }}
        selectedRecords={selectedRecords}
        siteName={activeSite.name}
        isDeleting={isBulkDeleting}
        onConfirm={handleConfirmBulkDelete}
      />

      {/* Cari Kontrol & Hesap Geçmişi Modal */}
      <CariKontrolModal
        isOpen={cariModalOpen}
        onClose={() => setCariModalOpen(false)}
        initialFirma={selectedCariFirma}
      />

      {/* Fatura Ekle Modal */}
      <FaturaEkleModal
        isOpen={faturaModalRecord !== null}
        onClose={() => {
          setFaturaModalRecord(null);
          loadCariFaturalar(true);
        }}
        record={faturaModalRecord}
        activeSite={activeSite}
        onSaveFatura={handleSaveFatura}
      />

      {/* Tablo Toast / Bildirim Alanı */}
      {tableToast && (
        <div
          id="talep-table-toast"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border-2 text-sm font-bold transition-all animate-bounce ${
            tableToast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-400'
              : tableToast.type === 'warning'
              ? 'bg-amber-900 text-white border-amber-400'
              : 'bg-slate-900 text-white border-slate-400'
          }`}
        >
          {tableToast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : tableToast.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
          )}
          <span className="max-w-md">{tableToast.message}</span>
          <button
            type="button"
            onClick={() => setTableToast(null)}
            className="p-1 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};


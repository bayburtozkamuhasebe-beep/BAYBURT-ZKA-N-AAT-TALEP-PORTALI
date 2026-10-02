import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fetchSirketHesaplar,
  SirketHesapRecord,
} from '../lib/sirketIbanSupabase';
import {
  Building2,
  Copy,
  Check,
  Search,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
  Layers,
  FileSpreadsheet,
  CheckCheck,
  CreditCard,
  Hash,
  X,
  Sparkles,
} from 'lucide-react';
import { LogoIcon } from './Logo';
import { DigitalClock } from './DigitalClock';

interface SirketIbanlarSayfasiProps {
  onBackToTalepler: () => void;
  onBackToSantiyeListesi?: () => void;
  currentUser?: string;
  isTamYetkili?: boolean;
  sessionStartTime?: number;
  onTriggerTestTimeout?: () => void;
  onLogout?: () => void;
}

// Bank theme mapping for dark filter bar
function getBankBadge(bankName: string) {
  const norm = (bankName || '').toUpperCase();
  if (norm.includes('GARANTİ') || norm.includes('GARANTI')) {
    return {
      dot: 'bg-emerald-400',
      chip: 'bg-emerald-950/60 border-emerald-600/50 text-emerald-200',
    };
  }
  if (norm.includes('ZİRAAT KATILIM') || norm.includes('ZIRAAT KATILIM')) {
    return {
      dot: 'bg-rose-400',
      chip: 'bg-rose-950/60 border-rose-600/50 text-rose-200',
    };
  }
  if (norm.includes('ZİRAAT') || norm.includes('ZIRAAT')) {
    return {
      dot: 'bg-red-400',
      chip: 'bg-red-950/60 border-red-600/50 text-red-200',
    };
  }
  if (norm.includes('HALK')) {
    return {
      dot: 'bg-sky-400',
      chip: 'bg-sky-950/60 border-sky-600/50 text-sky-200',
    };
  }
  if (norm.includes('DENİZ') || norm.includes('DENIZ')) {
    return {
      dot: 'bg-blue-400',
      chip: 'bg-blue-950/60 border-blue-600/50 text-blue-200',
    };
  }
  if (norm.includes('VAKIF')) {
    return {
      dot: 'bg-amber-400',
      chip: 'bg-amber-950/60 border-amber-600/50 text-amber-200',
    };
  }
  if (norm.includes('KUVEYT')) {
    return {
      dot: 'bg-teal-400',
      chip: 'bg-teal-950/60 border-teal-600/50 text-teal-200',
    };
  }
  return {
    dot: 'bg-slate-400',
    chip: 'bg-slate-900 border-slate-700 text-slate-200',
  };
}

// Bank theme mapping for light/white table background
function getBankBadgeLight(bankName: string) {
  const norm = (bankName || '').toUpperCase();
  if (norm.includes('GARANTİ') || norm.includes('GARANTI')) {
    return {
      bg: 'bg-emerald-50 border-emerald-300 text-emerald-800',
      dot: 'bg-emerald-600',
    };
  }
  if (norm.includes('ZİRAAT KATILIM') || norm.includes('ZIRAAT KATILIM')) {
    return {
      bg: 'bg-rose-50 border-rose-300 text-rose-800',
      dot: 'bg-rose-600',
    };
  }
  if (norm.includes('ZİRAAT') || norm.includes('ZIRAAT')) {
    return {
      bg: 'bg-red-50 border-red-300 text-red-800',
      dot: 'bg-red-600',
    };
  }
  if (norm.includes('HALK')) {
    return {
      bg: 'bg-sky-50 border-sky-300 text-sky-800',
      dot: 'bg-sky-600',
    };
  }
  if (norm.includes('DENİZ') || norm.includes('DENIZ')) {
    return {
      bg: 'bg-blue-50 border-blue-300 text-blue-800',
      dot: 'bg-blue-600',
    };
  }
  if (norm.includes('VAKIF')) {
    return {
      bg: 'bg-amber-50 border-amber-300 text-amber-800',
      dot: 'bg-amber-600',
    };
  }
  if (norm.includes('KUVEYT')) {
    return {
      bg: 'bg-teal-50 border-teal-300 text-teal-800',
      dot: 'bg-teal-600',
    };
  }
  return {
    bg: 'bg-slate-100 border-slate-300 text-slate-800',
    dot: 'bg-slate-600',
  };
}

// 4'er haneli boşluklarla IBAN biçimlendirme
function formatIbanDisplay(iban: string): string {
  if (!iban) return '';
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

export const SirketIbanlarSayfasi: React.FC<SirketIbanlarSayfasiProps> = ({
  onBackToTalepler,
  onBackToSantiyeListesi,
  currentUser,
  isTamYetkili = false,
  sessionStartTime,
  onTriggerTestTimeout,
  onLogout,
}) => {
  const [records, setRecords] = useState<SirketHesapRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedVergiNo, setSelectedVergiNo] = useState<string>('ALL');
  const [selectedBank, setSelectedBank] = useState<string>('ALL');
  const [selectedSirket, setSelectedSirket] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');

  // Copy tracking states (map of key -> boolean)
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<{ message: string; sub?: string } | null>(null);

  // Load records from Supabase
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await fetchSirketHesaplar();
      if (error) {
        console.error('Banka hesapları yüklenemedi:', error);
        setErrorMsg('Banka hesapları yüklenirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
      } else {
        setRecords(data || []);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Banka hesaplarına erişilemedi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadData]);

  // Robust clipboard copy with fallback
  const handleCopyText = async (text: string, key: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopiedKey(key);
      setCopyToast({
        message: `${label} Panoya Kopyalandı!`,
        sub: text,
      });

      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);

      setTimeout(() => {
        setCopyToast((prev) => (prev?.message.includes(label) ? null : prev));
      }, 3500);
    } catch (err) {
      console.error('Kopyalama başarısız:', err);
      alert('Kopyalama sırasında bir hata oluştu.');
    }
  };

  // Row-level full copy: Firma, Vergi No, Banka, IBAN
  const handleCopyFullRow = (record: SirketHesapRecord) => {
    const text = [
      `ŞİRKET: ${record.sirketunvani}`,
      `VERGİ NO: ${record.vergino}`,
      `BANKA: ${record.bankaadi}`,
      `IBAN: ${record.ibanno.replace(/\s+/g, '')}`,
    ].join('\n');

    handleCopyText(text, `row-${record.id}`, 'Tüm Hesap Bilgileri');
  };

  // Distinct banks for filtering
  const distinctBanks = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.bankaadi) set.add(r.bankaadi.trim());
    });
    return Array.from(set).sort();
  }, [records]);

  // Distinct tax numbers for the dropdown listbox ("aynı kayıttan tek olsun")
  const distinctTaxNumbers = useMemo(() => {
    const map = new Map<string, string>(); // vergino -> sirket
    records.forEach((r) => {
      const vn = (r.vergino || '').trim();
      if (vn && !map.has(vn)) {
        map.set(vn, (r.sirketunvani || '').trim());
      }
    });
    return Array.from(map.entries())
      .map(([vergino, sirketunvani]) => ({ vergino, sirketunvani }))
      .sort((a, b) => a.vergino.localeCompare(b.vergino));
  }, [records]);

  // Distinct companies for filtering
  const distinctCompanies = useMemo(() => {
    const map = new Map<string, string>(); // unvan -> vergi
    records.forEach((r) => {
      if (r.sirketunvani) map.set(r.sirketunvani.trim(), r.vergino || '');
    });
    return Array.from(map.entries()).map(([unvan, vergi]) => ({ unvan, vergi }));
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return records.filter((r) => {
      const matchSearch =
        !q ||
        (r.sirketunvani && r.sirketunvani.toLowerCase().includes(q)) ||
        (r.vergino && r.vergino.toLowerCase().includes(q)) ||
        (r.bankaadi && r.bankaadi.toLowerCase().includes(q)) ||
        (r.ibanno && r.ibanno.toLowerCase().replace(/\s+/g, '').includes(q.replace(/\s+/g, '')));

      const matchBank = selectedBank === 'ALL' || (r.bankaadi && r.bankaadi.trim() === selectedBank);
      const matchCompany = selectedSirket === 'ALL' || (r.sirketunvani && r.sirketunvani.trim() === selectedSirket);
      const matchVergiNo = selectedVergiNo === 'ALL' || (r.vergino && r.vergino.trim() === selectedVergiNo.trim());

      return matchSearch && matchBank && matchCompany && matchVergiNo;
    });
  }, [records, searchTerm, selectedBank, selectedSirket, selectedVergiNo]);

  // Grouped records by company
  const groupedByCompany = useMemo(() => {
    const map = new Map<string, { companyName: string; vergiNo: string; items: SirketHesapRecord[] }>();
    filteredRecords.forEach((r) => {
      const key = (r.sirketunvani || 'Diğer').trim();
      if (!map.has(key)) {
        map.set(key, {
          companyName: key,
          vergiNo: r.vergino || '',
          items: [],
        });
      }
      map.get(key)!.items.push(r);
    });
    return Array.from(map.values());
  }, [filteredRecords]);

  return (
    <div className="min-h-screen bg-[#081226] text-slate-100 flex flex-col antialiased">
      {/* Top Header */}
      <header className="bg-[#0b1933] border-b border-blue-900/50 px-4 sm:px-6 py-3.5 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 max-w-[1920px] mx-auto w-full">
          {/* Title & Brand */}
          <div className="flex items-center gap-3.5">
            <div className="p-1.5 rounded-xl bg-blue-950/80 border border-blue-500/40 shadow-inner flex items-center justify-center shrink-0">
              <LogoIcon size={38} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-blue-400 tracking-wider uppercase flex items-center gap-1.5">
                <span>BAYBURT ÖZKA İNŞAAT</span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-400 font-bold">RESMİ BANKA HESAPLARI</span>
              </div>
              <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-400 inline" />
                  <span>Şirket IBAN ve Hesap Numaraları</span>
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  {records.length} Kayıtlı Hesap
                </span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 uppercase tracking-wider">
                  Salt Okunur
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons & Clocks */}
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
            {/* Digital Clock */}
            <DigitalClock
              sessionStartTime={sessionStartTime}
              onTriggerTestTimeout={onTriggerTestTimeout}
            />

            {/* Refresh Button */}
            <button
              onClick={loadData}
              disabled={isLoading}
              title="Hesapları Yeniden Yükle"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0e1f3d] hover:bg-blue-600 text-slate-200 hover:text-white border border-blue-800/50 hover:border-blue-500 transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>

            {/* Back to Şantiye Listesi (Optional) */}
            {onBackToSantiyeListesi && (
              <button
                onClick={onBackToSantiyeListesi}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-blue-200 hover:text-white border border-blue-600/50 hover:border-blue-400 text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                title="Şantiye & Birim Seçim Sayfasına Git"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Şantiye Listesi</span>
              </button>
            )}

            {/* Return to Talepler (Primary Back Button) */}
            <button
              onClick={onBackToTalepler}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md shadow-blue-950/50 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title="Ödeme Talepleri Sayfasına Geri Dön"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Talepler Sayfasına Dön</span>
            </button>

            {/* User Badge */}
            {currentUser && (
              <div
                className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border ${
                  isTamYetkili
                    ? 'bg-amber-950/80 border-amber-500/60 text-amber-200'
                    : 'bg-[#091733] border-blue-700/40 text-blue-200'
                }`}
              >
                <span className="text-slate-400">Kullanıcı:</span>
                <strong className="text-white font-mono">{currentUser}</strong>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1920px] w-full mx-auto space-y-5">
        {/* Info Banner: Read-Only Policy */}
        <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 border border-blue-600/30 rounded-2xl p-4 shadow-lg backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🔒 Güvenli Bilgi & Kopyalama Ekranı</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Bu sayfadaki banka ve IBAN bilgileri yalnızca görüntüleme ve hızlı kopyalama amacıyla listelenmektedir.
                <strong className="text-white ml-1">Güncelleme, silme ve değişiklik yapılamaz.</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#071329] px-3 py-2 rounded-xl border border-blue-900/60 shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Kopyalamak için satırdaki simgelere tıklamanız yeterlidir.</span>
          </div>
        </div>

        {/* Search, Bank Filters & View Switcher Bar */}
        <div className="bg-[#0b1b38] border border-blue-800/40 rounded-2xl p-4 space-y-4 shadow-xl">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            {/* Search Box & Vergi No Dropdown Listbox */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              {/* Search Input: Şirket Ünvanı, Banka Adı, IBAN */}
              <div className="relative flex-1 min-w-[260px] max-w-lg">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Şirket ünvanı, Banka adı veya IBAN ile ara..."
                  className="w-full bg-[#071328] border border-blue-700/50 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Vergi No ile Ara: Label + Açılır Listbox (BEYAZ ARKA FON) */}
              <div className="flex items-center gap-2 shrink-0 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-sm">
                <label
                  htmlFor="select-vergi-no"
                  className="text-xs text-slate-800 font-extrabold shrink-0 whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                >
                  <Hash className="w-3.5 h-3.5 text-amber-600" />
                  <span>Vergi No ile Ara:</span>
                </label>
                <select
                  id="select-vergi-no"
                  value={selectedVergiNo}
                  onChange={(e) => setSelectedVergiNo(e.target.value)}
                  className="bg-white text-xs font-bold text-slate-900 focus:outline-none cursor-pointer max-w-[220px] sm:max-w-[280px] truncate py-1"
                >
                  <option value="ALL" className="bg-white text-slate-900 font-semibold">
                    Tüm Vergi Noları ({distinctTaxNumbers.length})
                  </option>
                  {distinctTaxNumbers.map(({ vergino, sirketunvani }) => (
                    <option key={vergino} value={vergino} className="bg-white text-slate-900">
                      {vergino} — {sirketunvani}
                    </option>
                  ))}
                </select>
                {selectedVergiNo !== 'ALL' && (
                  <button
                    onClick={() => setSelectedVergiNo('ALL')}
                    title="Vergi No filtresini kaldır"
                    className="text-slate-400 hover:text-slate-700 p-0.5 ml-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Right Controls: Company Filter Dropdown & View Mode Switcher */}
            <div className="flex items-center flex-wrap gap-2.5">
              {/* Company Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 font-semibold hidden sm:inline">Şirket:</span>
                <select
                  value={selectedSirket}
                  onChange={(e) => setSelectedSirket(e.target.value)}
                  className="bg-[#071328] border border-blue-700/50 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[260px] truncate"
                >
                  <option value="ALL">Tüm Şirketler ({distinctCompanies.length})</option>
                  {distinctCompanies.map(({ unvan, vergi }) => (
                    <option key={unvan} value={unvan}>
                      {unvan} {vergi ? `(VN: ${vergi})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="bg-[#071328] p-1 rounded-xl border border-blue-800/50 flex items-center">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tablo
                </button>
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'grouped'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Şirket Gruplu
                </button>
              </div>
            </div>
          </div>

          {/* Bank Quick Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-semibold shrink-0">Banka:</span>
            <button
              onClick={() => setSelectedBank('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer border ${
                selectedBank === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                  : 'bg-[#071328] text-slate-300 border-blue-900/60 hover:border-blue-600'
              }`}
            >
              Tümü ({records.length})
            </button>
            {distinctBanks.map((bank) => {
              const count = records.filter((r) => r.bankaadi && r.bankaadi.trim() === bank).length;
              const isSelected = selectedBank === bank;
              const style = getBankBadge(bank);
              return (
                <button
                  key={bank}
                  onClick={() => setSelectedBank(bank)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                      : `${style.chip} hover:brightness-125`
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <span>{bank}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Counter & Active Filter Indicators */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <div>
            Toplam <strong>{records.length}</strong> hesaptan <strong>{filteredRecords.length}</strong> tanesi listeleniyor.
            {(searchTerm || selectedBank !== 'ALL' || selectedSirket !== 'ALL' || selectedVergiNo !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedBank('ALL');
                  setSelectedSirket('ALL');
                  setSelectedVergiNo('ALL');
                }}
                className="ml-3 text-blue-400 hover:text-blue-300 font-semibold underline cursor-pointer"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            <span>Herhangi bir IBAN veya bilginin kopyalama simgesine tıklayabilirsiniz</span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="bg-rose-950/80 border border-rose-600/60 text-rose-200 p-4 rounded-xl text-sm flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex-1">{errorMsg}</div>
            <button
              onClick={loadData}
              className="px-3 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-white text-xs font-bold"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xl">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <div className="text-slate-900 font-bold text-base">Şirket IBAN ve Hesap Bilgileri Yükleniyor...</div>
            <div className="text-slate-500 text-xs">Supabase veritabanından güncel veriler alınıyor.</div>
          </div>
        ) : filteredRecords.length === 0 ? (
          /* Empty Search Results */
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xl">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
            <div className="text-slate-900 font-bold text-base">Arama kriterlerine uygun hesap bulunamadı</div>
            <p className="text-slate-500 text-xs max-w-md mx-auto">
              Arama kelimenizi değiştirin veya filtreleri sıfırlayarak tüm şirket hesaplarını listeleyin.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBank('ALL');
                setSelectedSirket('ALL');
                setSelectedVergiNo('ALL');
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
            >
              Tüm Filtreleri Temizle
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* 1. TABLE VIEW - BEYAZ ARKA FON */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                    <th className="py-3.5 px-3 text-center w-12 text-slate-500">#</th>
                    <th className="py-3.5 px-5 min-w-[380px] sm:min-w-[420px] text-slate-900 font-black">
                      ŞİRKET ÜNVANI
                    </th>
                    <th className="py-3.5 px-4 min-w-[170px] w-[180px] text-slate-900 font-black">
                      VERGİ NO
                    </th>
                    <th className="py-3.5 px-4 min-w-[150px] w-[160px]">BANKA ADI</th>
                    <th className="py-3.5 px-3 w-[260px] min-w-[250px]">IBAN NUMARASI</th>
                    <th className="py-3.5 px-3 text-center w-[130px] min-w-[130px]">KOPYALA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs bg-white">
                  {filteredRecords.map((record, index) => {
                    const bankStyle = getBankBadgeLight(record.bankaadi);
                    const formattedIban = formatIbanDisplay(record.ibanno);
                    const rawIban = (record.ibanno || '').replace(/\s+/g, '');
                    const isIbanCopied = copiedKey === `iban-${record.id}`;
                    const isSirketCopied = copiedKey === `sirket-${record.id}`;
                    const isVergiCopied = copiedKey === `vergi-${record.id}`;
                    const isBankaCopied = copiedKey === `banka-${record.id}`;
                    const isRowCopied = copiedKey === `row-${record.id}`;

                    return (
                      <tr
                        key={record.id || index}
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        {/* Row Index */}
                        <td className="py-4 px-3 text-center text-slate-500 font-mono font-bold text-[11px]">
                          {index + 1}
                        </td>

                        {/* Şirket Ünvanı - BÜYÜTÜLDÜ */}
                        <td className="py-4 px-5">
                          <div className="flex items-start justify-between gap-3">
                            <span className="font-extrabold text-[13.5px] sm:text-[14px] text-slate-950 leading-snug tracking-tight">
                              {record.sirketunvani}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyText(
                                  record.sirketunvani,
                                  `sirket-${record.id}`,
                                  'Şirket Ünvanı'
                                )
                              }
                              title="Şirket Ünvanını Kopyala"
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                isSirketCopied
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                                  : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-950 hover:bg-slate-200'
                              }`}
                            >
                              {isSirketCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Vergi No - BÜYÜTÜLDÜ */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-amber-950 bg-amber-100/90 px-3.5 py-1.5 rounded-lg border border-amber-300 text-[12.5px] sm:text-xs tracking-wider shadow-xs">
                              {record.vergino || '-'}
                            </span>
                            {record.vergino && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyText(
                                    record.vergino,
                                    `vergi-${record.id}`,
                                    'Vergi Numarası'
                                  )
                                }
                                title="Vergi Numarasını Kopyala"
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isVergiCopied
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                                    : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-950 hover:bg-slate-200'
                                }`}
                              >
                                {isVergiCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Banka Adı */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold border ${bankStyle.bg}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${bankStyle.dot}`} />
                              <span>{record.bankaadi}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyText(
                                  record.bankaadi,
                                  `banka-${record.id}`,
                                  'Banka Adı'
                                )
                              }
                              title="Banka Adını Kopyala"
                              className={`p-1 rounded border transition-all cursor-pointer ${
                                isBankaCopied
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200 opacity-60 group-hover:opacity-100'
                              }`}
                            >
                              {isBankaCopied ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* IBAN Numarası - DARALTILDI */}
                        <td className="py-4 px-3 w-[260px]">
                          <div className="flex items-center justify-between gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-blue-400 transition-all">
                            <span
                              className="font-mono font-black text-[11px] sm:text-[11.5px] text-blue-950 tracking-tight select-all cursor-text"
                              title="Seçip kopyalayabilir veya kopyala butonuna basabilirsiniz"
                            >
                              {formattedIban}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyText(
                                  rawIban,
                                  `iban-${record.id}`,
                                  `${record.bankaadi} IBAN`
                                )
                              }
                              title="IBAN Numarasını Kopyala"
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer border shadow-xs shrink-0 ${
                                isIbanCopied
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-blue-600 hover:scale-105 active:scale-95'
                              }`}
                            >
                              {isIbanCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-white" />
                                  <span>Kopyalandı!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-blue-100" />
                                  <span>Kopyala</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Tüm Bilgileri Kopyala */}
                        <td className="py-4 px-3 text-center w-[130px]">
                          <button
                            type="button"
                            onClick={() => handleCopyFullRow(record)}
                            title="Şirket, Banka, Vergi No ve IBAN bilgilerinin tümünü kopyala"
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                              isRowCopied
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 border-slate-300 hover:border-blue-400'
                            }`}
                          >
                            {isRowCopied ? (
                              <>
                                <CheckCheck className="w-3.5 h-3.5 text-white" />
                                <span>Kopyalandı!</span>
                              </>
                            ) : (
                              <>
                                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                                <span>Tümünü Kopyala</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer info */}
            <div className="bg-slate-100 border-t border-slate-300 p-3 px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium">Supabase Canlı Veritabanı (`sirkethesapnolar`) ile senkronize</span>
              </div>
              <div className="text-[11px] text-slate-500 font-semibold">
                🔒 Bu sayfada güncelleme ve silme işlemi kapalıdır (Salt Okunur)
              </div>
            </div>
          </div>
        ) : (
          /* 2. GROUPED BY COMPANY VIEW (CARDS) - BEYAZ ARKA FONLU */
          <div className="space-y-6">
            {groupedByCompany.map((group, gIdx) => (
              <div
                key={group.companyName || gIdx}
                className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
              >
                {/* Company Group Header */}
                <div className="bg-slate-100 border-b border-slate-300 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-100 border border-blue-200 text-blue-700">
                      <Building2 className="w-6 h-6 text-blue-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                          {group.companyName}
                        </h2>
                        {group.vergiNo && (
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-900 font-mono text-xs font-bold">
                            VN: {group.vergiNo}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                          {group.items.length} Hesap
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Resmi banka hesapları ve IBAN numaraları
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          `ŞİRKET: ${group.companyName}\nVERGİ NO: ${group.vergiNo}`,
                          `grp-co-${gIdx}`,
                          'Şirket & Vergi No'
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <Copy className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ünvan & VN Kopyala</span>
                    </button>
                  </div>
                </div>

                {/* Bank Accounts Grid */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 bg-slate-50">
                  {group.items.map((record) => {
                    const bankStyle = getBankBadgeLight(record.bankaadi);
                    const formattedIban = formatIbanDisplay(record.ibanno);
                    const rawIban = (record.ibanno || '').replace(/\s+/g, '');
                    const isIbanCopied = copiedKey === `iban-${record.id}`;
                    const isRowCopied = copiedKey === `row-${record.id}`;

                    return (
                      <div
                        key={record.id}
                        className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-all group"
                      >
                        {/* Card Top: Bank Name & Row Copy */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold border ${bankStyle.bg}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${bankStyle.dot}`} />
                            <span>{record.bankaadi}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopyFullRow(record)}
                            title="Tüm Bilgileri Kopyala"
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                              isRowCopied
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                            }`}
                          >
                            {isRowCopied ? (
                              <CheckCheck className="w-3.5 h-3.5 text-white" />
                            ) : (
                              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            <span className="text-[10px]">Tümünü Kopyala</span>
                          </button>
                        </div>

                        {/* IBAN Box */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                            <span>IBAN NUMARASI</span>
                            <span className="text-blue-700 font-mono font-bold">TR</span>
                          </div>
                          <div className="font-mono font-black text-sm text-blue-950 tracking-wider break-all select-all">
                            {formattedIban}
                          </div>
                        </div>

                        {/* IBAN Copy Button */}
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              rawIban,
                              `iban-${record.id}`,
                              `${record.bankaadi} IBAN`
                            )
                          }
                          className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center justify-center gap-2 shadow-sm ${
                            isIbanCopied
                              ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/50'
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-blue-600 hover:scale-[1.02] active:scale-[0.98]'
                          }`}
                        >
                          {isIbanCopied ? (
                            <>
                              <Check className="w-4 h-4 text-white" />
                              <span>IBAN Kopyalandı!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 text-blue-100" />
                              <span>IBAN Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Toast Feedback */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <div className="bg-emerald-950 border border-emerald-500/70 text-emerald-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-sm text-white">{copyToast.message}</div>
              {copyToast.sub && (
                <div className="text-[11px] font-mono text-emerald-300 truncate mt-0.5 max-w-[280px]">
                  {copyToast.sub}
                </div>
              )}
            </div>
            <button
              onClick={() => setCopyToast(null)}
              className="ml-auto text-emerald-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

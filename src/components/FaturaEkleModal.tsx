import React, { useState, useEffect, useCallback } from 'react';
import { SiteConfig, TalepRecord } from '../types';
import { formatCurrency, formatFileSize } from '../utils/formatters';
import {
  X,
  Receipt,
  Upload,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileText,
  DollarSign,
  Check,
  Loader2,
  HardDrive,
  ExternalLink,
  File,
  Trash2,
  Sparkles,
  Info,
  FolderOpen,
  Copy,
  CheckCheck,
  ShieldAlert,
  RefreshCw,
  Database,
} from 'lucide-react';
import {
  FATURA_STORAGE_PROJECT_ID,
  FATURA_SUPABASE_URL,
  FATURA_STORAGE_BUCKET,
  SITE_FATURA_STORAGE_FOLDERS,
  turkishToEnglish,
  sanitizeFirmaFileName,
  resolveNextFaturaFileName,
  uploadFaturaFile,
  CARIFATURALAR_RLS_SQL,
  testBucketUpload,
  getCariFaturalarFileList,
  isFirmaEvrakExisting,
  FirmaEvrakCheckResult,
} from '../lib/supabase';

interface FaturaEkleModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TalepRecord | null;
  activeSite: SiteConfig;
  onSaveFatura: (
    recordId: string | number,
    faturaData: {
      faturaNo: string;
      faturaTarihi: string;
      faturaTutari: number;
      yeniCariBakiye: number;
      aciklama?: string;
      dosyaAdi?: string;
      dosyaUrl?: string;
      dosyaPath?: string;
    }
  ) => Promise<boolean>;
}

export const FaturaEkleModal: React.FC<FaturaEkleModalProps> = ({
  isOpen,
  onClose,
  record,
  activeSite,
  onSaveFatura,
}) => {
  const [faturaNo, setFaturaNo] = useState('');
  const [faturaTarihi, setFaturaTarihi] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [faturaTutari, setFaturaTutari] = useState<string>('');
  const [ekAciklama, setEkAciklama] = useState('');

  // Dosya Yükleme State'leri
  const [targetBucket, setTargetBucket] = useState<string>('CARIFATURALAR');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [targetFolder, setTargetFolder] = useState<string>('');
  const [targetFileName, setTargetFileName] = useState<string>('');
  const [hasDuplicate, setHasDuplicate] = useState(false);
  const [sequenceNumber, setSequenceNumber] = useState<number | null>(null);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadedPublicUrl, setUploadedPublicUrl] = useState<string | null>(null);

  // RLS Politika ve Hata Yardımcı State'leri
  const [isRlsError, setIsRlsError] = useState(false);
  const [showRlsGuide, setShowRlsGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isTestingPolicy, setIsTestingPolicy] = useState(false);
  const [testPolicyResult, setTestPolicyResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [existingEvrak, setExistingEvrak] = useState<FirmaEvrakCheckResult | null>(null);

  // Helper functions
  const getFirma = useCallback(
    (r: TalepRecord | null) => r?.firma_unvani || r?.company || '-',
    []
  );

  const getTutar = (r: TalepRecord | null) => {
    if (!r) return 0;
    const val = r.odenecek_tutar ?? r.tutar ?? 0;
    const num = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
    return isNaN(num) ? 0 : num;
  };

  const getCariBakiye = (r: TalepRecord | null) => {
    if (!r) return 0;
    const val = r.cari_bakiye ?? r.bakiye ?? 0;
    const num =
      typeof val === 'number'
        ? val
        : parseFloat(String(val).replace(/,/g, '.')) || 0;
    return isNaN(num) ? 0 : num;
  };

  const talepTutari = record ? getTutar(record) : 0;
  const mevcutBakiye = record ? getCariBakiye(record) : 0;
  const eksikTutar = Math.max(0, talepTutari - mevcutBakiye);

  // Modal açıldığında form değerlerini hazırla
  useEffect(() => {
    if (isOpen && record) {
      setFaturaNo('');
      setFaturaTarihi(new Date().toISOString().split('T')[0]);
      setFaturaTutari(eksikTutar > 0 ? String(eksikTutar) : String(talepTutari));
      setEkAciklama('');
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setTargetFileName('');
      setHasDuplicate(false);
      setSequenceNumber(null);
      setErrorMsg(null);
      setIsSubmitting(false);
      setUploadStatus(null);
      setIsSuccess(false);
      setUploadedPublicUrl(null);

      // Hedef klasör: CARIFATURALAR kök dizini veya isteğe bağlı alt klasör
      const defaultFolder =
        SITE_FATURA_STORAGE_FOLDERS[activeSite.id] || '';
      setTargetFolder(defaultFolder);

      // Bu firmaya ait CARIFATURALAR dosyasında mevcut evrak var mı kontrol et
      const firma = getFirma(record);
      getCariFaturalarFileList().then((list) => {
        const check = isFirmaEvrakExisting(firma, list, record.id, record);
        setExistingEvrak(check);
      }).catch(() => {});
    }
  }, [isOpen, record, activeSite.id, getFirma]);

  // Dosya veya firma değiştiğinde dosya adını otomatik çözümle
  const resolveFileName = useCallback(
    async (file: File, folder: string, bucket: string = targetBucket) => {
      if (!record) return;
      setIsCheckingName(true);
      const firma = getFirma(record);
      try {
        const result = await resolveNextFaturaFileName(folder, firma, file.name, bucket);
        setTargetFileName(result.resolvedFileName);
        setHasDuplicate(result.hasDuplicate);
        setSequenceNumber(result.sequenceNumber);
      } catch (err) {
        console.error('Dosya adı çözümleme hatası:', err);
        const base = sanitizeFirmaFileName(firma);
        const ext = file.name.substring(file.name.lastIndexOf('.')) || '.pdf';
        setTargetFileName(`${base}${ext}`);
      } finally {
        setIsCheckingName(false);
      }
    },
    [record, getFirma, targetBucket]
  );

  const handleCopySql = () => {
    navigator.clipboard.writeText(CARIFATURALAR_RLS_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3500);
  };

  const handleTestPolicy = async () => {
    setIsTestingPolicy(true);
    setTestPolicyResult(null);
    const res = await testBucketUpload('CARIFATURALAR');
    setIsTestingPolicy(false);
    if (res.ok) {
      setTestPolicyResult({
        ok: true,
        msg: 'İzin başarıyla doğrulandı! CARIFATURALAR bucketına doğrudan dosya kaydedebilirsiniz.',
      });
      setIsRlsError(false);
      setErrorMsg(null);
    } else {
      setTestPolicyResult({
        ok: false,
        msg: res.error || 'İzin henüz tanımlanmamış. Lütfen SQL Editöründe kodu çalıştırıp "Run"a bastığınızdan emin olun.',
      });
    }
  };

  const handleSwitchToDosyalarBucket = () => {
    setTargetBucket('DOSYALAR');
    setIsRlsError(false);
    setErrorMsg(null);
    setShowRlsGuide(false);
    if (selectedFile) {
      resolveFileName(selectedFile, targetFolder, 'DOSYALAR');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
    resolveFileName(file, targetFolder);
  };

  const handleFolderChange = (newFolder: string) => {
    setTargetFolder(newFolder);
    if (selectedFile) {
      resolveFileName(selectedFile, newFolder);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setTargetFileName('');
    setHasDuplicate(false);
    setSequenceNumber(null);
  };

  if (!isOpen || !record) return null;

  const numFaturaTutari =
    parseFloat(faturaTutari.replace(/[^0-9.-]+/g, '')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Kullanıcı talebi: Fatura eklendiğinde Kaydet butonuna basılınca fatura numarası isteme!
    // Sadece dosya seçilmiş olması veya bilgi girilmiş olması yeterlidir.
    if (!selectedFile && !faturaNo.trim() && numFaturaTutari <= 0) {
      setErrorMsg('Lütfen kaydedilecek fatura dosyasını seçiniz veya sürükleyip bırakınız.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setUploadStatus(null);

    let finalDosyaAdi: string | undefined = undefined;
    let finalDosyaUrl: string | undefined = undefined;
    let finalDosyaPath: string | undefined = undefined;

    try {
      // Eğer dosya seçilmişse Supabase Storage hedef bucket'ına yükle
      if (selectedFile) {
        setUploadStatus(
          `Fatura dosyası Supabase Storage (${FATURA_STORAGE_PROJECT_ID}/${targetBucket}) adresine yükleniyor...`
        );

        const uploadResult = await uploadFaturaFile(
          selectedFile,
          targetFolder,
          targetFileName || selectedFile.name,
          targetBucket
        );

        if (!uploadResult.success) {
          if (uploadResult.isRlsError) {
            setIsRlsError(true);
            setShowRlsGuide(true);
          }
          throw new Error(
            uploadResult.error || 'Dosya Supabase Storage adresine yüklenemedi.'
          );
        }

        finalDosyaAdi = uploadResult.fileName;
        finalDosyaUrl = uploadResult.publicUrl;
        finalDosyaPath = uploadResult.fullPath;
        setUploadedPublicUrl(uploadResult.publicUrl);
        setUploadStatus('Dosya başarıyla yüklendi! Kayıt güncelleniyor...');
      }

      // Veritabanı kaydını güncelle - Kullanıcı talebi: CARİ BAKİYEYİ DEĞİŞTİRME, MEVCUT NEYSE KALSIN
      const success = await onSaveFatura(record.id!, {
        faturaNo: faturaNo.trim().toUpperCase(),
        faturaTarihi,
        faturaTutari: numFaturaTutari,
        yeniCariBakiye: mevcutBakiye,
        aciklama: ekAciklama.trim(),
        dosyaAdi: finalDosyaAdi,
        dosyaUrl: finalDosyaUrl,
        dosyaPath: finalDosyaPath,
      });

      if (success) {
        setIsSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg('Fatura kaydedilirken bir hata oluştu.');
      }
    } catch (err: any) {
      console.error('Fatura kaydetme hatası:', err);
      setErrorMsg(err?.message || 'İşlem sırasında beklenmeyen bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#0b1933] border-2 border-amber-500/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#081329] border-b border-blue-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Receipt className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>FATURA EKLE</span>
              </h3>
              <p className="text-xs text-slate-300">
                {activeSite.name} / <strong className="text-white">{getFirma(record)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* CARIFATURALAR Mevcut Evrak Bildirimi */}
          {existingEvrak && existingEvrak.exists && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border-2 border-emerald-500/80 text-white text-xs flex items-center justify-between gap-3 shadow-lg animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-emerald-800 text-emerald-300 shrink-0 border border-emerald-400/50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-emerald-300 uppercase tracking-wide text-xs">
                      CARIFATURALAR Evrakı Mevcut
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-700 text-emerald-100 border border-emerald-400/40">
                      Doğrulandı
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-100/90 truncate block font-mono font-medium mt-0.5" title={existingEvrak.matchedFileName}>
                    {existingEvrak.matchedFileName}
                  </span>
                </div>
              </div>
              {existingEvrak.matchedFileUrl && (
                <a
                  href={existingEvrak.matchedFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs border border-emerald-300 shrink-0 flex items-center gap-1.5 shadow-sm transition-all"
                  title="Evrakı Yeni Sekmede Aç"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Görüntüle</span>
                </a>
              )}
            </div>
          )}

          {/* Comparison summary card */}
          <div className="bg-[#081326] border border-blue-900/70 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-blue-950/50 border border-blue-800/40">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">
                Talep Tutarı
              </span>
              <span className="text-xs font-mono font-black text-white">
                {formatCurrency(talepTutari)}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-800/40">
              <span className="block text-[10px] text-rose-300 font-bold uppercase">
                Mevcut Bakiye
              </span>
              <span className="text-xs font-mono font-black text-rose-200">
                {formatCurrency(mevcutBakiye)}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-amber-950/50 border border-amber-800/40">
              <span className="block text-[10px] text-amber-300 font-bold uppercase">
                Bakiye Açığı
              </span>
              <span className="text-xs font-mono font-black text-amber-300">
                -{formatCurrency(eksikTutar)}
              </span>
            </div>
          </div>

          {/* Hata & Başarı Bildirimleri */}
          {errorMsg && !isRlsError && (
            <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500 text-rose-200 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* RLS Policy Rehber / Hata Kutusu */}
          {(isRlsError || showRlsGuide) && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/90 via-slate-900 to-blue-950/90 border-2 border-amber-500/80 text-white shadow-xl space-y-3 animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>Supabase CARIFATURALAR Bucket İçin RLS Yükleme İzni Gerekiyor</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRlsGuide(false)}
                  className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Supabase'de oluşturulan <strong className="text-amber-300 font-mono">CARIFATURALAR</strong> bucket'ı için Row-Level Security (RLS) yükleme politikası tanımlanmamış. Bu yüzden Supabase <span className="font-mono text-rose-300 font-bold">403 AccessDenied</span> hatası döndürüyor.
              </p>

              <div className="bg-black/70 p-2.5 rounded-lg border border-amber-500/40 text-[11px] font-mono text-emerald-300 relative">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-slate-400 text-[10px]">
                  <span>Supabase SQL Editöründe Çalıştırılacak Kod:</span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 cursor-pointer"
                  >
                    {copiedSql ? (
                      <>
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>SQL'i Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre text-[10.5px] text-amber-200">
                  {CARIFATURALAR_RLS_SQL}
                </pre>
              </div>

              {/* Aksiyon Butonları */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href="https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Supabase SQL Editörünü Aç</span>
                </a>

                <button
                  type="button"
                  onClick={handleTestPolicy}
                  disabled={isTestingPolicy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isTestingPolicy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>İzni Test Et / Doğrula</span>
                </button>

                <button
                  type="button"
                  onClick={handleSwitchToDosyalarBucket}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer ml-auto"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Şimdilik DOSYALAR Bucket'ına Kaydet</span>
                </button>
              </div>

              {testPolicyResult && (
                <div
                  className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                    testPolicyResult.ok
                      ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-300'
                      : 'bg-rose-950/80 border border-rose-500 text-rose-300'
                  }`}
                >
                  {testPolicyResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{testPolicyResult.msg}</span>
                </div>
              )}
            </div>
          )}

          {isSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Fatura başarıyla kaydedildi ve dosya Supabase Storage adresine yüklendi!
              </span>
            </div>
          )}

          {uploadStatus && !isSuccess && (
            <div className="p-2.5 rounded-xl bg-blue-950/80 border border-blue-600/70 text-blue-200 text-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
              <span>{uploadStatus}</span>
            </div>
          )}

          {/* Form Alanları: Fatura No, Tarih, Tutar (Hepsi İsteğe Bağlı) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Fatura No (İsteğe Bağlı) */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                FATURA NO <span className="text-slate-400 font-normal">(İsteğe Bağlı)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <input
                  type="text"
                  value={faturaNo}
                  onChange={(e) => setFaturaNo(e.target.value.toUpperCase())}
                  placeholder="GIB2025... (Opsiyonel)"
                  className="w-full pl-9 pr-3 py-2 bg-[#081326] rounded-xl text-xs text-white placeholder-slate-500 border border-blue-900/70 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* Fatura Tarihi */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                FATURA TARİHİ <span className="text-slate-400 font-normal">(İsteğe Bağlı)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4 text-amber-400" />
                </div>
                <input
                  type="date"
                  value={faturaTarihi}
                  onChange={(e) => setFaturaTarihi(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#081326] rounded-xl text-xs text-white border border-blue-900/70 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono font-bold cursor-pointer"
                />
              </div>
            </div>

            {/* Fatura Tutarı */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                FATURA TUTARI (₺) <span className="text-slate-400 font-normal">(İsteğe Bağlı)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={faturaTutari}
                  onChange={(e) => setFaturaTutari(e.target.value)}
                  placeholder="0.00 (Opsiyonel)"
                  className="w-full pl-9 pr-3 py-2 bg-[#081326] rounded-xl text-xs text-white placeholder-slate-500 border border-blue-900/70 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                />
              </div>
              <div className="text-[10px] text-emerald-400 mt-1 font-mono font-bold truncate">
                {numFaturaTutari > 0 ? formatCurrency(numFaturaTutari) : ''}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SUPABASE FATURA DOSYASI YÜKLEME ALANI (HER TÜRLÜ UZANTI DESTEĞİ) */}
          {/* ============================================================== */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#2a1904] via-[#1f1303] to-[#140c02] border-2 border-amber-500/80 shadow-xl shadow-amber-950/50 space-y-3 relative overflow-hidden">
            {/* Üst Vurgu Çizgisi */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500"></div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md">
                  <UploadCloud className="w-4 h-4 text-slate-950" />
                  FATURA YÜKLE
                </span>
                <span className="text-xs font-bold text-amber-100">Fatura & Evrak Dosyası Yükleme</span>
              </div>
              <span className="text-[10px] text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-md border border-amber-700/60 font-mono font-bold">
                Bucket: CARIFATURALAR
              </span>
            </div>

            {/* Dosya Seçme / Drag & Drop Kutusu - Belirgin Özel Renk ve Buton */}
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-amber-400/90 hover:border-yellow-300 rounded-xl p-5 text-center transition-all bg-amber-950/30 hover:bg-amber-950/50 cursor-pointer flex flex-col items-center justify-center gap-3 group"
              >
                <input
                  type="file"
                  id="fatura-file-input"
                  accept="*/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="fatura-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2.5 w-full"
                >
                  <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-400 group-hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md group-hover:scale-105 transition-transform">
                    <Upload className="w-4 h-4 text-slate-950" />
                    <span>FATURA YÜKLE</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-100 block">
                      Fatura dosyasını seçmek için tıklayın veya buraya sürükleyip bırakın
                    </span>
                    <span className="text-[11px] text-amber-300/80 block mt-0.5">
                      PDF, JPG, PNG, WEBP, XLSX, DOCX vb. tüm uzantılar kabul edilir
                    </span>
                  </div>
                </label>
              </div>
            ) : (
              /* Seçilen Dosya Kartı ve Supabase Yeniden İsimlendirme Bilgisi */
              <div className="space-y-3">
                <div className="p-3 bg-blue-950/70 border border-blue-700/60 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                      <File className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatFileSize ? formatFileSize(selectedFile.size) : `${(selectedFile.size / 1024).toFixed(1)} KB`} • {selectedFile.type || 'Bilinmeyen tür'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                    title="Dosyayı Değiştir / Kaldır"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Otomatik İsimlendirme ve Duplicate Kontrol Kartı */}
                <div className="p-3 bg-[#061021] rounded-xl border border-amber-500/50 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Supabase Storage Kayıt Adı:</span>
                    </span>
                    {isCheckingName ? (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> İsim kontrol ediliyor...
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Hazır
                      </span>
                    )}
                  </div>

                  {/* Hedef Dosya Adı Girişi / Gösterimi */}
                  <div className="relative">
                    <input
                      type="text"
                      value={targetFileName}
                      onChange={(e) => setTargetFileName(e.target.value)}
                      placeholder="FIRMA_ADI.pdf"
                      className="w-full px-3 py-2 bg-black/50 rounded-lg text-xs font-mono font-black text-amber-300 border border-amber-500/70 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  {/* Türkçe Karakter Dönüştürme & Suffix Açıklaması */}
                  <div className="space-y-1 text-[11px] pt-1">
                    <div className="text-slate-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        Firma ünvanı baz alındı, Türkçe karakterler (<strong>İ, Ş, Ç, Ğ, Ü, Ö</strong>) İngilizceye dönüştürüldü.
                      </span>
                    </div>

                    {hasDuplicate && (
                      <div className="text-amber-300 font-bold flex items-center gap-1.5 bg-amber-950/50 p-1.5 rounded border border-amber-600/60">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          Hedef klasörde aynı isimde dosya bulunduğu için sonuna otomatik olarak{' '}
                          <strong className="underline text-white font-mono">{sequenceNumber}</strong> eklendi.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Hedef Bucket ve Dizin Seçimi */}
                  <div className="pt-2 border-t border-blue-900/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="flex items-center gap-1 font-bold">
                          <Database className="w-3.5 h-3.5 text-amber-400" />
                          <span>Hedef Bucket:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowRlsGuide(!showRlsGuide)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                        >
                          {showRlsGuide ? 'Rehberi Kapat' : 'RLS İzni / Rehber'}
                        </button>
                      </div>
                      <select
                        value={targetBucket}
                        onChange={(e) => {
                          const newB = e.target.value;
                          setTargetBucket(newB);
                          if (selectedFile) {
                            resolveFileName(selectedFile, targetFolder, newB);
                          }
                        }}
                        className="w-full bg-blue-950 text-slate-200 border border-blue-700/80 rounded-lg px-2 py-1 text-[11px] font-mono font-bold cursor-pointer focus:outline-none focus:border-amber-400"
                      >
                        <option value="CARIFATURALAR">CARIFATURALAR (Önerilen)</option>
                        <option value="DOSYALAR">DOSYALAR (Alternatif / Açık)</option>
                      </select>
                    </div>

                    <div>
                      <div className="text-slate-400 mb-1 font-bold flex items-center gap-1">
                        <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                        <span>Kayıt Klasörü:</span>
                      </div>
                      <select
                        value={targetFolder}
                        onChange={(e) => handleFolderChange(e.target.value)}
                        className="w-full bg-blue-950 text-slate-200 border border-blue-700/80 rounded-lg px-2 py-1 text-[11px] font-mono font-bold cursor-pointer focus:outline-none focus:border-amber-400"
                      >
                        <option value="">(Ana Kök Dizin)</option>
                        <option value="SANTIYELER/ARNAVUTKOY">SANTIYELER/ARNAVUTKOY</option>
                        <option value="SANTIYELER/BURSA">SANTIYELER/BURSA</option>
                        <option value="SANTIYELER/MAMAK">SANTIYELER/MAMAK</option>
                        <option value="SANTIYELER/MERKEZ">SANTIYELER/MERKEZ</option>
                        <option value="SANTIYELER/MSB">SANTIYELER/MSB</option>
                        <option value="SANTIYELER/DIGER">SANTIYELER/DIGER</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cari Bakiye Koruma Bilgisi (Kayıt tablosunda neyse öyle kalır) */}
          <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-800/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-900/50 text-blue-300">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block">
                  Cari Bakiye Sabit Kalır
                </span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Kayıt sonrasında mevcut cari bakiye (<strong>{formatCurrency(mevcutBakiye)}</strong>) değiştirilmez, kayıt tablosunda neyse öyle korunur.
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-300 bg-black/40 px-2 py-1 rounded border border-slate-700">
              {formatCurrency(mevcutBakiye)}
            </span>
          </div>

          {/* Tablo Açıklaması Korunur Bilgisi */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                Tablodaki mevcut kayıt açıklaması <strong>asla değiştirilmez</strong>, sadece cari ünvanla isimlendirilip fatura kaydedilir.
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono font-bold bg-black/40 px-2 py-1 rounded border border-slate-800">
              Açıklama Korunur
            </span>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-blue-900/60 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Vazgeç
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>KAYDEDİLİYOR...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>KAYDET</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

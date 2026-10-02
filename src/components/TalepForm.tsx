import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SiteConfig } from '../types';
import { formatCurrency, formatIBAN } from '../utils/formatters';
import { CariKontrolModal } from './CariKontrolModal';
import { IbanSorgulaModal } from './IbanSorgulaModal';
import { analyzeIBAN } from '../utils/iban';
import {
  resolveNextFaturaFileName,
  uploadFaturaFile,
  sanitizeFirmaFileName,
  FATURA_STORAGE_BUCKET,
  testBucketUpload,
} from '../lib/supabase';
import {
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Building,
  CreditCard,
  AlignLeft,
  Banknote,
  UserCheck,
  Activity,
  Building2,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  File as FileGenericIcon,
  Trash2,
  Loader2,
  Check,
  Sparkles,
  Info,
  Search,
  X,
} from 'lucide-react';

export interface TalepUploadedFileInfo {
  dosyaAdi: string;
  dosyaUrl: string;
  fullPath?: string;
}

interface TalepFormProps {
  activeSite: SiteConfig;
  onSubmit: (
    formData: {
      firma_unvani: string;
      iban_no: string;
      aciklama: string;
      odenecek_tutar: number;
      talep_eden: string;
      durumu: string;
    },
    fileInfo?: TalepUploadedFileInfo
  ) => Promise<boolean>;
  isSubmitting: boolean;
  onOpenMuavinPdf?: (site: SiteConfig, firma: string) => void;
  currentUser?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const TalepForm: React.FC<TalepFormProps> = ({
  activeSite,
  onSubmit,
  isSubmitting,
  onOpenMuavinPdf,
  currentUser = '',
}) => {
  const [firmaUnvani, setFirmaUnvani] = useState('');
  const [ibanNo, setIbanNo] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [odenecekTutar, setOdenecekTutar] = useState<string>('');
  const [talepEden, setTalepEden] = useState(currentUser || '');
  const [durumu, setDurumu] = useState('Beklemede');

  // Kullanıcı adı değiştikçe veya giriş yapıldığında talep edeni direkt ata
  useEffect(() => {
    if (currentUser) {
      setTalepEden(currentUser);
    }
  }, [currentUser]);

  // File upload state (PDF, JPG, PNG ve tüm uzantılar)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resolvedFileName, setResolvedFileName] = useState('');
  const [hasDuplicate, setHasDuplicate] = useState(false);
  const [sequenceNumber, setSequenceNumber] = useState<number | null>(null);
  const [isResolvingName, setIsResolvingName] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [bucketTestStatus, setBucketTestStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isTestingBucket, setIsTestingBucket] = useState(false);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cari Kontrol Modal State
  const [cariModalOpen, setCariModalOpen] = useState(false);

  // İBAN Sorgula Modal State & Canlı Analiz
  const [ibanModalOpen, setIbanModalOpen] = useState(false);
  const [transferredNotice, setTransferredNotice] = useState<{ firma: string; iban: string } | null>(null);
  const ibanAnalysis = useMemo(() => analyzeIBAN(ibanNo), [ibanNo]);

  // Dosya veya firma ünvanı değiştikçe CARIFATURALAR için hedef dosya adını otomatik belirle
  useEffect(() => {
    if (!selectedFile) {
      setResolvedFileName('');
      setHasDuplicate(false);
      setSequenceNumber(null);
      return;
    }

    let isMounted = true;
    const targetFirma = firmaUnvani.trim() || 'FATURA';

    // Anlık istemci taraflı temizleme (İ, Ş, Ç vb. İngilizceye çevir)
    const baseClean = sanitizeFirmaFileName(targetFirma);
    const lastDot = selectedFile.name.lastIndexOf('.');
    const ext = lastDot !== -1 ? selectedFile.name.substring(lastDot).toLowerCase() : '.pdf';
    const fallbackDirect = `${baseClean}${ext}`;
    setResolvedFileName(fallbackDirect);

    // Supabase Storage CARIFATURALAR bucket'ında aynı isimde dosya var mı kontrol et
    setIsResolvingName(true);
    const timer = setTimeout(async () => {
      try {
        const result = await resolveNextFaturaFileName(
          '',
          targetFirma,
          selectedFile.name,
          FATURA_STORAGE_BUCKET
        );
        if (isMounted) {
          setResolvedFileName(result.resolvedFileName);
          setHasDuplicate(result.hasDuplicate);
          setSequenceNumber(result.sequenceNumber);
        }
      } catch (err) {
        console.error('Dosya adı çözümleme hatası:', err);
      } finally {
        if (isMounted) setIsResolvingName(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedFile, firmaUnvani]);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    setFileError(null);
    setSelectedFile(file);

    // Resim dosyası ise önizleme oluştur
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setResolvedFileName('');
    setHasDuplicate(false);
    setSequenceNumber(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTestBucket = async () => {
    setIsTestingBucket(true);
    setBucketTestStatus(null);
    try {
      const res = await testBucketUpload(FATURA_STORAGE_BUCKET);
      if (res.ok) {
        setBucketTestStatus({
          ok: true,
          msg: 'CARIFATURALAR bucket bağlantısı ve yükleme izni sorunsuz çalışıyor.',
        });
      } else {
        setBucketTestStatus({
          ok: false,
          msg: res.error || 'Bucket bağlantısı başarısız.',
        });
      }
    } catch (e: any) {
      setBucketTestStatus({ ok: false, msg: e.message || 'Hata oluştu.' });
    } finally {
      setIsTestingBucket(false);
      setTimeout(() => setBucketTestStatus(null), 6000);
    }
  };

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all spaces and non-alphanumeric characters, keep continuous without spaces
    let val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!val.startsWith('TR') && val.length > 0 && !val.startsWith('T')) {
      val = 'TR' + val;
    }
    if (val.length > 40) {
      val = val.substring(0, 40);
    }
    setIbanNo(val);
    if (errors.ibanNo) {
      setErrors((prev) => ({ ...prev, ibanNo: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const missingFields: string[] = [];

    if (!firmaUnvani.trim()) {
      newErrors.firmaUnvani = 'Firma Ünvanı alanı zorunludur.';
      missingFields.push('Firma Ünvanı');
    }

    const cleanIban = ibanNo.replace(/\s+/g, '');
    if (!cleanIban) {
      newErrors.ibanNo = 'İBAN No alanı zorunludur.';
      missingFields.push('İBAN No');
    } else if (cleanIban.length < 10) {
      newErrors.ibanNo = 'Geçerli bir İBAN No giriniz.';
      missingFields.push('Geçerli İBAN No');
    }

    if (!aciklama.trim()) {
      newErrors.aciklama = 'Açıklama alanı zorunludur.';
      missingFields.push('Açıklama');
    }

    const numAmount = parseFloat(odenecekTutar.replace(/[^0-9.-]+/g, ''));
    if (!odenecekTutar.trim() || isNaN(numAmount) || numAmount <= 0) {
      newErrors.odenecekTutar = 'Geçerli bir Ödenecek Tutar giriniz.';
      missingFields.push('Ödenecek Tutar');
    }

    const effectiveTalepEden = talepEden.trim() || currentUser.trim();
    if (!effectiveTalepEden) {
      newErrors.talepEden = 'Talep Eden kullanıcı bilgisi bulunamadı.';
      missingFields.push('Talep Eden');
    }

    setErrors(newErrors);

    if (missingFields.length > 0) {
      setWarningMessage(
        `Zorunlu alanları doldurunuz: ${missingFields.join(', ')}`
      );
      setSuccessMessage(null);
      return false;
    }

    setWarningMessage(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    let uploadedFileInfo: TalepUploadedFileInfo | undefined = undefined;

    // Eğer kullanıcı dosya seçtiyse, butona basıldığında CARIFATURALAR bucket'ına yükle
    if (selectedFile) {
      setIsUploadingFile(true);
      setFileError(null);
      setUploadStatus('Hedef dosya adı kontrol ediliyor...');

      try {
        // En güncel benzersiz dosya adını al (Aynı isim varsa sonuna 1, 2, 3... eklenir)
        const nameResolution = await resolveNextFaturaFileName(
          '',
          firmaUnvani.trim(),
          selectedFile.name,
          FATURA_STORAGE_BUCKET
        );

        const finalFileName = nameResolution.resolvedFileName;
        setUploadStatus(`Dosya CARIFATURALAR bucket'ına yükleniyor: "${finalFileName}"...`);

        const uploadResult = await uploadFaturaFile(
          selectedFile,
          '',
          finalFileName,
          FATURA_STORAGE_BUCKET
        );

        if (!uploadResult.success) {
          throw new Error(
            uploadResult.error || 'Dosya CARIFATURALAR bucketına yüklenemedi.'
          );
        }

        uploadedFileInfo = {
          dosyaAdi: uploadResult.fileName,
          dosyaUrl: uploadResult.publicUrl,
          fullPath: uploadResult.fullPath,
        };
        setUploadStatus('Dosya başarıyla yüklendi! Talep kaydı oluşturuluyor...');
      } catch (err: any) {
        console.error('Dosya yükleme hatası:', err);
        setFileError(err?.message || 'Dosya yüklenirken bir hata oluştu.');
        setIsUploadingFile(false);
        setUploadStatus(null);
        return;
      }
    }

    const numAmount = parseFloat(odenecekTutar.replace(/[^0-9.-]+/g, ''));
    const finalTalepEden = talepEden.trim() || currentUser.trim();
    const success = await onSubmit(
      {
        firma_unvani: firmaUnvani.trim(),
        iban_no: ibanNo.replace(/\s+/g, '').toUpperCase(),
        aciklama: aciklama.trim(),
        odenecek_tutar: numAmount,
        talep_eden: finalTalepEden,
        durumu: durumu.trim() || 'Beklemede',
      },
      uploadedFileInfo
    );

    setIsUploadingFile(false);
    setUploadStatus(null);

    if (success) {
      // Formu ve seçili dosyayı temizle (talepEden giriş yapan kullanıcı olarak kalır)
      setFirmaUnvani('');
      setIbanNo('');
      setAciklama('');
      setOdenecekTutar('');
      setTalepEden(currentUser || '');
      setDurumu('Beklemede');
      handleClearFile();
      setErrors({});
      setWarningMessage(null);
      const fileInfoMsg = uploadedFileInfo
        ? ` ve dosya ("${uploadedFileInfo.dosyaAdi}") CARIFATURALAR bucket'ına`
        : '';
      setSuccessMessage(
        `Talep kaydı${fileInfoMsg} başarıyla oluşturuldu ve veritabanına kaydedildi.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };


  return (
    <div
      id="talep-form-container"
      className="bg-[#0e1d38] border border-blue-900/60 rounded-2xl p-6 shadow-xl relative overflow-hidden h-full flex flex-col justify-between"
    >
      {/* Form Header */}
      <div className="flex items-center justify-between border-b border-blue-900/50 pb-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-400" />
            {activeSite.name} — Yeni Talep Kayıt Formu
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Lütfen formu eksiksiz doldurunuz. Durumu hariç tüm alanlar zorunludur.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-950 border border-blue-800/60 text-blue-300">
          Tablo: {activeSite.tableName}
        </span>
      </div>

      {/* Warning Notice Banner if validation fails */}
      {warningMessage && (
        <div
          id="form-validation-warning"
          className="mb-5 p-4 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 flex items-start gap-3 text-sm animate-shake"
        >
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block text-amber-300">Eksik Veri Uyarısı:</strong>
            <span>{warningMessage}</span>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div
          id="form-success-banner"
          className="mb-5 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-center gap-3 text-sm"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* The Registration Form */}
      <form id="talep-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {transferredNotice && (
          <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between gap-2 animate-fadeIn shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Geçmiş ödemeler tablosundan aktarıldı: <strong className="text-white">{transferredNotice.firma}</strong> —{' '}
                <span className="font-mono text-emerald-300 font-bold">{formatIBAN(transferredNotice.iban)}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTransferredNotice(null)}
              className="p-1 rounded text-emerald-400 hover:text-white cursor-pointer"
              title="Kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* 1. FİRMA ÜNVANI */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="field-firma-unvani"
                className="block text-xs font-semibold text-slate-200"
              >
                FİRMA ÜNVANI <span className="text-red-400 font-bold">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="btn-form-firma-iban-sorgula"
                  onClick={() => setIbanModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer hover:shadow"
                  title="Firma İBAN'ını 5 Ödenenler Tablosundan Sorgula (Arnavutköy, Mamak, Şenbay, Merkez, MSB)"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Sorgula</span>
                </button>
                <button
                  type="button"
                  id="btn-form-cari-kontrol"
                  onClick={() => {
                    if (onOpenMuavinPdf) {
                      onOpenMuavinPdf(activeSite, firmaUnvani);
                    } else {
                      setCariModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer hover:shadow"
                  title="Cari Muavin Sayfasında Kontrol Et (PDF otomatik taranır ve firma sayfası açılır)"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Cari Kontrol Et</span>
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Building className="w-4 h-4" />
              </div>
              <input
                id="field-firma-unvani"
                type="text"
                value={firmaUnvani}
                onChange={(e) => {
                  setFirmaUnvani(e.target.value);
                  if (errors.firmaUnvani) setErrors((prev) => ({ ...prev, firmaUnvani: '' }));
                }}
                placeholder="Örn: Bayburt Öz-Ka İnş."
                className={`w-full pl-9 pr-3 py-2.5 bg-white rounded-xl text-sm text-slate-900 font-medium placeholder-slate-400 border transition-all focus:outline-none focus:ring-2 shadow-sm ${
                  errors.firmaUnvani
                    ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/25'
                }`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-0.5">
              <span>Muavin PDF'inde tam veya <strong>ilk 10 karakter</strong> ile otomatik bulunur.</span>
            </div>
            {errors.firmaUnvani && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.firmaUnvani}
              </p>
            )}
          </div>

          {/* 2. İBAN NO */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="field-iban-no"
                className="block text-xs font-semibold text-slate-200"
              >
                İBAN NO <span className="text-red-400 font-bold">*</span>
              </label>
              {ibanAnalysis.bankInfo && (
                <span
                  className="text-[11px] font-bold text-blue-300 truncate max-w-[170px]"
                  title={`${ibanAnalysis.bankInfo.name} (${ibanAnalysis.bankCode})`}
                >
                  {ibanAnalysis.bankInfo.shortName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <CreditCard className="w-4 h-4" />
                </div>
                <input
                  id="field-iban-no"
                  type="text"
                  value={ibanNo}
                  onChange={handleIbanChange}
                  placeholder="TR000000000000000000000000"
                  maxLength={40}
                  className={`w-full pl-9 pr-3 py-2.5 bg-white rounded-xl text-sm text-slate-900 font-mono font-semibold placeholder-slate-400 border transition-all focus:outline-none focus:ring-2 shadow-sm ${
                    errors.ibanNo
                      ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/25'
                  }`}
                />
              </div>
              <button
                type="button"
                id="btn-form-iban-sorgula"
                onClick={() => setIbanModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer hover:shadow shrink-0"
                title="İBAN No Sorgula (Banka tespiti, doğruluk ve sistemdeki geçmiş kayıtları gör)"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Sorgula</span>
              </button>
            </div>
            {errors.ibanNo && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.ibanNo}
              </p>
            )}
          </div>

          {/* 3. ÖDENECEK TUTAR */}
          <div>
            <label
              htmlFor="field-odenecek-tutar"
              className="block text-xs font-semibold text-slate-200 mb-1.5"
            >
              ÖDENECEK TUTAR (₺) <span className="text-red-400 font-bold">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600">
                <Banknote className="w-4 h-4" />
              </div>
              <input
                id="field-odenecek-tutar"
                type="number"
                step="any"
                min="0"
                value={odenecekTutar}
                onChange={(e) => {
                  setOdenecekTutar(e.target.value);
                  if (errors.odenecekTutar) setErrors((prev) => ({ ...prev, odenecekTutar: '' }));
                }}
                placeholder="0.00"
                className={`w-full pl-9 pr-3 py-2.5 bg-white rounded-xl text-sm text-slate-900 font-bold placeholder-slate-400 border transition-all focus:outline-none focus:ring-2 shadow-sm ${
                  errors.odenecekTutar
                    ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/25'
                }`}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              {errors.odenecekTutar ? (
                <p className="text-[11px] text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.odenecekTutar}
                </p>
              ) : (
                <span className="text-[11px] text-emerald-400/80 font-mono">
                  {odenecekTutar ? formatCurrency(odenecekTutar) : ''}
                </span>
              )}
            </div>
          </div>

          {/* 4. TALEP EDEN (Kullanıcı Adı Otomatik Yazılır - Enabled False / Disabled) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="field-talep-eden"
                className="block text-xs font-semibold text-slate-200"
              >
                TALEP EDEN <span className="text-red-400 font-bold">*</span>
              </label>
              <span className="text-[10px] text-sky-400 font-medium bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                Otomatik (Giriş Yapan Kullanıcı)
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-sky-500">
                <UserCheck className="w-4 h-4" />
              </div>
              <input
                id="field-talep-eden"
                type="text"
                value={talepEden || currentUser || ''}
                disabled={true}
                readOnly={true}
                tabIndex={-1}
                title="Talep eden kişi sisteme giriş yapan kullanıcı adı olarak otomatik atanır ve değiştirilemez."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-200/90 rounded-xl text-sm text-slate-900 font-bold placeholder-slate-500 border border-slate-300 cursor-not-allowed select-none opacity-95 shadow-inner"
              />
            </div>
            {errors.talepEden && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.talepEden}
              </p>
            )}
          </div>

          {/* 5. DURUMU (Opsiyonel / İsteğe Bağlı) */}
          <div>
            <label
              htmlFor="field-durumu"
              className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between"
            >
              <span>DURUMU</span>
              <span className="text-[10px] text-slate-400 font-normal">Otomatik (Korumalı)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Activity className="w-4 h-4 text-amber-500" />
              </div>
              <input
                id="field-durumu"
                type="text"
                value={durumu}
                disabled={true}
                readOnly={true}
                title="Yeni kayıtların durumu otomatik olarak Beklemede olarak kaydedilir."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-200/80 rounded-xl text-sm text-slate-700 font-bold border border-slate-300 cursor-not-allowed select-none opacity-90 shadow-inner"
              />
            </div>
          </div>

          {/* 6. AÇIKLAMA */}
          <div className="md:col-span-2 lg:col-span-3">
            <label
              htmlFor="field-aciklama"
              className="block text-xs font-semibold text-slate-200 mb-1.5"
            >
              AÇIKLAMA <span className="text-red-400 font-bold">*</span>
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 flex items-start pointer-events-none text-slate-500">
                <AlignLeft className="w-4 h-4" />
              </div>
              <textarea
                id="field-aciklama"
                rows={2}
                value={aciklama}
                onChange={(e) => {
                  setAciklama(e.target.value);
                  if (errors.aciklama) setErrors((prev) => ({ ...prev, aciklama: '' }));
                }}
                placeholder="Ödeme gerekçesi, malzeme cinsi, fatura veya hakediş detayları..."
                className={`w-full pl-9 pr-3 py-2.5 bg-white rounded-xl text-sm text-slate-900 font-medium placeholder-slate-400 border transition-all focus:outline-none focus:ring-2 resize-none shadow-sm ${
                  errors.aciklama
                    ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/25'
                }`}
              />
            </div>
            {errors.aciklama && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.aciklama}
              </p>
            )}
          </div>

          {/* 7. DOSYA / FATURA YÜKLEME (PDF, JPG, PNG VE TÜM UZANTILAR) - BELİRGİN ÖZEL RENK */}
          <div className="md:col-span-2 lg:col-span-3 pt-2">
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#2a1904] via-[#1f1303] to-[#140c02] border-2 border-amber-500/80 shadow-2xl shadow-amber-950/60 relative overflow-hidden">
              {/* Üst Vurgu Çizgisi */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500"></div>

              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md">
                    <UploadCloud className="w-4 h-4 text-slate-950" />
                    FATURA YÜKLE
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-amber-100">Fatura & Evrak Yükleme Alanı</h4>
                    <p className="text-[11px] text-amber-300/80">PDF, JPG, PNG, WEBP, DOCX vb. tüm uzantılar kabul edilir</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleTestBucket}
                    disabled={isTestingBucket}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-amber-500/40 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                    title="Supabase Storage yükleme izinlerini anlık test et"
                  >
                    {isTestingBucket ? (
                      <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    )}
                    <span>İzni Test Et</span>
                  </button>
                </div>
              </div>

              {/* Bilgilendirme Notu */}
              <div className="mb-3 p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-200/90 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Talep kaydı eklendiğinde seçilen fatura dosyası <strong>Firma Ünvanı</strong> ile adlandırılır (Türkçe karakterler İngilizceye çevrilir). Aynı isimde dosya varsa sonuna otomatik <strong>1, 2, 3...</strong> eklenerek <code className="text-yellow-300 font-bold font-mono">CARIFATURALAR</code> bucket'ına kaydedilir. Cari bakiye korunur.
                </p>
              </div>

              {/* Bucket Test Sonucu Bildirimi */}
              {bucketTestStatus && (
                <div
                  className={`mb-3 p-2.5 rounded-xl text-xs flex items-center gap-2 border animate-fade-in ${
                    bucketTestStatus.ok
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                      : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                  }`}
                >
                  {bucketTestStatus.ok ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{bucketTestStatus.msg}</span>
                </div>
              )}

              {/* Gizli Dosya Seçici */}
              <input
                ref={fileInputRef}
                type="file"
                accept="*/*"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                className="hidden"
              />

              {/* Dosya Seçim & Sürükle-Bırak Alanı - Belirgin Özel Renk ve Buton */}
              {!selectedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 group ${
                    isDragging
                      ? 'border-amber-300 bg-amber-900/50 ring-4 ring-amber-400/40 scale-[1.01]'
                      : 'border-amber-400/90 hover:border-yellow-300 bg-amber-950/30 hover:bg-amber-950/50'
                  }`}
                >
                  {/* Belirgin FATURA YÜKLE Butonu */}
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 group-hover:bg-amber-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-950/50 group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-5 h-5 text-slate-950" />
                    <span>FATURA YÜKLE</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-amber-100 group-hover:text-white">
                      Fatura dosyasını seçmek için tıklayın veya buraya sürükleyip bırakın
                    </p>
                    <p className="text-xs text-amber-300/80 mt-1">
                      PDF, JPG, PNG, WEBP, DOCX, XLSX, ZIP vb. <span className="text-yellow-300 font-bold">bütün uzantılar</span> kabul edilir
                    </p>
                  </div>
                </div>
              ) : (
              /* Dosya Seçildiğinde Gösterilen Kart & İsimlendirme Önizlemesi */
              <div className="rounded-xl border-2 border-amber-500/70 bg-[#160f03] p-4 shadow-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-900/60">
                  {/* Dosya Bilgisi & İkon */}
                  <div className="flex items-center gap-3 min-w-0">
                    {filePreview ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-500/60 bg-slate-950 shrink-0 shadow-sm">
                        <img
                          src={filePreview}
                          alt="Önizleme"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                      <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-600/70 flex items-center justify-center text-rose-300 shrink-0 shadow-sm">
                        <FileText className="w-6 h-6" />
                      </div>
                    ) : selectedFile.type.startsWith('image/') ? (
                      <div className="w-12 h-12 rounded-xl bg-blue-950/70 border border-blue-700/50 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-amber-950/70 border border-amber-700/50 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
                        <FileGenericIcon className="w-6 h-6" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-100 truncate" title={selectedFile.name}>
                          {selectedFile.name}
                        </p>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 shrink-0">
                          {formatFileSize(selectedFile.size)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Orijinal dosya adı
                      </p>
                    </div>
                  </div>

                  {/* Dosya Değiştir / Kaldır Butonları */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-200 text-xs font-semibold border border-blue-700/50 transition-colors cursor-pointer"
                    >
                      Farklı Dosya Seç
                    </button>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800/50 transition-colors cursor-pointer"
                      title="Seçili dosyayı kaldır"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Hedef Dosya Adı & İsimlendirme Kuralı Önizleme Kutusu */}
                <div className="p-3 rounded-xl bg-[#061022] border border-blue-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
                      <span>Supabase CARIFATURALAR Kayıt Dosya Adı:</span>
                      {isResolvingName && (
                        <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-amber-300 truncate tracking-wide bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                        {resolvedFileName || 'FİRMA ÜNVANI İLE ADLANDIRILACAK'}
                      </span>
                    </div>
                  </div>

                  {/* Benzersiz numara eklendi mi durumu */}
                  {hasDuplicate && sequenceNumber !== null && (
                    <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-900/40 border border-amber-600/50 text-amber-200 text-xs font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Aynı isimde dosya var, sonuna <strong>{sequenceNumber}</strong> eklendi
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dosya Hata Uyarısı */}
            {fileError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-rose-300">Dosya Yükleme Hatası:</strong>
                  <span>{fileError}</span>
                </div>
              </div>
            )}

            {/* Yükleme Süreci Bildirimi */}
            {isUploadingFile && uploadStatus && (
              <div className="mt-3 p-3 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs flex items-center gap-2.5 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                <span className="font-medium">{uploadStatus}</span>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Submit & Reset Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-blue-900/40">
          <button
            type="button"
            onClick={() => {
              setFirmaUnvani('');
              setIbanNo('');
              setAciklama('');
              setOdenecekTutar('');
              setTalepEden('');
              setDurumu('Beklemede');
              handleClearFile();
              setErrors({});
              setWarningMessage(null);
            }}
            disabled={isSubmitting || isUploadingFile}
            className="px-4 py-2.5 rounded-xl bg-[#081326] hover:bg-[#132547] text-slate-300 hover:text-white border border-blue-900/60 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            Temizle
          </button>

          <button
            id="btn-submit-talep"
            type="submit"
            disabled={isSubmitting || isUploadingFile}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-900/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploadingFile ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Dosya CARIFATURALAR'a Yükleniyor...</span>
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Talep Kaydını Ekle</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Cari Kontrol & Hesap Geçmişi Modal */}
      <CariKontrolModal
        isOpen={cariModalOpen}
        onClose={() => setCariModalOpen(false)}
        initialFirma={firmaUnvani}
        onSelectIban={(selectedIban) => {
          setIbanNo(selectedIban);
          if (errors.ibanNo) setErrors((prev) => ({ ...prev, ibanNo: '' }));
        }}
        onSelectFirma={(selectedFirma) => {
          setFirmaUnvani(selectedFirma);
          if (errors.firmaUnvani) setErrors((prev) => ({ ...prev, firmaUnvani: '' }));
        }}
      />

      {/* İBAN No Sorgulama & Doğrulama Modal */}
      <IbanSorgulaModal
        isOpen={ibanModalOpen}
        onClose={() => setIbanModalOpen(false)}
        initialIban={ibanNo}
        currentFirma={firmaUnvani}
        activeSite={activeSite}
        onSelectBoth={(selectedFirma, selectedIban) => {
          setFirmaUnvani(selectedFirma);
          setIbanNo(selectedIban);
          if (errors.firmaUnvani) setErrors((prev) => ({ ...prev, firmaUnvani: '' }));
          if (errors.ibanNo) setErrors((prev) => ({ ...prev, ibanNo: '' }));
          setTransferredNotice({ firma: selectedFirma, iban: selectedIban });
          setTimeout(() => setTransferredNotice(null), 6000);
        }}
        onSelectFirma={(selectedFirma) => {
          setFirmaUnvani(selectedFirma);
          if (errors.firmaUnvani) setErrors((prev) => ({ ...prev, firmaUnvani: '' }));
        }}
        onSelectIban={(selectedIban) => {
          setIbanNo(selectedIban);
          if (errors.ibanNo) setErrors((prev) => ({ ...prev, ibanNo: '' }));
        }}
      />
    </div>
  );
};

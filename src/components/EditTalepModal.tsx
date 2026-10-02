import React, { useState, useEffect, useMemo } from 'react';
import { SiteConfig, TalepRecord } from '../types';
import { formatCurrency, formatIBAN } from '../utils/formatters';
import { CariKontrolModal } from './CariKontrolModal';
import { IbanSorgulaModal } from './IbanSorgulaModal';
import { analyzeIBAN } from '../utils/iban';
import {
  X,
  Edit3,
  AlertCircle,
  Building,
  CreditCard,
  Banknote,
  UserCheck,
  AlignLeft,
  Activity,
  Save,
  Building2,
  Search,
} from 'lucide-react';

interface EditTalepModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TalepRecord | null;
  activeSite: SiteConfig;
  onSave: (id: string | number, updatedData: {
    firma_unvani: string;
    iban_no: string;
    aciklama: string;
    odenecek_tutar: number;
    talep_eden: string;
    durumu: string;
    cari_bakiye?: number | string | null;
  }) => Promise<boolean>;
  onOpenMuavinPdf?: (site: SiteConfig, firma: string) => void;
  currentUser?: string;
}

export const EditTalepModal: React.FC<EditTalepModalProps> = ({
  isOpen,
  onClose,
  record,
  activeSite,
  onSave,
  onOpenMuavinPdf,
  currentUser,
}) => {
  const [firmaUnvani, setFirmaUnvani] = useState('');
  const [ibanNo, setIbanNo] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [odenecekTutar, setOdenecekTutar] = useState<string>('');
  const [cariBakiye, setCariBakiye] = useState<string>('');
  const [talepEden, setTalepEden] = useState('');
  const [durumu, setDurumu] = useState('Beklemede');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cariModalOpen, setCariModalOpen] = useState(false);
  const [ibanModalOpen, setIbanModalOpen] = useState(false);

  // Giriş yapan aktif kullanıcı adını belirle
  const activeUser = useMemo(() => {
    return (
      currentUser ||
      sessionStorage.getItem('ozka_talep_auth_user') ||
      localStorage.getItem('ozka_talep_auth_user') ||
      ''
    ).trim();
  }, [currentUser]);

  const ibanAnalysis = useMemo(() => analyzeIBAN(ibanNo), [ibanNo]);

  useEffect(() => {
    if (record) {
      setFirmaUnvani(record.firma_unvani || record.firma_adi || record.firma || '');
      const rawIban = (record.iban_no || record.iban || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      setIbanNo(rawIban);
      setAciklama(record.aciklama || record.description || '');
      const rawTutar = record.odenecek_tutar ?? record.tutar ?? '';
      setOdenecekTutar(rawTutar !== '' ? String(rawTutar) : '');
      const rawCari = record.cari_bakiye ?? '';
      setCariBakiye(rawCari !== null && rawCari !== undefined ? String(rawCari) : '');
      // Talep eden kısmını direkt kullanıcı adından alsın
      const resolvedTalepEden = activeUser || record.talep_eden || record.requester || '';
      setTalepEden(resolvedTalepEden);
      setDurumu(record.durumu || record.durum || 'Beklemede');
      setErrors({});
      setWarningMessage(null);
    }
  }, [record, isOpen, activeUser]);

  if (!isOpen || !record) return null;

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all spaces and non-alphanumerics, keep continuous without spaces
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

    const effectiveTalepEden = activeUser || talepEden.trim() || record.talep_eden || record.requester || '';
    if (!effectiveTalepEden.trim()) {
      newErrors.talepEden = 'Talep Eden kişi/birim bilgisi zorunludur.';
      missingFields.push('Talep Eden');
    }

    setErrors(newErrors);

    if (missingFields.length > 0) {
      setWarningMessage(`Zorunlu alanları doldurunuz: ${missingFields.join(', ')}`);
      return false;
    }

    setWarningMessage(null);
    return true;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (record.id === undefined) {
      setWarningMessage('Kayıt ID bulunamadı.');
      return;
    }

    setIsSaving(true);
    const numAmount = parseFloat(odenecekTutar.replace(/[^0-9.-]+/g, ''));
    const parsedCariBakiye = cariBakiye.trim() !== '' ? cariBakiye.trim() : null;
    const finalTalepEden = activeUser || talepEden.trim() || record.talep_eden || record.requester || '';
    const success = await onSave(record.id, {
      firma_unvani: firmaUnvani.trim(),
      iban_no: ibanNo.replace(/\s+/g, '').toUpperCase(),
      aciklama: aciklama.trim(),
      odenecek_tutar: numAmount,
      talep_eden: finalTalepEden,
      durumu: durumu.trim() || 'Beklemede',
      cari_bakiye: parsedCariBakiye,
    });
    setIsSaving(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div
      id="edit-talep-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="edit-talep-modal"
        className="bg-[#0b1933] border border-blue-800/70 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-900/60 bg-[#071329]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Talep Kaydını Güncelle
              </h3>
              <p className="text-xs text-blue-400/80">
                {activeSite.name} — Tablo: {activeSite.tableName} (Kayıt #{record.id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-blue-900/50 transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {warningMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-amber-300">Uyarı:</strong>
                <span>{warningMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Firma Ünvanı */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    FİRMA ÜNVANI <span className="text-red-400 font-bold">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      id="btn-edit-firma-sorgula"
                      onClick={() => setIbanModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer hover:shadow"
                      title="Firma İBAN'ını 5 Ödenenler Tablosundan Sorgula (Arnavutköy, Mamak, Şenbay, Merkez, MSB)"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Sorgula</span>
                    </button>
                    <button
                      type="button"
                      id="btn-edit-cari-kontrol"
                      onClick={() => {
                        if (onOpenMuavinPdf) {
                          onOpenMuavinPdf(activeSite, firmaUnvani);
                        } else {
                          setCariModalOpen(true);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer hover:shadow"
                      title="Firmanın muavin PDF'ini incele, sayfayı otomatik bul ve görüntüle (Tam veya ilk 10 karakter ile)"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Cari Görüntüle</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={firmaUnvani}
                    onChange={(e) => {
                      setFirmaUnvani(e.target.value);
                      if (errors.firmaUnvani) setErrors((prev) => ({ ...prev, firmaUnvani: '' }));
                    }}
                    placeholder="Örn: Bayburt Öz-Ka İnş."
                    className={`w-full pl-9 pr-3 py-2.5 bg-[#081326] rounded-xl text-sm text-white placeholder-slate-500 border transition-all focus:outline-none focus:ring-2 ${
                      errors.firmaUnvani
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-blue-900/60 focus:border-blue-500 focus:ring-blue-500/40'
                    }`}
                  />
                </div>
                {errors.firmaUnvani && (
                  <p className="text-[11px] text-red-400 mt-1">{errors.firmaUnvani}</p>
                )}
              </div>

              {/* İBAN No */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    İBAN NO <span className="text-red-400 font-bold">*</span>
                  </label>
                  {ibanAnalysis.bankInfo && (
                    <span
                      className="text-[11px] font-bold text-blue-400 truncate max-w-[160px]"
                      title={`${ibanAnalysis.bankInfo.name} (${ibanAnalysis.bankCode})`}
                    >
                      {ibanAnalysis.bankInfo.shortName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={ibanNo}
                      onChange={handleIbanChange}
                      placeholder="TR000000000000000000000000"
                      maxLength={40}
                      className={`w-full pl-9 pr-3 py-2.5 bg-[#081326] rounded-xl text-sm text-white font-mono placeholder-slate-500 border transition-all focus:outline-none focus:ring-2 ${
                        errors.ibanNo
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-blue-900/60 focus:border-blue-500 focus:ring-blue-500/40'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    id="btn-edit-iban-sorgula"
                    onClick={() => setIbanModalOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
                    title="İBAN No Sorgula (Banka tespiti ve veritabanı kayıtları)"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Sorgula</span>
                  </button>
                </div>
                {errors.ibanNo && (
                  <p className="text-[11px] text-red-400 mt-1">{errors.ibanNo}</p>
                )}
              </div>

              {/* Ödenecek Tutar */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  ÖDENECEK TUTAR (₺) <span className="text-red-400 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Banknote className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={odenecekTutar}
                    onChange={(e) => {
                      setOdenecekTutar(e.target.value);
                      if (errors.odenecekTutar) setErrors((prev) => ({ ...prev, odenecekTutar: '' }));
                    }}
                    placeholder="0.00"
                    className={`w-full pl-9 pr-3 py-2.5 bg-[#081326] rounded-xl text-sm text-white placeholder-slate-500 border transition-all focus:outline-none focus:ring-2 font-semibold ${
                      errors.odenecekTutar
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-blue-900/60 focus:border-blue-500 focus:ring-blue-500/40'
                    }`}
                  />
                </div>
                <div className="flex justify-between items-center mt-1">
                  {errors.odenecekTutar ? (
                    <p className="text-[11px] text-red-400">{errors.odenecekTutar}</p>
                  ) : (
                    <span className="text-[11px] text-emerald-400 font-mono">
                      {odenecekTutar ? formatCurrency(odenecekTutar) : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Cari Bakiye */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  CARİ BAKİYE (₺)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Banknote className="w-4 h-4 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    value={cariBakiye}
                    onChange={(e) => setCariBakiye(e.target.value)}
                    placeholder="Örn: 44920 veya -15000"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#081326] rounded-xl text-sm text-white placeholder-slate-500 border border-blue-900/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition-all focus:outline-none font-semibold font-mono"
                  />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[11px] text-blue-300 font-mono">
                    {cariBakiye ? formatCurrency(cariBakiye) : 'Bakiye boş'}
                  </span>
                </div>
              </div>

              {/* Talep Eden (Enabled False / Disabled - Direkt Kullanıcı Adından Alınır) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="edit-field-talep-eden" className="block text-xs font-semibold text-slate-200">
                    TALEP EDEN <span className="text-red-400 font-bold">*</span>
                  </label>
                  <span className="text-[10px] text-sky-400 font-medium bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-sky-400" />
                    <span>Otomatik (Kullanıcı Adı)</span>
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-sky-500">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <input
                    id="edit-field-talep-eden"
                    type="text"
                    value={activeUser || talepEden || record.talep_eden || ''}
                    disabled={true}
                    readOnly={true}
                    tabIndex={-1}
                    title="Talep eden kişi sisteme giriş yapan kullanıcı adı olarak otomatik atanır ve değiştirilemez."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-200/90 rounded-xl text-sm text-slate-900 font-bold placeholder-slate-500 border border-slate-300 cursor-not-allowed select-none opacity-95 shadow-inner"
                  />
                </div>
                {errors.talepEden && (
                  <p className="text-[11px] text-red-400 mt-1">{errors.talepEden}</p>
                )}
              </div>

              {/* Durumu */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  DURUMU
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <select
                    value={durumu}
                    onChange={(e) => setDurumu(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#081326] rounded-xl text-sm text-white border border-blue-900/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition-all focus:outline-none cursor-pointer"
                  >
                    <option value="Beklemede" className="bg-[#0b1933] text-amber-300">Beklemede</option>
                    <option value="Onaylandı" className="bg-[#0b1933] text-blue-300">Onaylandı</option>
                    <option value="İşlemde" className="bg-[#0b1933] text-cyan-300">İşlemde</option>
                    <option value="Ödendi" className="bg-[#0b1933] text-emerald-300">Ödendi</option>
                    <option value="Reddedildi" className="bg-[#0b1933] text-rose-300">Reddedildi</option>
                  </select>
                </div>
              </div>

              {/* Açıklama */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  AÇIKLAMA <span className="text-red-400 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 flex items-start pointer-events-none text-slate-400">
                    <AlignLeft className="w-4 h-4" />
                  </div>
                  <textarea
                    rows={3}
                    value={aciklama}
                    onChange={(e) => {
                      setAciklama(e.target.value);
                      if (errors.aciklama) setErrors((prev) => ({ ...prev, aciklama: '' }));
                    }}
                    placeholder="Açıklama"
                    className={`w-full pl-9 pr-3 py-2.5 bg-[#081326] rounded-xl text-sm text-white placeholder-slate-500 border transition-all focus:outline-none focus:ring-2 resize-none ${
                      errors.aciklama
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-blue-900/60 focus:border-blue-500 focus:ring-blue-500/40'
                    }`}
                  />
                </div>
                {errors.aciklama && (
                  <p className="text-[11px] text-red-400 mt-1">{errors.aciklama}</p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-blue-900/50 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-[#081326] hover:bg-[#132547] text-slate-300 hover:text-white border border-blue-900/60 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/40 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Güncelleniyor...' : 'Veritabanında Güncelle'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Cari Kontrol Modal */}
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

import React from 'react';
import { TalepRecord } from '../types';
import { formatCurrency } from '../utils/formatters';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  record: TalepRecord | null;
  siteName: string;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  record,
  siteName,
  isDeleting,
}) => {
  if (!isOpen || !record) return null;

  const firma = record.firma_unvani || record.firma_adi || record.firma || 'Belirtilmemiş';
  const tutar = record.odenecek_tutar ?? record.tutar ?? 0;
  const talepEden = record.talep_eden || record.requester || 'Belirtilmemiş';

  return (
    <div
      id="delete-confirm-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="delete-confirm-modal"
        className="bg-[#0b1933] border border-rose-900/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-950/80 bg-[#160b17]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Silme Onayı
              </h3>
              <p className="text-xs text-rose-300/80 font-medium">
                {siteName} Sayfası
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-950/60 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-200 leading-relaxed">
            Aşağıdaki talep kaydını veritabanından kalıcı olarak <span className="font-bold text-rose-400">silmek istediğinize emin misiniz?</span>
          </p>

          {/* Record Details Card */}
          <div className="bg-[#071329] border border-blue-950 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-start gap-2">
              <span className="text-slate-400">Firma Ünvanı:</span>
              <span className="font-bold text-white text-right max-w-[220px] truncate">{firma}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-400">Ödenecek Tutar:</span>
              <span className="font-mono font-bold text-emerald-400">{formatCurrency(tutar)}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-400">Talep Eden:</span>
              <span className="text-slate-200 font-medium">{talepEden}</span>
            </div>
            {record.aciklama && (
              <div className="pt-2 border-t border-blue-900/40 text-slate-300">
                <span className="text-slate-400 block mb-0.5">Açıklama:</span>
                <p className="line-clamp-2 text-slate-300 italic">{record.aciklama}</p>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-[11px] text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Bu işlem geri alınamaz ve kayıt Supabase veritabanından silinir.</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-blue-900/50 bg-[#071226]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-[#081326] hover:bg-[#132547] text-slate-300 hover:text-white border border-blue-900/60 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            id="btn-confirm-delete"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-950/60 transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Siliniyor...' : 'Evet, Veritabanından Sil'}
          </button>
        </div>
      </div>
    </div>
  );
};

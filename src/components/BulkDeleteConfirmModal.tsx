import React from 'react';
import { TalepRecord } from '../types';
import { formatCurrency } from '../utils/formatters';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface BulkDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  selectedRecords: TalepRecord[];
  siteName: string;
  isDeleting: boolean;
}

export const BulkDeleteConfirmModal: React.FC<BulkDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedRecords,
  siteName,
  isDeleting,
}) => {
  if (!isOpen || selectedRecords.length === 0) return null;

  const totalAmount = selectedRecords.reduce((sum, r) => {
    const val = r.odenecek_tutar ?? r.tutar ?? 0;
    const num = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
    return sum + num;
  }, 0);

  return (
    <div
      id="bulk-delete-confirm-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="bulk-delete-confirm-modal"
        className="bg-[#0b1933] border border-rose-900/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-950/80 bg-[#160b17]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Çoklu Kayıt Silme Onayı
              </h3>
              <p className="text-xs text-rose-300/80 font-medium">
                {siteName} — Seçilen {selectedRecords.length} Kayıt
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
            Seçtiğiniz toplam <span className="font-bold text-rose-400 text-base">{selectedRecords.length} adet</span> talep kaydını veritabanından kalıcı olarak silmek istediğinize emin misiniz?
          </p>

          {/* Records Summary List */}
          <div className="bg-[#071329] border border-blue-950 rounded-xl p-3.5 space-y-2 text-xs max-h-48 overflow-y-auto divide-y divide-blue-900/40">
            {selectedRecords.map((r, i) => {
              const firma = r.firma_unvani || r.firma_adi || r.firma || 'Firma Yok';
              const tutar = r.odenecek_tutar ?? r.tutar ?? 0;
              return (
                <div key={r.id ?? i} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-white truncate block">{firma}</span>
                    <span className="text-[11px] text-slate-400">{r.talep_eden || r.requester || '-'}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 whitespace-nowrap">
                    {formatCurrency(tutar)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-3 py-2 bg-blue-950/40 rounded-lg border border-blue-900/50 text-xs">
            <span className="text-slate-300 font-medium">Silinecek Toplam Tutar:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-[11px] text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Bu işlem geri alınamaz ve tüm seçili kayıtlar Supabase veritabanından tamamen silinir.</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-blue-900/50 bg-[#071226]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-950 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Siliniyor ({selectedRecords.length})...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Seçilen {selectedRecords.length} Kaydı Sil</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

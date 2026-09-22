import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';

export const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, product }) => {
  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hapus Menu Produk" maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div>
          <h4 className="font-extrabold text-slate-800 text-base">
            Hapus "{product.nama || product.name}"?
          </h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Menu ini akan dihapus dari daftar menu kasir dan Local Storage. Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>

        <div className="w-full flex gap-2.5 pt-2">
          <Button variant="outline" fullWidth onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              onConfirm(product.id);
              onClose();
            }}
          >
            Ya, Hapus
          </Button>
        </div>
      </div>
    </Modal>
  );
};

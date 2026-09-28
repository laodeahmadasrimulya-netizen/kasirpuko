import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Share2,
  CheckCircle2,
  X,
  Smartphone,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { saveFileToDeviceStorage, shareOrOpenFile } from '../../utils/fileDownloader';

export const FileActionModal = ({
  isOpen,
  onClose,
  fileData, // { filename, blob, base64Data, mimeType, title, sizeLabel }
}) => {
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [isLoadingSave, setIsLoadingSave] = useState(false);
  const [isLoadingShare, setIsLoadingShare] = useState(false);

  if (!fileData) return null;

  const isExcel = fileData.filename?.endsWith('.xlsx') || fileData.filename?.endsWith('.xls');

  const handleSaveToDevice = async () => {
    setIsLoadingSave(true);
    setSaveStatus(null);
    try {
      const res = await saveFileToDeviceStorage(fileData);
      setSaveStatus({
        type: 'success',
        message: `File berhasil disimpan ke ${res.location || 'penyimpanan HP'}!`,
      });
    } catch (err) {
      console.error('Error saving file:', err);
      setSaveStatus({
        type: 'error',
        message: 'Gagal menyimpan file: ' + (err?.message || 'Silakan coba lagi.'),
      });
    } finally {
      setIsLoadingSave(false);
    }
  };

  const handleShareOrOpen = async () => {
    setIsLoadingShare(true);
    setSaveStatus(null);
    try {
      await shareOrOpenFile(fileData);
    } catch (err) {
      console.error('Error sharing file:', err);
      setSaveStatus({
        type: 'error',
        message: 'Gagal membuka menu bagikan: ' + (err?.message || 'Silakan coba lagi.'),
      });
    } finally {
      setIsLoadingShare(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dokumen Siap Diunduh"
      maxWidth="max-w-md"
    >
      <div className="space-y-4 pt-1">
        {/* File Preview Card */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              isExcel
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            {isExcel ? (
              <FileSpreadsheet className="w-6 h-6" />
            ) : (
              <FileText className="w-6 h-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-sm text-slate-800 truncate" title={fileData.filename}>
              {fileData.filename}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>{isExcel ? 'Dokumen Excel' : 'Dokumen PDF'}</span>
              {fileData.sizeLabel && (
                <>
                  <span>•</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-600">
                    {fileData.sizeLabel}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Feedback Message */}
        {saveStatus && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
              saveStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {saveStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            <span>{saveStatus.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* 1. Save to Device Button */}
          <button
            type="button"
            onClick={handleSaveToDevice}
            disabled={isLoadingSave || isLoadingShare}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-between transition-all shadow-md shadow-slate-900/10 cursor-pointer disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block leading-tight font-bold">Simpan ke Penyimpanan HP</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Unduh langsung ke folder Dokumen / Download
                </span>
              </div>
            </div>
            <HardDrive className="w-4 h-4 text-slate-400" />
          </button>

          {/* 2. Open / Share Button */}
          <button
            type="button"
            onClick={handleShareOrOpen}
            disabled={isLoadingSave || isLoadingShare}
            className="w-full py-3.5 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-between transition-all shadow-md shadow-puko-700/20 cursor-pointer disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-puko-700/80 text-white flex items-center justify-center">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block leading-tight font-bold">Buka & Bagikan File</span>
                <span className="text-[10px] text-puko-100 font-normal">
                  Buka di PDF Reader, WhatsApp, atau Cetak
                </span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-puko-200" />
          </button>
        </div>

        {/* Footer Dismiss Button */}
        <div className="pt-2">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 py-2.5"
          >
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
};

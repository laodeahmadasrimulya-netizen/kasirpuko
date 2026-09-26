import React, { useState, useRef } from 'react';
import {
  Printer,
  Download,
  CheckCircle2,
  FileText,
  Sliders,
  X,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { formatIDR } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { playPrintReceiptSound } from '../../utils/sound';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const ReceiptModal = ({ isOpen, onClose, transaction }) => {
  const { settings } = useSettings();
  const { user } = useAuth();
  const [paperSize, setPaperSize] = useState('58mm'); // '58mm' or '80mm'
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const receiptRef = useRef(null);

  if (!transaction) return null;

  // Print action
  const handlePrint = () => {
    playPrintReceiptSound();
    window.print();
  };

  // Save as PDF action using direct html2canvas + jsPDF with offscreen full clone
  // This guarantees 100% full content capture without clipping from modal scroll containers or viewport bounds
  const handleSavePdf = async () => {
    const originalEl = receiptRef.current;
    if (!originalEl) return;
    playPrintReceiptSound();
    setIsExportingPdf(true);

    let clone = null;
    try {
      const targetWidthMm = paperSize === '58mm' ? 58 : 80;
      const pixelWidth = paperSize === '58mm' ? 280 : 360;

      // 1. Create clean off-screen clone attached directly to document.body
      // This completely detaches it from Modal scroll/max-height constraints!
      clone = originalEl.cloneNode(true);
      clone.id = 'receipt-pdf-render-clone';

      // Apply clean styles for exact thermal dimensioning without clipping
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = `${pixelWidth}px`;
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      clone.style.borderRadius = '0';
      clone.style.margin = '0';
      clone.style.backgroundColor = '#ffffff';
      clone.style.zIndex = '-9999';

      document.body.appendChild(clone);

      // 2. Ensure all images inside clone (e.g. /logo.png) are fully loaded
      const images = clone.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
        )
      );

      // Brief pause to ensure fonts and layout geometry are rendered
      await new Promise((resolve) => setTimeout(resolve, 80));

      const fullHeight = clone.scrollHeight || clone.offsetHeight;

      // 3. Render the full clone with html2canvas
      const canvas = await html2canvas(clone, {
        scale: 3, // High DPI for crystal-sharp text & logo
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: pixelWidth,
        height: fullHeight,
        windowWidth: 1200,
        windowHeight: fullHeight + 500,
        scrollX: 0,
        scrollY: 0,
      });

      // 4. Calculate exact proportional height in mm (single continuous thermal roll)
      const targetHeightMm = Math.round((canvas.height / canvas.width) * targetWidthMm);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [targetWidthMm, targetHeightMm],
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, targetWidthMm, targetHeightMm, undefined, 'FAST');
      pdf.save(`Struk-${transaction.id}.pdf`);
    } catch (err) {
      console.error('Failed to generate receipt PDF:', err);
      window.print();
    } finally {
      if (clone && clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
      setIsExportingPdf(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Struk Pembayaran Thermal"
      maxWidth="max-w-md"
    >
      <div className="flex flex-col items-center">
        {/* Paper Size Switcher Tabs */}
        <div className="w-full flex items-center justify-between bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold">
          <span className="text-[11px] text-slate-500 pl-2 uppercase tracking-wider flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" /> Ukuran Kertas:
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPaperSize('58mm')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                paperSize === '58mm'
                  ? 'bg-puko-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Thermal 58mm
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('80mm')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                paperSize === '80mm'
                  ? 'bg-puko-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Thermal 80mm
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="w-full flex justify-center overflow-x-auto py-1">
          <div
            id="receipt-print-area"
            ref={receiptRef}
            className={`
              ${
                paperSize === '58mm'
                  ? 'w-[260px] text-[11px] thermal-58mm'
                  : 'w-[340px] text-xs thermal-80mm'
              }
              bg-white p-5 rounded-2xl border border-dashed border-slate-300 font-mono text-slate-900 space-y-3 shadow-md select-none transition-all duration-200
            `}
          >
            {/* Header Struk */}
            <div className="text-center pb-2">
              <div
                className="receipt-logo mx-auto mb-2 flex items-center justify-center transition-all"
                style={{
                  width: paperSize === '58mm' ? '88px' : '110px',
                  height: paperSize === '58mm' ? '88px' : '110px',
                }}
              >
                <img
                  src="/logo.png"
                  alt="PUKO Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <h2 className="text-xl font-black tracking-widest text-slate-950 font-sans uppercase">
                {settings?.storeName || 'PUKO'}
              </h2>
              <p className="text-[11px] font-bold text-slate-700 font-sans tracking-tight mt-0.5">
                {settings?.tagline || 'Alpukat Kocok No Serat No Pahit'}
              </p>
              {settings?.branch && (
                <p className="text-[10px] text-slate-500 mt-1">
                  {settings.branch}
                </p>
              )}
              {settings?.address && (
                <p className="text-[10px] text-slate-500 leading-tight">
                  {settings.address}
                </p>
              )}
              {settings?.phone && (
                <p className="text-[10px] text-slate-500">
                  {settings.phone}
                </p>
              )}
            </div>

            {/* Separator Dashed Line */}
            <div className="border-t border-dashed border-slate-400 my-1" />

            {/* Meta Info: Tanggal & Nomor Transaksi */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal:</span>
                <span className="font-semibold">{formatDate(transaction.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">No. Transaksi:</span>
                <span className="font-bold text-slate-900">{transaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kasir:</span>
                <span className="font-semibold text-slate-800">
                  {transaction.cashierName
                    ? (transaction.cashierName === 'Owner / Supervisor' ? 'Owner' : transaction.cashierName)
                    : (user?.role === 'ADMIN' ? 'Owner' : (user?.name || settings?.cashierName || 'Kasir 01'))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pelanggan:</span>
                <span>
                  {transaction.customerName?.trim() &&
                  transaction.customerName.trim() !== 'Pelanggan Umum' &&
                  transaction.customerName.trim() !== 'Pelanggan Walk-in' &&
                  transaction.customerName.trim() !== 'Umum' &&
                  transaction.customerName.trim() !== '-'
                    ? transaction.customerName.trim()
                    : ''}
                </span>
              </div>
            </div>

            {/* Separator Dashed Line */}
            <div className="border-t border-dashed border-slate-400 my-1" />

            {/* Daftar Produk, Jumlah & Harga */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                <span>Menu / Qty</span>
                <span>Harga</span>
              </div>

              {transaction.items?.map((item, idx) => {
                const itemName = item.nama || item.name;
                const itemPrice = item.harga || item.price;
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-slate-900 leading-snug">
                      {itemName}
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>
                        {item.qty} x {formatIDR(itemPrice)}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatIDR(item.subtotal)}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-[10px] text-slate-500 italic pl-1">
                        * {item.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Separator Dashed Line */}
            <div className="border-t border-dashed border-slate-400 my-1" />

            {/* Perhitungan Total, Bayar, Kembalian */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatIDR(transaction.subtotal)}</span>
              </div>

              {transaction.discount > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Diskon:</span>
                  <span>-{formatIDR(transaction.discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-slate-950 pt-1 border-t border-dotted border-slate-300">
                <span>TOTAL:</span>
                <span>{formatIDR(transaction.total)}</span>
              </div>

              <div className="flex justify-between pt-1 text-slate-700">
                <span>Metode Bayar:</span>
                <span className="font-bold">{transaction.paymentMethod}</span>
              </div>

              <div className="flex justify-between text-slate-700">
                <span>Bayar:</span>
                <span className="font-semibold">{formatIDR(transaction.amountPaid)}</span>
              </div>

              <div className="flex justify-between font-bold text-slate-950 pt-0.5">
                <span>Kembalian:</span>
                <span>{formatIDR(transaction.change)}</span>
              </div>
            </div>

            {/* Separator Dashed Line */}
            <div className="border-t border-dashed border-slate-400 my-1" />

            {/* Footer Struk */}
            <div className="text-center text-[10px] text-slate-500 pt-1 leading-relaxed whitespace-pre-line font-sans">
              {settings?.receiptFooter ? (
                <p className="font-medium text-slate-600">{settings.receiptFooter}</p>
              ) : (
                <>
                  <p className="font-bold text-slate-700">Terima kasih telah berbelanja di PUKO!</p>
                  <p className="mt-1 font-medium">
                    Dikocok dulu, Baru diminum "Spesialis Alpukat Kocok Tanpa Serat dan Rasa Pahit yang Menggangu"
                  </p>
                  <p className="mt-1">Follow kami di IG @Puko.id</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Cetak & Simpan PDF */}
        <div className="w-full grid grid-cols-2 gap-2.5 mt-5">
          <Button
            variant="outline"
            size="md"
            onClick={handleSavePdf}
            disabled={isExportingPdf}
            icon={Download}
            className="font-bold border-slate-300"
          >
            {isExportingPdf ? 'Menyimpan...' : 'Simpan PDF'}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handlePrint}
            icon={Printer}
            className="font-bold bg-puko-600 hover:bg-puko-700 shadow-md shadow-puko-700/20"
          >
            Cetak Struk
          </Button>
        </div>

        <div className="w-full mt-2">
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            Tutup Dialog
          </Button>
        </div>
      </div>
    </Modal>
  );
};

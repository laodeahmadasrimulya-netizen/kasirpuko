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

  // Print action using dedicated clean iframe (eliminates blank pages & modal clipping)
  const handlePrint = () => {
    playPrintReceiptSound();
    const printEl = receiptRef.current;
    if (!printEl) {
      window.print();
      return;
    }

    try {
      const oldIframe = document.getElementById('receipt-print-iframe');
      if (oldIframe) oldIframe.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'receipt-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const is58 = paperSize === '58mm';
      const widthMm = is58 ? '58mm' : '80mm';
      const doc = iframe.contentWindow.document;

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Struk - ${transaction.id}</title>
            <style>
              @page {
                size: ${widthMm} auto;
                margin: 0;
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              body {
                width: ${widthMm};
                margin: 0 auto;
                padding: ${is58 ? '3mm 2mm' : '4mm 3mm'};
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                font-size: ${is58 ? '10.5px' : '12px'};
                line-height: 1.35;
                color: #000;
                background: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              img {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 0 auto;
              }
              .border-dashed {
                border-top: 1px dashed #444 !important;
                margin: 6px 0 !important;
              }
              .border-dotted {
                border-top: 1px dotted #666 !important;
                margin: 4px 0 !important;
              }
              .flex {
                display: flex !important;
                justify-content: space-between !important;
              }
              .text-center { text-align: center !important; }
              .text-right { text-align: right !important; }
              .font-bold { font-weight: bold !important; }
              .font-black { font-weight: 900 !important; }
              .font-semibold { font-weight: 600 !important; }
              .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; }
              .font-mono { font-family: monospace !important; }
              .uppercase { text-transform: uppercase !important; }
              .space-y-0\\.5 > * + * { margin-top: 2px !important; }
              .space-y-1 > * + * { margin-top: 3px !important; }
              .space-y-1\\.5 > * + * { margin-top: 4px !important; }
              .space-y-2 > * + * { margin-top: 5px !important; }
              .space-y-2\\.5 > * + * { margin-top: 6px !important; }
              .space-y-3 > * + * { margin-top: 8px !important; }
              .text-slate-500, .text-slate-600, .text-slate-700 { color: #333 !important; }
              .text-slate-900, .text-slate-950 { color: #000 !important; }
              .text-rose-600 { color: #000 !important; }
              .shadow-md { box-shadow: none !important; }
              .rounded-2xl { border-radius: 0 !important; }
              .border { border: none !important; }
            </style>
          </head>
          <body>
            ${printEl.innerHTML}
          </body>
        </html>
      `);
      doc.close();

      const images = iframe.contentWindow.document.images;
      const waitForImages = Array.from(images).map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      );

      Promise.all(waitForImages).then(() => {
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          }, 2000);
        }, 150);
      });
    } catch (e) {
      console.warn('Iframe print error, falling back to window.print():', e);
      window.print();
    }
  };

  // Helper to generate canvas from receipt element directly
  const captureReceiptCanvas = async () => {
    const el = receiptRef.current;
    if (!el) return null;

    return await html2canvas(el, {
      scale: 3, // 3x pixel ratio for sharp text and thermal clarity
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc, clonedEl) => {
        clonedEl.style.boxShadow = 'none';
        clonedEl.style.borderRadius = '0';
        clonedEl.style.border = 'none';
        clonedEl.style.margin = '0';
      },
    });
  };

  // Save as PDF action
  const handleSavePdf = async () => {
    if (!receiptRef.current) return;
    playPrintReceiptSound();
    setIsExportingPdf(true);

    try {
      const targetWidthMm = paperSize === '58mm' ? 58 : 80;
      const canvas = await captureReceiptCanvas();
      if (!canvas) throw new Error('Canvas capture returned null');

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
      // Fallback: download as JPG image
      handleSaveImage();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Save as Image (JPG) action for easy customer sharing via WhatsApp
  const handleSaveImage = async () => {
    if (!receiptRef.current) return;
    playPrintReceiptSound();
    setIsExportingPdf(true);

    try {
      const canvas = await captureReceiptCanvas();
      if (!canvas) throw new Error('Canvas capture returned null');

      const link = document.createElement('a');
      link.download = `Struk-${transaction.id}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 1000);
    } catch (err) {
      console.error('Failed to save receipt image:', err);
      alert('Gagal mengunduh struk. Mengalihkan ke opsi cetak struk...');
      handlePrint();
    } finally {
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

        {/* Action Buttons: Cetak, Simpan PDF & Simpan Gambar */}
        <div className="w-full space-y-2 mt-5">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={handleSavePdf}
              disabled={isExportingPdf}
              icon={Download}
              className="font-bold border-slate-300 text-xs sm:text-sm"
            >
              {isExportingPdf ? 'Mengunduh...' : 'Simpan PDF'}
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={handleSaveImage}
              disabled={isExportingPdf}
              icon={Download}
              className="font-bold border-slate-300 text-xs sm:text-sm"
            >
              Simpan Gambar (JPG)
            </Button>
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handlePrint}
            icon={Printer}
            className="font-bold bg-puko-600 hover:bg-puko-700 shadow-md shadow-puko-700/20 py-2.5"
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

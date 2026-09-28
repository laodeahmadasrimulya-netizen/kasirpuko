import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Konversi Blob atau File ke string base64 murni (tanpa prefix data:...;base64,)
 */
export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const parts = reader.result.split(',');
        resolve(parts[1] || parts[0]);
      } else {
        reject(new Error('Gagal membaca data blob sebagai base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Helper Universal untuk Download & Berbagi File di Semua Perangkat:
 * 1. HP via Aplikasi Native Android (Capacitor): Menyimpan file dan membuka dialog sistem "Simpan ke HP / Bagikan ke WhatsApp"
 * 2. HP via Browser Mobile (Chrome / Safari): Menggunakan Web Share API agar file langsung bisa disimpan ke perangkat atau dikirim ke WhatsApp
 * 3. Laptop / Komputer Desktop: Mengunduh langsung ke folder Downloads melalui Blob URL
 *
 * @param {Object} params
 * @param {string} params.filename - Nama file lengkap beserta ekstensi (misal: Laporan.xlsx atau Struk.pdf)
 * @param {Blob} params.blob - Data file dalam bentuk Blob
 * @param {string} [params.base64Data] - String base64 opsional jika sudah tersedia
 * @param {string} params.mimeType - Tipe MIME file (misal: 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
 * @param {string} [params.title] - Judul saat berbagi
 */
export const downloadOrShareFile = async ({
  filename,
  blob,
  base64Data = null,
  mimeType = 'application/octet-stream',
  title = 'Unduh Dokumen PUKO',
}) => {
  const isNative = Capacitor.isNativePlatform();
  const isMobile =
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '') ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2));

  // 1. Deteksi Platform Native Android / iOS (Capacitor APK)
  if (isNative) {
    try {
      let rawBase64 = base64Data;
      if (!rawBase64 && blob) {
        rawBase64 = await blobToBase64(blob);
      }
      if (!rawBase64) throw new Error('Data file kosong');

      // Pastikan string base64 murni tanpa prefix data URL
      const cleanBase64 = rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64;

      // Tulis file ke Cache Directory agar dapat diakses oleh FileProvider
      const saved = await Filesystem.writeFile({
        path: filename,
        data: cleanBase64,
        directory: Directory.Cache,
        recursive: true,
      });

      // Dapatkan file URI lokal
      const uriResult = await Filesystem.getUri({
        directory: Directory.Cache,
        path: filename,
      });
      const fileUri = uriResult?.uri || saved?.uri;

      // Buka native share dialog Android dengan array `files` (BUKAN `url`)
      // Ini akan membuka dialog Android lengkap: WhatsApp, Cetak / Bluetooth Print, Simpan ke Drive / File, dll.
      await Share.share({
        title: title || filename,
        text: `${title || 'Dokumen'} (${filename})`,
        files: [fileUri],
        dialogTitle: `Simpan atau Cetak ${filename}`,
      });

      return { success: true, method: 'capacitor-native', uri: fileUri };
    } catch (nativeErr) {
      console.warn('[downloadOrShareFile] Native share error, mencoba fallback browser:', nativeErr);
    }
  }

  // 2. Deteksi Perangkat HP (Mobile Browser Chrome / Safari / Edge Android)
  if (isMobile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (blob) {
        const file = new File([blob], filename, { type: mimeType });
        const canShareFiles = typeof navigator.canShare === 'function' ? navigator.canShare({ files: [file] }) : true;
        if (canShareFiles) {
          await navigator.share({
            files: [file],
            title: title || filename,
            text: `${title || 'Dokumen'} (${filename})`,
          });
          return { success: true, method: 'web-share-files' };
        }
      }
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') {
        return { success: true, method: 'web-share-cancelled' };
      }
      console.warn('[downloadOrShareFile] Web Share API error, mencoba anchor download:', shareErr);
    }
  }

  // 3. Desktop Browser atau Fallback Anchor Download
  try {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(url);
      }, 5000);

      return { success: true, method: 'browser-anchor' };
    }
  } catch (downloadErr) {
    console.warn('[downloadOrShareFile] Anchor download error:', downloadErr);
  }

  // 4. Fallback Data URI untuk Base64
  if (base64Data) {
    try {
      const clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const dataUri = `data:${mimeType};base64,${clean}`;
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 3000);
      return { success: true, method: 'data-uri-anchor' };
    } catch (dataErr) {
      console.error('[downloadOrShareFile] Data URI fallback error:', dataErr);
      throw dataErr;
    }
  }

  throw new Error('Gagal mengunduh atau membagikan file di perangkat ini.');
};

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
  // 1. Deteksi Platform Native Android / iOS (Capacitor APK)
  if (Capacitor.isNativePlatform()) {
    try {
      const dataToSave = base64Data || (blob ? await blobToBase64(blob) : null);
      if (!dataToSave) throw new Error('Data file kosong');

      const saved = await Filesystem.writeFile({
        path: filename,
        data: dataToSave,
        directory: Directory.Cache,
      });

      await Share.share({
        title: title || filename,
        text: `Dokumen ${filename} dari PUKO POS`,
        url: saved.uri,
        dialogTitle: `Simpan atau Kirim ${filename}`,
      });

      return { success: true, method: 'capacitor-native' };
    } catch (nativeErr) {
      console.warn('[downloadOrShareFile] Native share/write error, trying browser fallback:', nativeErr);
    }
  }

  // 2. Deteksi Perangkat HP (Mobile Browser Chrome / Safari / Edge Android)
  const isMobile =
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '') ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2));

  if (isMobile && typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && blob) {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title || filename,
        });
        return { success: true, method: 'web-share' };
      }
    } catch (shareErr) {
      // Jika pengguna menutup dialog share secara sengaja (AbortError), jangan lempar error
      if (shareErr.name === 'AbortError') {
        return { success: true, method: 'web-share-cancelled' };
      }
      console.warn('[downloadOrShareFile] Web Share API error, trying anchor download:', shareErr);
    }
  }

  // 3. Desktop Browser atau Fallback Anchor Download
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) link.parentNode.removeChild(link);
      URL.revokeObjectURL(url);
    }, 2000);

    return { success: true, method: 'browser-anchor' };
  } catch (downloadErr) {
    console.error('[downloadOrShareFile] Anchor download error:', downloadErr);
    throw downloadErr;
  }
};

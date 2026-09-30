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
 * Konversi base64 string menjadi Blob binary
 */
export const base64ToBlob = (base64, mimeType = 'application/octet-stream') => {
  const clean = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(clean);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

/**
 * Helper Universal untuk Download & Simpan File di SEMUA Perangkat (HP & Laptop):
 * 1. HP via Aplikasi Native Android / iOS (Capacitor APK):
 *    - Menyimpan file ke Directory.Documents (Folder Dokumen HP) agar file tersimpan permanen
 *    - Membuka dialog sistem Android (Buka di Excel/PDF Reader, bagikan ke WhatsApp, cetak, dll)
 * 2. HP via Mobile Browser (Chrome Android, Safari iOS, Samsung Internet, dsb) & Desktop:
 *    - Melakukan unduhan langsung menggunakan standard HTML5 download
 *    - TANPA target="_blank" agar TIDAK diblokir oleh popup blocker di HP
 *    - Blob URL dijaga aktif selama 60 detik agar download manager HP selesai mengunduh
 */
export const downloadOrShareFile = async ({
  filename,
  blob,
  base64Data = null,
  mimeType = 'application/octet-stream',
  title = 'Unduh Dokumen PUKO',
}) => {
  const isNative = Capacitor.isNativePlatform();

  // Pastikan kita memiliki objek Blob dan Base64 yang valid
  let activeBlob = blob;
  let rawBase64 = base64Data;

  if (!activeBlob && rawBase64) {
    try {
      activeBlob = base64ToBlob(rawBase64, mimeType);
    } catch (e) {
      console.warn('[downloadOrShareFile] Gagal konversi base64 ke blob:', e);
    }
  }

  if (!rawBase64 && activeBlob) {
    try {
      rawBase64 = await blobToBase64(activeBlob);
    } catch (e) {
      console.warn('[downloadOrShareFile] Gagal konversi blob ke base64:', e);
    }
  }

  // =========================================================================
  // 1. APLIKASI NATIVE ANDROID / IOS (CAPACITOR APK)
  // =========================================================================
  if (isNative) {
    try {
      const cleanBase64 = rawBase64 ? (rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64) : null;
      if (!cleanBase64) throw new Error('Data file kosong');

      // 1. Simpan permanen ke Directory.Documents (Folder Dokumen HP agar tersimpan di HP)
      let docUri = null;
      try {
        const savedDoc = await Filesystem.writeFile({
          path: filename,
          data: cleanBase64,
          directory: Directory.Documents,
          recursive: true,
        });
        docUri = savedDoc?.uri;
      } catch (docErr) {
        console.warn('Gagal menyimpan ke Directory.Documents, mencoba Cache:', docErr);
      }

      // 2. Simpan juga ke Directory.Cache agar dapat diakses oleh FileProvider untuk Share dialog
      const cacheSaved = await Filesystem.writeFile({
        path: filename,
        data: cleanBase64,
        directory: Directory.Cache,
        recursive: true,
      });

      const uriResult = await Filesystem.getUri({
        directory: Directory.Cache,
        path: filename,
      });
      const fileUri = uriResult?.uri || cacheSaved?.uri || docUri;

      // 3. Tampilkan dialog sistem HP (Buka di Excel/PDF reader, Simpan ke Drive, Bagikan ke WhatsApp)
      try {
        await Share.share({
          title: title || filename,
          text: `${title || 'Dokumen'} (${filename})`,
          files: [fileUri],
          dialogTitle: `Unduh / Buka ${filename}`,
        });
      } catch (shareErr) {
        console.warn('Share dialog dilewati atau dibatalkan:', shareErr);
      }

      return { success: true, method: 'capacitor-native', uri: fileUri, filename };
    } catch (nativeErr) {
      console.error('[downloadOrShareFile] Native save error, beralih ke fallback browser:', nativeErr);
    }
  }

  // =========================================================================
  // 2. BROWSER HP (CHROME ANDROID, SAFARI IOS) & DESKTOP BROWSER
  // =========================================================================
  if (activeBlob) {
    try {
      const url = URL.createObjectURL(activeBlob);

      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = filename;
      link.setAttribute('download', filename);

      // PENTING SEKALI: JANGAN gunakan target="_blank"!
      // Di Chrome Android & Safari HP, target="_blank" memicu popup blocker browser
      // sehingga proses unduhan diam-diam diblokir dan tidak pernah berjalan.

      document.body.appendChild(link);

      // Trigger klik menggunakan MouseEvent universal
      try {
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        link.dispatchEvent(clickEvent);
      } catch (clickErr) {
        link.click();
      }

      // Jaga Blob URL tetap aktif selama minimal 60 detik agar download manager HP selesai mengunduh
      setTimeout(() => {
        try {
          if (link.parentNode) link.parentNode.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (_) {}
      }, 60000);

      return { success: true, method: 'browser-download', filename };
    } catch (downloadErr) {
      console.warn('[downloadOrShareFile] Anchor download error:', downloadErr);
    }
  }

  // =========================================================================
  // 3. FALLBACK DATA URI KHUSUS BASE64
  // =========================================================================
  if (rawBase64) {
    try {
      const clean = rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64;
      const dataUri = `data:${mimeType};base64,${clean}`;
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = dataUri;
      link.download = filename;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          if (link.parentNode) link.parentNode.removeChild(link);
        } catch (_) {}
      }, 5000);
      return { success: true, method: 'data-uri-anchor', filename };
    } catch (dataErr) {
      console.error('[downloadOrShareFile] Data URI fallback error:', dataErr);
      throw dataErr;
    }
  }

  throw new Error('Gagal mengunduh file pada perangkat ini. Silakan periksa pengaturan izin unduh browser.');
};

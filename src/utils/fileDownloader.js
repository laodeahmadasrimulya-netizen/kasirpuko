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
 * Deteksi apakah perangkat saat ini adalah mobile/HP (baik native APK maupun mobile browser)
 */
export const isMobileDevice = () => {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof navigator === 'undefined') return false;
  return (
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '') ||
    (Boolean(navigator.maxTouchPoints) && navigator.maxTouchPoints > 2)
  );
};

/**
 * 1. Simpan File Langsung ke Penyimpanan Perangkat (Android Storage / PC Downloads)
 * Di Android APK: Disimpan ke folder Documents atau External storage perangkat
 * Di Browser (HP / Laptop): Diunduh langsung oleh Download Manager browser ke folder Downloads
 */
export const saveFileToDeviceStorage = async ({
  filename,
  blob,
  base64Data = null,
  mimeType = 'application/octet-stream',
}) => {
  const isNative = Capacitor.isNativePlatform();

  // A. Platform Native Android (Capacitor APK)
  if (isNative) {
    try {
      let rawBase64 = base64Data;
      if (!rawBase64 && blob) {
        rawBase64 = await blobToBase64(blob);
      }
      if (!rawBase64) throw new Error('Data file kosong');

      const cleanBase64 = rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64;

      // 1. Simpan salinan ke Cache agar dapat diakses FileProvider sewaktu-waktu
      try {
        await Filesystem.writeFile({
          path: filename,
          data: cleanBase64,
          directory: Directory.Cache,
          recursive: true,
        });
      } catch (cacheErr) {
        console.warn('[saveFileToDeviceStorage] Gagal menulis ke Cache:', cacheErr);
      }

      // 2. Simpan file utama ke Dokumen Android
      let savedUri = null;
      let targetFolder = 'Dokumen HP (Internal)';

      try {
        const docResult = await Filesystem.writeFile({
          path: filename,
          data: cleanBase64,
          directory: Directory.Documents,
          recursive: true,
        });
        savedUri = docResult?.uri;
      } catch (docErr) {
        console.warn('[saveFileToDeviceStorage] Documents gagal, mencoba External:', docErr);
        try {
          const extResult = await Filesystem.writeFile({
            path: filename,
            data: cleanBase64,
            directory: Directory.External,
            recursive: true,
          });
          savedUri = extResult?.uri;
          targetFolder = 'Penyimpanan Eksternal HP';
        } catch (extErr) {
          console.warn('[saveFileToDeviceStorage] External gagal, fallback Cache:', extErr);
          const cacheUri = await Filesystem.getUri({
            directory: Directory.Cache,
            path: filename,
          });
          savedUri = cacheUri?.uri;
          targetFolder = 'Memori Cache Aplikasi';
        }
      }

      return {
        success: true,
        method: 'capacitor-native',
        uri: savedUri,
        location: targetFolder,
      };
    } catch (err) {
      console.error('[saveFileToDeviceStorage] Native save error:', err);
      throw err;
    }
  }

  // B. Platform Web / Mobile Browser (Chrome Android, Safari, Desktop)
  try {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = filename;
      // PENTING: Jangan gunakan target="_blank" karena Chrome Android memblokir blob URL popup!
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(url);
      }, 6000);

      return { success: true, method: 'browser-blob', location: 'Folder Downloads' };
    }

    if (base64Data) {
      const clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const dataUri = `data:${mimeType};base64,${clean}`;
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = dataUri;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 6000);

      return { success: true, method: 'browser-datauri', location: 'Folder Downloads' };
    }
  } catch (downloadErr) {
    console.error('[saveFileToDeviceStorage] Browser download error:', downloadErr);
    throw downloadErr;
  }

  throw new Error('Format file tidak didukung untuk diunduh.');
};

/**
 * 2. Buka Menu Bagikan / Buka File (Android Share Sheet / WhatsApp / PDF Viewer)
 * Memunculkan dialog Android sistem untuk langsung membuka file dengan PDF reader
 * atau membagikannya ke WhatsApp, Google Drive, email, atau cetak Bluetooth.
 */
export const shareOrOpenFile = async ({
  filename,
  blob,
  base64Data = null,
  mimeType = 'application/octet-stream',
  title = 'Dokumen PUKO POS',
}) => {
  const isNative = Capacitor.isNativePlatform();

  // A. Platform Native Android APK (Capacitor)
  if (isNative) {
    try {
      let rawBase64 = base64Data;
      if (!rawBase64 && blob) {
        rawBase64 = await blobToBase64(blob);
      }
      if (!rawBase64) throw new Error('Data file kosong');

      const cleanBase64 = rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64;

      // Pastikan file tersimpan di Cache agar FileProvider memiliki akses baca
      const saved = await Filesystem.writeFile({
        path: filename,
        data: cleanBase64,
        directory: Directory.Cache,
        recursive: true,
      });

      const uriResult = await Filesystem.getUri({
        directory: Directory.Cache,
        path: filename,
      });
      const fileUri = uriResult?.uri || saved?.uri;

      // Buka native share dialog Android
      await Share.share({
        title: title || filename,
        text: `${title || 'Dokumen'} (${filename})`,
        files: [fileUri],
        dialogTitle: `Buka atau Bagikan ${filename}`,
      });

      return { success: true, method: 'capacitor-share', uri: fileUri };
    } catch (shareErr) {
      if (
        shareErr?.message?.toLowerCase().includes('canceled') ||
        shareErr?.message?.toLowerCase().includes('cancelled')
      ) {
        return { success: true, method: 'user-canceled' };
      }
      console.warn('[shareOrOpenFile] Capacitor Share error:', shareErr);
      throw shareErr;
    }
  }

  // B. Web Share API di Browser Mobile (Chrome / Safari di HP)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (blob) {
        const file = new File([blob], filename, { type: mimeType });
        const canShare =
          typeof navigator.canShare === 'function' ? navigator.canShare({ files: [file] }) : true;

        if (canShare) {
          await navigator.share({
            files: [file],
            title: title || filename,
            text: `${title || 'Dokumen'} (${filename})`,
          });
          return { success: true, method: 'web-share-files' };
        }
      }
    } catch (webShareErr) {
      if (webShareErr.name === 'AbortError') {
        return { success: true, method: 'user-canceled' };
      }
      console.warn('[shareOrOpenFile] Web Share API error, fallback ke penyimpanan:', webShareErr);
    }
  }

  // C. Fallback jika tidak mendukung share: langsung simpan file ke perangkat
  return await saveFileToDeviceStorage({ filename, blob, base64Data, mimeType });
};

/**
 * 3. Helper Universal (Kompatibel dengan kode lama)
 * Pada Desktop: Langsung mengunduh file
 * Pada Android APK: Menyimpan ke HP dan membuka Share Sheet
 * Pada Mobile Browser: Mengunduh file ke penyimpanan HP
 */
export const downloadOrShareFile = async ({
  filename,
  blob,
  base64Data = null,
  mimeType = 'application/octet-stream',
  title = 'Unduh Dokumen PUKO',
}) => {
  const isNative = Capacitor.isNativePlatform();
  const isMobile = isMobileDevice();

  if (isNative) {
    try {
      // 1. Simpan ke storage Android
      await saveFileToDeviceStorage({ filename, blob, base64Data, mimeType });
      // 2. Buka share sheet untuk opsi buka/bagikan
      return await shareOrOpenFile({ filename, blob, base64Data, mimeType, title });
    } catch (e) {
      console.warn('[downloadOrShareFile] Native share flow error, fallback ke save saja:', e);
      return await saveFileToDeviceStorage({ filename, blob, base64Data, mimeType });
    }
  }

  if (isMobile) {
    // Pada mobile browser, simpan langsung ke downloads
    return await saveFileToDeviceStorage({ filename, blob, base64Data, mimeType });
  }

  // Desktop Web
  return await saveFileToDeviceStorage({ filename, blob, base64Data, mimeType });
};

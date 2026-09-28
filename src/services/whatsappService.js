/**
 * Layanan WhatsApp Gateway (Fonnte API)
 * Mengirim pesan WhatsApp & kode OTP secara otomatis ke nomor tujuan
 * Website Fonnte: https://fonnte.com
 */

const STORAGE_FONNTE_TOKEN_KEY = 'puko_fonnte_token';

/**
 * Format nomor HP ke format WhatsApp internasional (628xxxxxxxxxx)
 */
export const formatPhoneForWhatsApp = (rawPhone) => {
  if (!rawPhone) return '';
  let clean = String(rawPhone).replace(/[\s\-\(\)\.]/g, '');
  if (clean.startsWith('+62')) {
    clean = '62' + clean.slice(3);
  } else if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (!clean.startsWith('62')) {
    clean = '62' + clean;
  }
  return clean;
};

/**
 * Mendapatkan token Fonnte dari LocalStorage atau Environment Variable
 */
export const getFonnteToken = () => {
  try {
    const local = localStorage.getItem(STORAGE_FONNTE_TOKEN_KEY);
    if (local && local.trim()) return local.trim();
  } catch {
    // ignore
  }
  return import.meta.env.VITE_FONNTE_TOKEN || '';
};

/**
 * Menyimpan token Fonnte ke LocalStorage
 */
export const setFonnteToken = (token) => {
  try {
    if (!token || !token.trim()) {
      localStorage.removeItem(STORAGE_FONNTE_TOKEN_KEY);
    } else {
      localStorage.setItem(STORAGE_FONNTE_TOKEN_KEY, token.trim());
    }
  } catch {
    // ignore
  }
};

/**
 * Kirim kode OTP Lupa Password ke WhatsApp via Fonnte API
 */
export const sendOtpWhatsApp = async ({ phone, otp, name = 'Pengguna' }) => {
  const target = formatPhoneForWhatsApp(phone);
  if (!target) {
    return {
      success: false,
      message: 'Nomor WhatsApp tidak valid atau kosong.',
    };
  }

  const token = getFonnteToken();
  if (!token) {
    return {
      success: false,
      noToken: true,
      message:
        'Token WhatsApp Gateway (Fonnte) belum diisi. Masukkan token di Pengaturan > Toko & Sistem > WhatsApp Gateway.',
    };
  }

  const message = `🥑 *PUKO POS - Alpukat Kocok*\n\nHalo *${name}*,\n\nBerikut adalah 6-digit kode OTP untuk pemulihan kata sandi akun kasir Anda:\n\n👉 *${otp}* 👈\n\n⚠️ *PENTING:*\n• Kode ini berlaku selama *5 menit*.\n• JANGAN berikan kode ini kepada siapa pun demi keamanan akun Anda.\n\n_Pesan otomatis dikirim oleh sistem PUKO POS._`;

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: target,
        message: message,
        countryCode: '62',
      }),
    });

    const data = await response.json();

    if (data.status === true || data.status === 'true') {
      return {
        success: true,
        message: `Kode OTP berhasil dikirim ke WhatsApp ${phone}.`,
        data: data,
      };
    }

    return {
      success: false,
      message:
        data.reason ||
        'Gagal mengirim pesan WhatsApp via Fonnte. Pastikan nomor HP aktif dan device WhatsApp di Fonnte terhubung.',
      data: data,
    };
  } catch (error) {
    console.error('Error sending WhatsApp OTP:', error);
    return {
      success: false,
      message:
        'Terjadi kendala jaringan saat menghubungi server WhatsApp Gateway. Pastikan koneksi internet aktif.',
      error: error.message,
    };
  }
};

/**
 * Kirim pesan tes koneksi WhatsApp Gateway
 */
export const sendTestWhatsApp = async (phone) => {
  const target = formatPhoneForWhatsApp(phone);
  const token = getFonnteToken();

  if (!token) {
    return {
      success: false,
      message: 'Token WhatsApp Gateway belum diisi.',
    };
  }

  const message = `✅ *Tes Koneksi PUKO POS Berhasil!*\n\nNomor ini berhasil terhubung dengan WhatsApp Gateway PUKO POS.\nSistem siap mengirimkan kode OTP dan struk transaksi. 🥑`;

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: target,
        message: message,
        countryCode: '62',
      }),
    });

    const data = await response.json();
    if (data.status === true || data.status === 'true') {
      return { success: true, message: 'Pesan tes WhatsApp berhasil terkirim!' };
    }
    return {
      success: false,
      message: data.reason || 'Gagal mengirim pesan tes WhatsApp.',
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal terhubung ke server Fonnte: ' + err.message,
    };
  }
};

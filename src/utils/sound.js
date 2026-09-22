/**
 * PUKO POS - Web Audio Synthesizer Sound Effects
 * Dibuat menggunakan Web Audio API murni:
 * - 100% Bebas dependensi file eksternal (tidak akan 404 / error loading)
 * - 0ms latency (responsif instan saat tombol ditekan)
 * - Bekerja offline di perangkat kasir mana pun
 */

let audioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    console.warn('Web Audio API not supported or blocked:', err);
    return null;
  }
};

/**
 * Cek apakah suara aktif di pengaturan
 */
export const isSoundEnabled = () => {
  try {
    // 1. Cek langsung flag dedicated 'puko_sound_enabled'
    const direct = localStorage.getItem('puko_sound_enabled');
    if (direct !== null) {
      return direct === 'true' || direct === true;
    }

    // 2. Cek key storageService yang digunakan aplikasi ('puko_pos_settings')
    const posSettings = localStorage.getItem('puko_pos_settings');
    if (posSettings) {
      const parsed = JSON.parse(posSettings);
      if (parsed && typeof parsed.enableSound === 'boolean') {
        return parsed.enableSound;
      }
    }

    // 3. Fallback ke legacy key 'settings'
    const raw = localStorage.getItem('settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.enableSound === 'boolean') {
        return parsed.enableSound;
      }
    }

    return true;
  } catch {
    return true;
  }
};

/**
 * Simpan status aktif/nonaktif suara langsung ke storage
 */
export const setSoundEnabled = (enabled) => {
  try {
    localStorage.setItem('puko_sound_enabled', String(Boolean(enabled)));
  } catch (err) {
    console.warn('Error saving sound setting:', err);
  }
};

/**
 * 1. Bunyi Menambahkan Menu ke Keranjang
 * Nada: Pop chime modern kasir (gliding sine 550Hz -> 880Hz)
 */
export const playAddMenuSound = () => {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.07);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch (err) {
    console.warn('Error playing add menu sound:', err);
  }
};

/**
 * 2. Bunyi Transaksi Selesai / Pembayaran Berhasil
 * Nada: Arpeggio akord mayor ceria C5 - E5 - G5 - C6 ala POS modern / cash register
 */
export const playSuccessSound = () => {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // C5, E5, G5, C6
    const chord = [
      { freq: 523.25, time: 0 },
      { freq: 659.25, time: 0.07 },
      { freq: 783.99, time: 0.14 },
      { freq: 1046.5, time: 0.22 },
    ];

    chord.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.linearRampToValueAtTime(0.22, now + time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + 0.38);
    });
  } catch (err) {
    console.warn('Error playing success sound:', err);
  }
};

/**
 * 3. Bunyi Mencetak Struk Kasir (Thermal Printer Confirmation Beep)
 * Nada: Dua nada bip khas mesin cetak kasir (1400Hz)
 */
export const playPrintReceiptSound = () => {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const beeps = [0, 0.09];

    beeps.forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1450, now + delay);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.06);
    });
  } catch (err) {
    console.warn('Error playing print sound:', err);
  }
};

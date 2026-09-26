// Zona waktu default toko PUKO: Kota Kendari, Sulawesi Tenggara (WITA / UTC+8)
export const DEFAULT_STORE_TIMEZONE = 'Asia/Makassar';

/**
 * Mengambil zona waktu toko aktif
 */
export const getStoreTimezone = () => {
  try {
    const raw = localStorage.getItem('settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.timezone) return parsed.timezone;
    }
  } catch {
    // ignore
  }
  return DEFAULT_STORE_TIMEZONE;
};

/**
 * Mendapatkan string tanggal YYYY-MM-DD dalam zona waktu toko (WITA)
 */
export const getDateStringInStoreTZ = (dateInput = new Date(), timeZone = getStoreTimezone()) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

/**
 * Mendapatkan string tanggal kemarin YYYY-MM-DD dalam zona waktu toko (WITA)
 */
export const getYesterdayStringInStoreTZ = (timeZone = getStoreTimezone()) => {
  const todayStr = getDateStringInStoreTZ(new Date(), timeZone);
  if (!todayStr) return '';
  const [y, m, d] = todayStr.split('-').map(Number);
  const prevDate = new Date(Date.UTC(y, m - 1, d - 1));
  const py = prevDate.getUTCFullYear();
  const pm = String(prevDate.getUTCMonth() + 1).padStart(2, '0');
  const pd = String(prevDate.getUTCDate()).padStart(2, '0');
  return `${py}-${pm}-${pd}`;
};

/**
 * Mendapatkan rentang tanggal masa lalu dalam zona waktu toko (WITA)
 */
export const getPastDaysRangeInStoreTZ = (count = 7, timeZone = getStoreTimezone()) => {
  const todayStr = getDateStringInStoreTZ(new Date(), timeZone);
  const [y, m, d] = todayStr.split('-').map(Number);
  const startDate = new Date(Date.UTC(y, m - 1, d - (count - 1)));
  const sy = startDate.getUTCFullYear();
  const sm = String(startDate.getUTCMonth() + 1).padStart(2, '0');
  const sd = String(startDate.getUTCDate()).padStart(2, '0');
  return {
    startDateStr: `${sy}-${sm}-${sd}`,
    endDateStr: todayStr,
  };
};

/**
 * Format ISO date string into Indonesian readable format in Store Timezone (WITA)
 * Example: 2026-09-20T14:30:00 -> "20 Sep 2026, 14:30"
 */
export const formatDate = (dateInput, timeZone = getStoreTimezone()) => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Format time only with timezone suffix (WITA)
 * Example: "14:30 WITA"
 */
export const formatTime = (dateInput, timeZone = getStoreTimezone()) => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  const tzSuffix =
    timeZone === 'Asia/Makassar'
      ? ' WITA'
      : timeZone === 'Asia/Jayapura'
      ? ' WIT'
      : ' WIB';
  return (
    new Intl.DateTimeFormat('id-ID', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date) + tzSuffix
  );
};

/**
 * Check if dateInput is today according to store timezone (WITA)
 */
export const isToday = (dateInput, timeZone = getStoreTimezone()) => {
  if (!dateInput) return false;
  return (
    getDateStringInStoreTZ(dateInput, timeZone) ===
    getDateStringInStoreTZ(new Date(), timeZone)
  );
};

/**
 * Check if dateInput is yesterday according to store timezone (WITA)
 */
export const isYesterday = (dateInput, timeZone = getStoreTimezone()) => {
  if (!dateInput) return false;
  return (
    getDateStringInStoreTZ(dateInput, timeZone) ===
    getYesterdayStringInStoreTZ(timeZone)
  );
};

/**
 * Format date only without time in Store Timezone (WITA)
 * Example: "21 Sep 2026"
 */
export const formatDateOnly = (dateInput, timeZone = getStoreTimezone()) => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

/**
 * Format date for HTML <input type="date"> (YYYY-MM-DD) in Store Timezone (WITA)
 */
export const formatDateInput = (dateInput, timeZone = getStoreTimezone()) => {
  if (!dateInput) return '';
  return getDateStringInStoreTZ(dateInput, timeZone);
};


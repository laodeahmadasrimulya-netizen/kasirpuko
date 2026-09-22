/**
 * Format number to Indonesian Rupiah (IDR)
 * Example: 18000 -> "Rp 18.000"
 */
export const formatIDR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format number with thousand separator (no currency prefix)
 * Example: 200000 -> "200.000"
 */
export const formatNumber = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0';
  }
  return new Intl.NumberFormat('id-ID').format(amount);
};

/**
 * Format compact IDR
 * Example: 18000 -> "18K"
 */
export const formatCompactIDR = (amount) => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return String(amount);
};

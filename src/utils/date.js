/**
 * Format ISO date string into Indonesian readable format
 * Example: 2026-09-20T14:30:00 -> "20 Sep 2026, 14:30"
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Format time only
 * Example: "14:30 WIB"
 */
export const formatTime = (dateInput) => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date) + ' WIB';
};

/**
 * Get start of today as Date object
 */
export const isToday = (dateInput) => {
  if (!dateInput) return false;
  const target = new Date(dateInput);
  const now = new Date();
  return (
    target.getDate() === now.getDate() &&
    target.getMonth() === now.getMonth() &&
    target.getFullYear() === now.getFullYear()
  );
};

/**
 * Check if dateInput is yesterday
 */
export const isYesterday = (dateInput) => {
  if (!dateInput) return false;
  const target = new Date(dateInput);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    target.getDate() === yesterday.getDate() &&
    target.getMonth() === yesterday.getMonth() &&
    target.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Format date only without time
 * Example: "21 Sep 2026"
 */
export const formatDateOnly = (dateInput) => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

/**
 * Format date for HTML <input type="date"> (YYYY-MM-DD)
 */
export const formatDateInput = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


/**
 * Generate human-friendly invoice code for PUKO POS
 * Format: PUKO-YYYYMMDD-XXXX (e.g. PUKO-20260920-0042)
 */
export const generateInvoiceCode = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // 4 random alphanumeric characters or sequence
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  
  return `PUKO-${year}${month}${day}-${randomSuffix}`;
};

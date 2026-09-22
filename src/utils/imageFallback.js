/**
 * Helper fallback untuk gambar jika format file tertukar antara .jpg dan .jpeg
 */
export const handleImageError = (e) => {
  const target = e.currentTarget;
  if (!target.dataset.triedFallback) {
    target.dataset.triedFallback = 'true';
    if (target.src.endsWith('.jpeg')) {
      target.src = target.src.replace(/\.jpeg$/, '.jpg');
      return;
    }
    if (target.src.endsWith('.jpg')) {
      target.src = target.src.replace(/\.jpg$/, '.jpeg');
      return;
    }
  }
};

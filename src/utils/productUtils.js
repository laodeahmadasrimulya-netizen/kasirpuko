/**
 * Product & Cart Utility Functions
 * Centralized logic for classifying menu items and counting drink cups vs toppings
 */

/**
 * Checks whether an item is considered an extra topping / add-on
 * rather than a standalone cup of drink.
 *
 * Example:
 * - "Alpukat Kocok Cikmi" -> FALSE (it is a drink cup)
 * - "Bubuk Milo" / "Extra Bubuk Milo" -> TRUE (it is an extra topping)
 * - "Topping Keju Gondrong" -> TRUE (it is an extra topping)
 */
export const isToppingItem = (item) => {
  if (!item) return false;

  const category = String(item.category || item.kategori || '').toLowerCase().trim();
  const id = String(item.id || '').toLowerCase().trim();
  const name = String(item.nama || item.name || '').toLowerCase().trim();

  // 1. Explicit Category Match
  if (category.includes('topping') || category.includes('toping')) {
    return true;
  }

  // 2. ID Pattern (puko-t... for toppings)
  if (id.startsWith('puko-t')) {
    return true;
  }

  // 3. Name Prefixes or Keywords
  if (
    name.startsWith('extra ') ||
    name.startsWith('ekstra ') ||
    name.startsWith('topping ') ||
    name.startsWith('toping ') ||
    name.includes('topping') ||
    name.includes('toping')
  ) {
    return true;
  }

  // 4. Standalone Topping Names (if categorized loosely or custom added)
  const TOPPING_NAME_KEYWORDS = [
    'bubuk milo',
    'keju gondrong',
    'keju parut',
    'biskuit oreo',
    'saus cokelat',
    'saus coklat',
    'chocochip',
    'meses',
  ];

  if (TOPPING_NAME_KEYWORDS.some((kw) => name === kw || (name.includes(kw) && !name.includes('alpukat')))) {
    return true;
  }

  return false;
};

/**
 * Checks whether an item is a primary drink cup
 */
export const isCupItem = (item) => {
  return !isToppingItem(item);
};

/**
 * Accurately counts how many cups are in an item array.
 * Toppings/add-ons are NOT counted as cups.
 *
 * Example:
 * - 1x Alpukat Kocok Cikmi + 1x Bubuk Milo = 1 Cup
 * - 2x Alpukat Kocok Original + 1x Topping Keju = 2 Cup
 */
export const countCups = (items) => {
  if (!Array.isArray(items) || items.length === 0) return 0;

  return items.reduce((total, item) => {
    if (isToppingItem(item)) {
      return total; // Topping does not consume or count as a cup
    }
    return total + (Number(item.qty) || 1);
  }, 0);
};

/**
 * Comprehensive Arabic text normalization utilities for robust searching, filtering, and comparison.
 * Handles:
 * - Hamza & Alef forms (أ, إ, آ, ٱ, ا -> ا)
 * - Taa Marbouta / Haa (ة, ه -> ه)
 * - Yaa / Alef Maqsura (ى, ي -> ي)
 * - Hamza variants (ؤ, ئ, ء -> ء)
 * - Tashkeel (harakat / diacritics) and Tatweel (kashida)
 * - Non-alphanumeric punctuation and multiple whitespace stripping
 */

export const normalizeArabicSearch = (text: any): string => {
  if (text === undefined || text === null) return '';
  let s = String(text)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // Tashkeel & Tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/[\(\)\[\]\{\}<>\/\\_\-.,:;؛،+&*~'"`«»!?=^#@%$|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalize common Arabic prefixes / compound connectors without ASCII word boundary:
  // e.g. "عبد النبي" <-> "عبدالنبي", "ابو الخير" <-> "ابوالخير", "ابن رشد" <-> "ابنرشد"
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/(^|\s)(عبد|ابو|أبو|ام|أم|ابن|بن)\s+/g, '$1$2');
  }

  return s;
};

export const matchesArabicSearch = (target: any, search: any): boolean => {
  if (!search) return true;
  const normSearch = normalizeArabicSearch(search);
  if (!normSearch) return true;
  const normTarget = normalizeArabicSearch(target);
  return normTarget.includes(normSearch);
};

export const equalsArabicNormalized = (a: any, b: any): boolean => {
  return normalizeArabicSearch(a) === normalizeArabicSearch(b);
};

/**
 * Common Arabic organizational and entity prefixes in agriculture / trade
 * which may appear or be omitted without changing the supplier identity.
 */
export const GENERIC_SUPPLIER_ENTITY_WORDS = new Set([
  'مزرعه',
  'شركه',
  'محطه',
  'مشروع',
  'مؤسسه',
  'جمعيه'
]);

/**
 * Known preferred canonical display names for specific merged suppliers.
 * - 'روضه' => 'الروضة' (دمج "الروضة - شبانة - عبدالعليم" وجميع المتغيرات مع "الروضة")
 * - 'اوليف لاند' => 'مزرعة اوليف لاند' (دمج "اوليف لاند" مع "مزرعة اوليف لاند")
 */
export const KNOWN_CANONICAL_SUPPLIERS: Record<string, string> = {
  'روضه': 'الروضة',
  'اوليف لاند': 'مزرعة اوليف لاند'
};

/**
 * Normalizes supplier name for group matching (ignores word order, parentheses, slashes, punctuation, and Arabic letter variances).
 * Overcomes letter & spacing variations such as:
 * - "وائل عبد النبى" vs "وائل عبدالنبي"
 * - "مزرعه اوليف لاند" vs "مزرعة اوليف لاند" vs "اوليف لاند"
 * - Merges "الروضة - شبانة - عبدالعليم" with "الروضة"
 */
export const normalizeSupplierKey = (rawName: string): string => {
  if (!rawName) return '';

  // 1. Remove diacritics / tashkeel and tatweel
  let text = String(rawName)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .toLowerCase();

  // 2. Replace parentheses, brackets, slashes, dashes, quotes, and punctuation with spaces
  text = text.replace(/[\(\)\[\]\{\}<>\/\\_\-.,:;؛،+&*~'"`«»!?=^#@%$|]/g, ' ');

  // 3. Normalize common Arabic prefixes / compound connectors without ASCII word boundary:
  // e.g. "عبد النبي" <-> "عبدالنبي", "ابو الخير" <-> "ابوالخير"
  let prev = '';
  while (prev !== text) {
    prev = text;
    text = text.replace(/(^|\s)(عبد|ابو|أبو|ام|أم|ابن|بن)\s+/g, '$1$2');
  }

  // 4. Normalize Arabic letters (Alef variants, Taa Marbouta / Haa, Yaa / Alef Maqsura, Hamza)
  text = text
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/[ؤئ]/g, 'ء');

  // Fix common concatenated/space variations in compound English/Arabic names
  text = text.replace(/اوليف\s*لاند/g, 'اوليف لاند');
  text = text.replace(/اوليفلاند/g, 'اوليف لاند');

  // 5. Split into words, trim, filter out noise
  let words = text
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 0)
    .map(w => {
      // Normalize leading 'ال' if word length >= 4 so 'الروقا' and 'روقا' match identically
      if (w.startsWith('ال') && w.length >= 4) {
        return w.slice(2);
      }
      return w;
    });

  if (words.length === 0) return '';

  // 5b. Strip generic organizational entity prefixes (like "مزرعة" / "شركة") if other distinct words exist
  const nonGenericWords = words.filter(w => !GENERIC_SUPPLIER_ENTITY_WORDS.has(w));
  if (nonGenericWords.length > 0) {
    words = nonGenericWords;
  }

  // 5c. Specific merge rules:
  // Merge "الروضة - شبانة - عبدالعليم" (and variations) with "الروضة":
  const hasRawda = words.includes('روضه');
  const hasShabana = words.includes('شبانه');
  const hasAbdelAlim = words.includes('عبدالعليم');
  if (hasRawda && (hasShabana || hasAbdelAlim)) {
    return 'روضه';
  }

  // 6. Sort words alphabetically so word order does not matter!
  words.sort((a, b) => a.localeCompare(b, 'ar'));

  return words.join(' ');
};

/**
 * Resolves canonical supplier display name from a raw supplier name,
 * taking into account explicit alias rules (e.g., "الروضة" and "مزرعة اوليف لاند").
 */
export const resolveCanonicalSupplierName = (rawName: string, fallback?: string): string => {
  if (!rawName) return fallback || '';
  const key = normalizeSupplierKey(rawName);
  if (key && KNOWN_CANONICAL_SUPPLIERS[key]) {
    return KNOWN_CANONICAL_SUPPLIERS[key];
  }
  return fallback || rawName;
};

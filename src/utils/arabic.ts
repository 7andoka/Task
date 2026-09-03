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
  return String(text)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // Tashkeel & Tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/[\(\)\[\]\{\}<>\/\\_\-.,:;؛،+&*~'"`«»!?=^#@%$|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

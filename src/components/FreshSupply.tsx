import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sprout, 
  Search, 
  RefreshCw, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  X, 
  FileSpreadsheet, 
  FileText, 
  Copy, 
  Check, 
  Layers, 
  AlertCircle,
  SlidersHorizontal,
  LayoutList,
  Database,
  Calendar,
  Truck,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  PackageCheck,
  User,
  ArrowUpDown,
  ExternalLink,
  Table as TableIcon,
  Sparkles,
  Container,
  Building2,
  FileCheck2,
  Hash,
  Filter,
  ArrowRight,
  Grid3X3,
  Boxes,
  Fuel,
  Activity,
  CheckCircle2,
  ListOrdered,
  FileBarChart,
  Layers3,
  CalendarDays,
  Percent,
  Weight,
  Pin,
  Tag,
  MapPin,
  Sparkle,
  Sliders,
  RotateCcw,
  Trophy,
  Award,
  ArrowUpRight,
  CircleDot,
  Edit3,
  Save,
  DollarSign,
  CreditCard,
  FlaskConical,
  Banknote,
  Receipt,
  FileEdit,
  ShieldCheck,
  ShieldAlert,
  Shuffle,
  Leaf,
  Clock,
  Printer,
  Route,
  Upload,
  Edit
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../constants';
import { FreshItemsDashboard } from './FreshItemsDashboard';
import { FreshSuppliersDashboard } from './FreshSuppliersDashboard';
import { FreshAnalyticsDashboard } from './FreshAnalyticsDashboard';
import { DateRangeFilter, DateFilterValue, getPresetDates } from './DateRangeFilter';
import { Language, UserProfile } from '../types';
import { translations } from '../i18n';
import { toast } from 'sonner';

const FRESH_GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQN1nH0TPk6-NpHHIWN6xQ1RKnjut-nzUgga3-zzB1ydF9f2L3--JPiwu6qJHnCcFymfsZj3gTzKiIo/pub?output=csv";
const STORAGE_CACHE_KEY = "fresh_supply_data_cache";
const STORAGE_TIME_KEY = "fresh_supply_last_synced";
const STORAGE_OVERRIDES_KEY = "fresh_supply_overrides_cache";

export interface FreshSupplyRecord {
  id: string;
  date: string;              // التاريخ الموحد (e.g. 27/08/2026)
  originalDate?: string;     // التاريخ الأصلي من الملف (e.g. 27-Aug)
  parsedDate?: Date | null;
  store: string;             // المخزن (e.g. GPS, اوليف لاند)
  movementType: string;      // نوع الحركة (e.g. اضافة)
  movementNo: string;        // رقم الحركة (e.g. 1878)
  truckNo: string;           // رقم سيارة (e.g. 6183)
  driver: string;            // السائق (e.g. مصطفى صلاح)
  vendorDocNo: string;       // رقم مستند المورد
  costCenterCode: string;    // كود مركز التكلفة
  po: string;                // PO (e.g. 4500003008)
  sapExecutionNo?: string;   // رقم تنفيذ الساب (SAP Execution No)
  initialAnalysis?: string;  // التحليل الأولي (جودة / مواصفات / نسبة العيوب / الفرز الأولي)
  region?: string;           // المنطقة / المزرعة (e.g. طريق مصر إسكندرية الصحراوي، وادي النطرون...)
  price?: number;            // السعر الأساسي (سعر الكيلو بالجنيه ج.م)
  qualityDiscountPercent?: number; // نسبة خصم الجودة % (تؤثر على السعر الصافي والقيمة)
  paymentMethod?: string;    // طريقة السداد (نقدي / دفعات توريد)
  routing?: string;          // التوجيه (مياه وملح / مطبوخ / زيت / أخري)
  notes?: string;            // ملاحظات إضافية
  updatedAt?: string;        // تاريخ ووقت آخر تعديل يدوي
  updatedBy?: string;        // اسم المستخدم الذي قام بالتعديل
  reservation: string;       // RESERVATION
  postDocument: string;      // POST DOCUMENT (e.g. 5000052380)
  oldCode: string;           // كود قديم (e.g. 80003)
  sapCode: string;           // كود ساب (e.g. 11000173)
  itemName: string;          // اسم الصنف (الموحد بالكود)
  originalItemName?: string; // اسم الصنف الأصلي من الملف قبل توحيد الكود
  unit: string;              // الوحدة (e.g. كيلو)
  costCenter: string;        // مركز التكلفة / المورد (e.g. جمال سالم / الروقا)
  originalCostCenter?: string;// الاسم الأصلي من الملف قبل توحيد الأسماء المقلوبة
  quantityKg: number;        // اضافة (الكمية بالكيلو)
  quantityTons: number;      // الكمية بالطن
  location: string;          // الموقع / التعبئة (e.g. برميل, تانك)
  tankNo: string;            // رقم التانك
  raw: Record<string, string>;
}

interface FreshSupplyProps {
  lang: Language;
  user?: UserProfile | null;
}

// Variety categorization helper & color codes
export const FRESH_VARIETIES = [
  'Manzanilla', 'Picual', 'Kalamata', 'Akas', 'Azizi', 'Kobrosi', 'Dolsy', 'Pepper', 'Other'
];

export const detectFreshVariety = (descr: string): string => {
  const dLower = (descr || '').toLowerCase();
  if (dLower.includes('pepper') || dLower.includes('فلفل') || dLower.includes('شطة') || dLower.includes('jalapen')) return 'Pepper';
  if (dLower.includes('manzanilla') || dLower.includes('manzanila') || dLower.includes('منزان') || dLower.includes('منزن') || dLower.includes('مانزنيلا') || dLower.includes('مانزنيلو')) return 'Manzanilla';
  if (dLower.includes('picual') || dLower.includes('pical') || dLower.includes('بيكوال') || dLower.includes('بكوال')) return 'Picual';
  if (dLower.includes('akas') || dLower.includes('akass') || dLower.includes('عقص') || dLower.includes('عقيص') || dLower.includes('اقيص')) return 'Akas';
  if (dLower.includes('azizi') || dLower.includes('عزيز') || dLower.includes('عجيزي') || dLower.includes('عجيز')) return 'Azizi';
  if (dLower.includes('kobrosi') || dLower.includes('kobrosy') || dLower.includes('قبرص') || dLower.includes('قبرصي')) return 'Kobrosi';
  if (dLower.includes('kalamata') || dLower.includes('kalama') || dLower.includes('كالمات') || dLower.includes('كلامات') || dLower.includes('كلاماته') || dLower.includes('كلاماتا')) return 'Kalamata';
  if (dLower.includes('dolsy') || dLower.includes('dolcy') || dLower.includes('dolce') || dLower.includes('تفاح') || dLower.includes('tofah') || dLower.includes('دولس')) return 'Dolsy';
  if (dLower.includes('زيتون') || dLower.includes('olive')) return 'Azizi';
  return 'Other';
};

export const classifyItemCategory = (itemName: string, variety: string) => {
  const dLower = (itemName || '').toLowerCase();
  const isPepper = dLower.includes('pepper') || dLower.includes('فلفل') || dLower.includes('شطة') || dLower.includes('jalapen') || variety === 'Pepper';
  const isOlive = 
    dLower.includes('زيتون') || 
    dLower.includes('olive') || 
    dLower.includes('بيكوال') || 
    dLower.includes('بكوال') || 
    dLower.includes('picual') || 
    dLower.includes('pical') || 
    dLower.includes('عقص') || 
    dLower.includes('عقيص') || 
    dLower.includes('اقيص') || 
    dLower.includes('akas') || 
    dLower.includes('قبرصي') || 
    dLower.includes('قبرص') || 
    dLower.includes('kobrosi') || 
    dLower.includes('مانزنيلا') || 
    dLower.includes('مانزنيلو') || 
    dLower.includes('manzanilla') || 
    dLower.includes('منزان') || 
    dLower.includes('منزن') || 
    dLower.includes('عجيزي') || 
    dLower.includes('عجيز') || 
    dLower.includes('عزيز') || 
    dLower.includes('azizi') || 
    dLower.includes('كلاماته') || 
    dLower.includes('كلاماتا') || 
    dLower.includes('كلامات') || 
    dLower.includes('كالمات') || 
    dLower.includes('kalamata') || 
    dLower.includes('تفاح') || 
    dLower.includes('دولس') || 
    dLower.includes('dolsy') ||
    (variety !== 'Pepper' && variety !== 'Other');
  
  const isOther = !isPepper && !isOlive;
  return { isPepper, isOlive, isOther };
};

/**
 * Union-Find (Disjoint Set) data structure for robust clustering
 */
class UnionFind<T> {
  parent: Map<T, T> = new Map();

  find(item: T): T {
    if (!this.parent.has(item)) {
      this.parent.set(item, item);
      return item;
    }
    const p = this.parent.get(item)!;
    if (p === item) return item;
    const root = this.find(p);
    this.parent.set(item, root);
    return root;
  }

  union(a: T, b: T) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }
}

/**
 * Extract tokenized words for fuzzy supplier matching
 */
export const extractSupplierTokens = (rawName: string): string[] => {
  if (!rawName) return [];
  let text = String(rawName)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .toLowerCase();

  text = text.replace(/[\(\)\[\]\{\}<>\/\\_\-.,:;؛،+&*~'"`«»!?=^#@%$|]/g, ' ');
  text = text
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤئ]/g, 'ء');

  return text
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 0)
    .map(w => (w.startsWith('ال') && w.length >= 4 ? w.slice(2) : w));
};

export const GENERIC_SUPPLIER_STOPWORDS = new Set([
  'شركه', 'مزرعه', 'توريدات', 'حاج', 'معلم', 'اولاد', 'ابناء', 'اخوان', 
  'مكتب', 'مصنع', 'جمعيه', 'مركز', 'تجاره', 'توزيع', 'السيد', 'الحاج', 'المعلم', 'باشا'
]);

export const COMMON_GENERIC_NAMES = new Set([
  'محمد', 'احمد', 'محمود', 'علي', 'حسن', 'حسين', 'ابراهيم', 'مصطفي', 'خالد', 'طارق', 'سيد', 'عمر', 'عمرو'
]);

/**
 * Format raw supplier name into clean presentation string (removes stray brackets/dashes)
 */
export const formatCleanSupplierName = (rawName: string): string => {
  if (!rawName) return '';
  let cleaned = String(rawName).trim();
  cleaned = cleaned.replace(/^[\(\)\[\]\{\}\-–—\/\\,;:.+]+|[\(\)\[\]\{\}\-–—\/\\,;:.+]+$/g, '').trim();
  cleaned = cleaned.replace(/\s*[-–—/]\s*/g, ' - ');
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned;
};

/**
 * Normalizes supplier name for group matching (ignores word order, parentheses, slashes, punctuation, and Arabic letter variances).
 * e.g., "الروقا جمال سالم", "جمال سالم الروقا", "جمال سالم ( الروقا )", "جمال سالم / الروقا" => all map to the exact same normalized key!
 */
export const normalizeSupplierKey = (rawName: string): string => {
  if (!rawName) return '';
  
  // 1. Remove diacritics / tashkeel and tatweel
  let text = String(rawName)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .toLowerCase();

  // 2. Replace parentheses, brackets, slashes, dashes, quotes, and punctuation with spaces
  text = text.replace(/[\(\)\[\]\{\}<>\/\\_\-.,:;؛،+&*~'"`«»!?=^#@%$|]/g, ' ');

  // 3. Normalize Arabic letters (Alef, Taa Marbouta, Yaa)
  text = text
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤئ]/g, 'ء');

  // 4. Split into words, trim, filter out noise
  const words = text
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

  // 5. Sort words alphabetically so word order does not matter!
  words.sort((a, b) => a.localeCompare(b, 'ar'));

  return words.join(' ');
};

export const getFreshVarietyName = (v: string, isRtl: boolean) => {
  switch (v) {
    case 'Manzanilla': return isRtl ? 'منزانيللا (Manzanilla)' : 'Manzanilla';
    case 'Picual': return isRtl ? 'بيكوال (Picual)' : 'Picual';
    case 'Kalamata': return isRtl ? 'كالماتا (Kalamata)' : 'Kalamata';
    case 'Akas': return isRtl ? 'عقص (Akas)' : 'Akas';
    case 'Azizi': return isRtl ? 'عزيزي (Azizi)' : 'Azizi';
    case 'Kobrosi': return isRtl ? 'قبرصي (Kobrosi)' : 'Kobrosi';
    case 'Dolsy': return isRtl ? 'تفاحي / دولسي (Dolsy)' : 'Dolsy';
    case 'Pepper': return isRtl ? 'فلفل (Pepper)' : 'Pepper';
    default: return isRtl ? 'أصناف أخرى' : 'Other Varieties';
  }
};

export const VARIETY_COLORS: Record<string, string> = {
  Manzanilla: '#f59e0b', // Amber
  Picual: '#10b981',    // Emerald
  Akas: '#8b5cf6',      // Violet
  Azizi: '#06b6d4',     // Cyan
  Kobrosi: '#3b82f6',   // Blue
  Kalamata: '#6366f1',  // Indigo
  Dolsy: '#f43f5e',     // Rose
  Pepper: '#ef4444',    // Red
  Other: '#64748b'       // Slate
};

// Color palette for charts
const CHART_COLORS = [
  '#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#3b82f6', '#14b8a6', '#f97316', 
  '#6366f1', '#84cc16', '#eab308', '#0ea5e9'
];

interface MultiSelectProps {
  label: string;
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  icon: React.ReactNode;
  lang: Language;
}

function MultiSelect({ label, options, selected, onChange, icon, lang }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const isRtl = lang === 'ar';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(item => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all text-xs font-bold whitespace-nowrap cursor-pointer h-10 select-none ${
          selected.length > 0 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20' 
            : 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
      >
        {icon}
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="bg-emerald-500 text-white text-[10px] px-1.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-black">
            {selected.length}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 p-2 overflow-hidden ${
              isRtl ? 'right-0' : 'left-0'
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800 px-1">
              <span className="text-[11px] font-black text-zinc-700 dark:text-zinc-300">{label}</span>
              {selected.length > 0 && (
                <button
                  onClick={() => onChange([])}
                  className="text-[10px] text-red-500 hover:underline font-bold cursor-pointer"
                >
                  {isRtl ? 'مسح الكل' : 'Clear'}
                </button>
              )}
            </div>

            {options.length > 5 && (
              <div className="mb-2 px-1">
                <div className="relative">
                  <Search size={12} className="absolute top-2.5 left-2.5 text-zinc-400" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder={isRtl ? 'بحث...' : 'Search...'}
                    className="w-full text-xs pl-7 pr-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
              {filteredOptions.length === 0 ? (
                <div className="text-center py-4 text-xs text-zinc-400">
                  {isRtl ? 'لا توجد نتائج' : 'No results found'}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isChecked = selected.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleOption(option.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-right ${
                        isChecked 
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold' 
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ml-2 ${
                        isChecked 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-zinc-300 dark:border-zinc-600'
                      }`}>
                        {isChecked && <Check size={10} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper to parse dates like "3-Aug", "15-Aug", "28/08/2026", "2024-08-03", etc.
export const parseFlexibleDate = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  let clean = dateStr.trim();
  if (!clean) return null;

  // Convert Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) to standard ASCII
  clean = clean.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

  // Check format "3-Aug" or "03-Aug" or "3-Aug-2024" or "3/Aug/2026"
  const monthMap: Record<string, number> = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
    'يناير': 0, 'فبراير': 1, 'مارس': 2, 'ابريل': 3, 'أبريل': 3, 'مايو': 4, 'يونيو': 5,
    'يوليو': 6, 'اغسطس': 7, 'أغسطس': 7, 'سبتمبر': 8, 'اكتوبر': 9, 'أكتوبر': 9, 'نوفمبر': 10, 'ديسمبر': 11
  };

  const dayMonthMatch = clean.match(/^(\d{1,2})[-/ ]([A-Za-z\u0600-\u06FF]+)(?:[-/ ](\d{2,4}))?$/);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const mStr = dayMonthMatch[2].toLowerCase();
    const monthKey = Object.keys(monthMap).find(k => mStr.startsWith(k));
    if (monthKey !== undefined) {
      const month = monthMap[monthKey];
      const year = dayMonthMatch[3] ? parseInt(dayMonthMatch[3], 10) : 2026;
      const fullYear = year < 100 ? 2000 + year : year;
      return new Date(fullYear, month, day);
    }
  }

  // Check format "DD/MM/YYYY" or "DD-MM-YYYY" (e.g. "28/08/2026")
  const ddmmyyyyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:\s+.*)?$/);
  if (ddmmyyyyMatch) {
    const p1 = parseInt(ddmmyyyyMatch[1], 10);
    const p2 = parseInt(ddmmyyyyMatch[2], 10);
    let year = parseInt(ddmmyyyyMatch[3], 10);
    if (year < 100) year += 2000;
    
    let day = p1;
    let month = p2 - 1;
    if (p1 <= 12 && p2 > 12) {
      month = p1 - 1;
      day = p2;
    }
    return new Date(year, month, day);
  }

  // Check format "YYYY-MM-DD" or "YYYY/MM/DD"
  const yyyymmddMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+.*)?$/);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1], 10);
    const month = parseInt(yyyymmddMatch[2], 10) - 1;
    const day = parseInt(yyyymmddMatch[3], 10);
    return new Date(year, month, day);
  }

  // Check standard ISO / JS parse
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
};

// Helper to format date into standard unified DD/MM/YYYY string
export const formatUnifiedDate = (d: Date | null | undefined): string => {
  if (!d || isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function FreshSupply({ lang, user }: FreshSupplyProps) {
  const isRtl = lang === 'ar';
  const t = translations[lang];

  // State
  const [data, setData] = useState<FreshSupplyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_TIME_KEY);
  });
  const [activeView, setActiveView] = useState<'table' | 'analytics'>('table');
  const [activeReportTab, setActiveReportTab] = useState<'oliveStockStyle' | 'matrix' | 'logistics' | 'packaging' | 'daily' | 'poRecon'>('oliveStockStyle');
  const [matrixUnit, setMatrixUnit] = useState<'tons' | 'kg'>('tons');

  // Summary Dashboard Customization State
  const [itemsSummaryMode, setItemsSummaryMode] = useState<'dashboard' | 'cards' | 'table'>('dashboard');
  const [itemsSummarySearch, setItemsSummarySearch] = useState('');
  const [itemsSummarySort, setItemsSummarySort] = useState<'tons_desc' | 'tons_asc' | 'movements_desc' | 'name_asc'>('tons_desc');

  const [suppliersSummaryMode, setSuppliersSummaryMode] = useState<'dashboard' | 'cards' | 'table'>('dashboard');
  const [suppliersSummarySearch, setSuppliersSummarySearch] = useState('');
  const [suppliersSummarySort, setSuppliersSummarySort] = useState<'tons_desc' | 'tons_asc' | 'movements_desc' | 'name_asc'>('tons_desc');

  const [analyticsSubTab, setAnalyticsSubTab] = useState<'overview' | 'items' | 'suppliers' | 'timeline' | 'storage'>('overview');
  const [activeSummaryChartTab, setActiveSummaryChartTab] = useState<'donut' | 'bar' | 'variety'>('donut');
  
  // Interactive Drill-Down (like OliveStock)
  const [drillDown, setDrillDown] = useState<{ 
    type: 'variety' | 'supplier' | 'location' | 'store'; 
    id: string; 
    label: string 
  } | null>(null);

  // Comparison State (like OliveStock)
  const [savedSupplyMap, setSavedSupplyMap] = useState<Record<string, number> | null>(() => {
    try {
      const saved = localStorage.getItem('last_known_fresh_supply_map');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  // MultiSelect Filters (like OliveStock)
  const [selectedVarieties, setSelectedVarieties] = useState<string[]>([]);
  const [selectedMultiSuppliers, setSelectedMultiSuppliers] = useState<string[]>([]);
  const [selectedMultiLocations, setSelectedMultiLocations] = useState<string[]>([]);
  const [selectedMultiStores, setSelectedMultiStores] = useState<string[]>([]);

  // Pinned Columns (like OliveStock)
  const [pinnedColumns, setPinnedColumns] = useState<string[]>(['item_code', 'item_name']);

  const togglePin = (colId: string) => {
    setPinnedColumns(prev => 
      prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
    );
  };
  
  // Interactive KPI Modal state
  const [kpiModal, setKpiModal] = useState<'items' | 'suppliers' | 'stores' | 'totals' | 'movements' | 'trucks' | 'packaging' | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [mainCategoryFilter, setMainCategoryFilter] = useState<'ALL' | 'OLIVES' | 'PEPPER' | 'OTHER'>('ALL');
  const [analysisFilter, setAnalysisFilter] = useState<'ALL' | 'PESTICIDE_FREE' | 'PESTICIDES' | 'RANDOM' | 'NONE'>('ALL');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'all' });
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof FreshSupplyRecord>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Table container ref for scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Selected row for detail modal
  const [selectedRecord, setSelectedRecord] = useState<FreshSupplyRecord | null>(null);

  // Bulk selection & edit state
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({
    po: '',
    sapExecutionNo: ''
  });

  // User role checking for permission restriction:
  // Restricted to: مسئول الاعتماد, مسئول التنفيذ, مسئول التسجيل, Admin
  const userRoles = useMemo(() => {
    const list: string[] = [];
    if (user?.role) list.push(user.role);
    if (Array.isArray(user?.roles)) list.push(...user.roles);
    return list;
  }, [user]);

  const canAccessSupplyActions = useMemo(() => {
    if (!user) return false;
    const targetRoles = [
      'Admin',
      'مسئول الاعتماد',
      'Approval Officer',
      'مسئول التنفيذ',
      'Execution Officer',
      'مسئول التسجيل',
      'Registration Officer'
    ];
    return userRoles.some(r => targetRoles.includes(r));
  }, [user, userRoles]);

  // Form state for editing record details (PO, sapExecutionNo, initialAnalysis, region, price, qualityDiscountPercent, paymentMethod, notes)
  const [editForm, setEditForm] = useState({
    po: '',
    sapExecutionNo: '',
    initialAnalysis: '',
    region: '',
    price: '' as number | string,
    qualityDiscountPercent: '' as number | string,
    paymentMethod: '',
    routing: '',
    notes: ''
  });
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  // Load record data into edit form whenever selectedRecord changes
  useEffect(() => {
    if (selectedRecord) {
      setEditForm({
        po: selectedRecord.po || '',
        sapExecutionNo: selectedRecord.sapExecutionNo || '',
        initialAnalysis: selectedRecord.initialAnalysis || '',
        region: selectedRecord.region || '',
        price: selectedRecord.price !== undefined && selectedRecord.price !== null ? selectedRecord.price : '',
        qualityDiscountPercent: selectedRecord.qualityDiscountPercent !== undefined && selectedRecord.qualityDiscountPercent !== null ? selectedRecord.qualityDiscountPercent : '',
        paymentMethod: selectedRecord.paymentMethod || '',
        routing: selectedRecord.routing || '',
        notes: selectedRecord.notes || ''
      });
    }
  }, [selectedRecord]);

  // Visible columns in table
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    index: true,
    date: true,
    movementNo: true,
    itemName: true,
    quantityKg: true,
    costCenter: true,
    truckDriver: true,
    location: true,
    sapCode: true,
    po: true,
    sapExecutionNo: true,
    region: true,
    price: true, // Show price in table by default as requested
    paymentMethod: false,
    initialAnalysis: false,
    postDocument: false,
    store: false,
    actions: true
  });
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  // Helper to fetch persistent overrides from Firestore & LocalStorage
  const fetchOverrides = async (): Promise<Record<string, any>> => {
    const overridesMap: Record<string, any> = {};
    
    // 1. Read from localStorage cache first for fast response
    try {
      const cached = localStorage.getItem(STORAGE_OVERRIDES_KEY);
      if (cached) {
        Object.assign(overridesMap, JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Error reading local overrides cache:", e);
    }

    // 2. Fetch fresh overrides from Firestore
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.FRESH_SUPPLY_OVERRIDES));
      snapshot.forEach(docSnap => {
        overridesMap[docSnap.id] = docSnap.data();
      });
      // Cache in localStorage
      localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(overridesMap));
    } catch (firestoreErr) {
      console.warn("Firestore fetch overrides warning (offline/cached):", firestoreErr);
    }

    return overridesMap;
  };

  // Handler to save/update record details (PO, Initial Analysis, Region, Price, Quality Discount, Payment Method)
  const handleSaveRecordDetails = async () => {
    if (!selectedRecord) return;
    setIsSavingRecord(true);
    try {
      const overrideKey = selectedRecord.id;
      const numPrice = editForm.price !== '' ? Number(editForm.price) || 0 : 0;
      const numDiscount = editForm.qualityDiscountPercent !== '' ? Number(editForm.qualityDiscountPercent) || 0 : 0;
      
      const updatedData: Partial<FreshSupplyRecord> = {
        po: editForm.po.trim(),
        sapExecutionNo: editForm.sapExecutionNo.trim(),
        initialAnalysis: editForm.initialAnalysis.trim(),
        region: editForm.region.trim(),
        price: numPrice,
        qualityDiscountPercent: numDiscount,
        paymentMethod: editForm.paymentMethod.trim(),
        routing: editForm.routing.trim(),
        notes: editForm.notes.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.displayName || user?.username || (isRtl ? 'مستخدم النظام' : 'System User')
      };

      const updatedRecord: FreshSupplyRecord = {
        ...selectedRecord,
        ...updatedData
      };

      // 1. Update in-memory state only for the specific selected row id
      setData(prev => prev.map(item => {
        const isMatch = item.id === selectedRecord.id;
        return isMatch ? { ...item, ...updatedData } : item;
      }));

      setSelectedRecord(updatedRecord);

      // 2. Update localStorage overrides cache
      try {
        const cachedStr = localStorage.getItem(STORAGE_OVERRIDES_KEY);
        const cachedMap = cachedStr ? JSON.parse(cachedStr) : {};
        cachedMap[overrideKey] = {
          id: overrideKey,
          movementNo: selectedRecord.movementNo || '',
          ...updatedData
        };
        localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(cachedMap));
      } catch (cacheErr) {
        console.error("Cache save error:", cacheErr);
      }

      // 3. Persist to Firestore for cloud sync & multi-device collaboration
      try {
        await setDoc(doc(db, COLLECTIONS.FRESH_SUPPLY_OVERRIDES, overrideKey), {
          id: overrideKey,
          movementNo: selectedRecord.movementNo || '',
          ...updatedData
        }, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore save warning (persisted locally):", fsErr);
      }

      toast.success(
        isRtl 
          ? 'تم حفظ بيانات التوريد (أمر الشراء، التحليل الأولي، المنطقة، السعر، وطريقة السداد) بنجاح!' 
          : 'Supply details (PO, Analysis, Region, Price, Payment) saved successfully!'
      );
    } catch (err: any) {
      console.error("Save Record Details Error:", err);
      toast.error(isRtl ? 'حدث خطأ أثناء حفظ البيانات' : 'Failed to save details');
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleBulkSave = async () => {
    if (selectedRowIds.length === 0) return;
    try {
      const cachedStr = localStorage.getItem(STORAGE_OVERRIDES_KEY);
      const cachedMap = cachedStr ? JSON.parse(cachedStr) : {};

      const updatedData: any = {};
      if (bulkEditForm.po.trim() !== '') {
        updatedData.po = bulkEditForm.po.trim();
      }
      if (bulkEditForm.sapExecutionNo.trim() !== '') {
        updatedData.sapExecutionNo = bulkEditForm.sapExecutionNo.trim();
      }

      if (Object.keys(updatedData).length === 0) {
        toast.error(isRtl ? 'يرجى إدخال قيمة لتحديث أمر الشراء أو رقم ساب' : 'Please enter PO or SAP Execution No to update');
        return;
      }

      updatedData.updatedAt = new Date().toISOString();
      updatedData.updatedBy = user?.displayName || user?.username || (isRtl ? 'مستخدم النظام' : 'System User');

      selectedRowIds.forEach(id => {
        const record = data.find(r => r.id === id);
        if (record) {
          cachedMap[id] = {
            id,
            movementNo: record.movementNo || '',
            ...(cachedMap[id] || {}),
            ...updatedData
          };

          setDoc(doc(db, COLLECTIONS.FRESH_SUPPLY_OVERRIDES, id), {
            id,
            movementNo: record.movementNo || '',
            ...updatedData
          }, { merge: true }).catch(err => console.warn("Firestore bulk save warning:", err));
        }
      });

      localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(cachedMap));

      setData(prev => prev.map(item => {
        if (selectedRowIds.includes(item.id)) {
          return {
            ...item,
            ...updatedData
          };
        }
        return item;
      }));

      toast.success(
        isRtl 
          ? `تم تحديث (${selectedRowIds.length}) صف بنجاح!` 
          : `Successfully updated (${selectedRowIds.length}) rows!`
      );

      setIsBulkEditModalOpen(false);
      setSelectedRowIds([]);
      setBulkEditForm({ po: '', sapExecutionNo: '' });
    } catch (err: any) {
      console.error("Bulk save error:", err);
      toast.error(isRtl ? 'فشل التحديث الجماعي' : 'Bulk update failed');
    }
  };

  // Parse raw rows into typed objects
  const processCsvData = (rows: any[], overridesMap: Record<string, any> = {}): FreshSupplyRecord[] => {
    const validRows = rows.filter(row => {
      // filter out completely blank rows
      return Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
    });

    // ==========================================
    // 1. ADVANCED SUPPLIER CLUSTERING & UNIFICATION
    // ==========================================
    const supplierUf = new UnionFind<string>();
    const uniqueRawSuppliers = Array.from(new Set(
      validRows
        .map(r => String(r['مركز التكلفة'] || '').trim())
        .filter(Boolean)
    ));



    // B) Link by exact normalized key (e.g. ignoring spacing, punctuation, word order, and letter variances)
    for (let i = 0; i < uniqueRawSuppliers.length; i++) {
      const rawA = uniqueRawSuppliers[i];
      const normKeyA = normalizeSupplierKey(rawA);

      for (let j = i + 1; j < uniqueRawSuppliers.length; j++) {
        const rawB = uniqueRawSuppliers[j];
        const normKeyB = normalizeSupplierKey(rawB);

        // Exact match of normalized words in any order
        if (normKeyA && normKeyA === normKeyB) {
          supplierUf.union(rawA, rawB);
        }
      }
    }

    // Build supplier cluster statistics
    interface SupplierClusterInfo {
      rawVariants: Map<string, number>;
      costCenterCodes: Set<string>;
    }
    const supplierClusters = new Map<string, SupplierClusterInfo>();

    validRows.forEach(row => {
      const raw = String(row['مركز التكلفة'] || '').trim();
      const code = String(row['كود مركز التكلفة'] || '').trim();
      if (!raw) return;

      const root = supplierUf.find(raw);
      if (!supplierClusters.has(root)) {
        supplierClusters.set(root, {
          rawVariants: new Map(),
          costCenterCodes: new Set()
        });
      }
      const cluster = supplierClusters.get(root)!;
      cluster.rawVariants.set(raw, (cluster.rawVariants.get(raw) || 0) + 1);
      if (code) {
        cluster.costCenterCodes.add(code);
      }
    });

    // Map each raw supplier to its canonical clean name and code
    const canonicalSupplierMap = new Map<string, { name: string; code: string }>();

    supplierClusters.forEach((cluster, root) => {
      let bestName = '';
      let bestScore = -1;

      cluster.rawVariants.forEach((count, rawName) => {
        const formatted = formatCleanSupplierName(rawName);
        const tokens = extractSupplierTokens(formatted);
        const score = (tokens.length * 100) + count;
        if (score > bestScore) {
          bestScore = score;
          bestName = formatted;
        }
      });

      const bestCode = Array.from(cluster.costCenterCodes)[0] || '';
      const result = { name: bestName || root, code: bestCode };

      cluster.rawVariants.forEach((_, rawName) => {
        canonicalSupplierMap.set(rawName, result);
      });
    });

    // ==========================================
    // 2. ITEM CODE UNIFICATION (ربط الصنف بالكود)
    // ==========================================
    // 2. UNIFIED ITEM NAME & CODE CANONICALIZATION
    // Group by SAP Code primarily (or unique Old Code) and pick the most frequent (common) name
    // ==========================================
    const isGenericOldCode = (code: string) => {
      const c = code.trim().toLowerCase();
      return !c || c === 'تانك' || c === 'برميل' || c === 'tank' || c === 'barrel' || c === 'بدون' || c === 'موقع';
    };

    // 1) Collect name frequencies and old codes per SAP Code
    interface SapItemAgg {
      names: Map<string, number>;
      oldCodes: Map<string, number>;
    }
    const sapMap = new Map<string, SapItemAgg>();
    const oldCodeMap = new Map<string, Map<string, number>>();

    validRows.forEach(row => {
      const sap = String(row['كود ساب'] || row['كود SAP'] || row['SAP'] || row['كود الصنف'] || row['كود'] || '').trim();
      const old = String(row['كود قديم'] || row['الكود القديم'] || '').trim();
      const rawItemName = String(row['اسم الصنف'] || row['الصنف'] || row['Item Name'] || row['الوصف'] || '').trim();

      if (sap) {
        if (!sapMap.has(sap)) {
          sapMap.set(sap, { names: new Map(), oldCodes: new Map() });
        }
        const agg = sapMap.get(sap)!;
        if (rawItemName) {
          agg.names.set(rawItemName, (agg.names.get(rawItemName) || 0) + 1);
        }
        if (old && !isGenericOldCode(old)) {
          agg.oldCodes.set(old, (agg.oldCodes.get(old) || 0) + 1);
        }
      } else if (old && !isGenericOldCode(old)) {
        if (!oldCodeMap.has(old)) {
          oldCodeMap.set(old, new Map());
        }
        const names = oldCodeMap.get(old)!;
        if (rawItemName) {
          names.set(rawItemName, (names.get(rawItemName) || 0) + 1);
        }
      }
    });

    // Helper to find the most frequent (common) name from a frequency map
    const getMostCommonName = (names: Map<string, number>, fallback: string = ''): string => {
      let bestName = fallback;
      let maxCount = -1;
      names.forEach((count, name) => {
        if (count > maxCount || (count === maxCount && name.length > bestName.length)) {
          maxCount = count;
          bestName = name;
        }
      });
      return bestName;
    };

    // 2) Build canonical maps for SAP codes and Old codes
    const canonicalBySap = new Map<string, { itemName: string; sapCode: string; oldCode: string }>();
    const canonicalByOld = new Map<string, { itemName: string; sapCode: string; oldCode: string }>();

    sapMap.forEach((agg, sap) => {
      const canonicalName = getMostCommonName(agg.names, '');
      let bestOld = '';
      let maxOldCount = -1;
      agg.oldCodes.forEach((count, code) => {
        if (count > maxOldCount) {
          maxOldCount = count;
          bestOld = code;
        }
      });

      const canonical = {
        itemName: canonicalName,
        sapCode: sap,
        oldCode: bestOld
      };
      canonicalBySap.set(sap, canonical);
      if (bestOld) {
        canonicalByOld.set(bestOld, canonical);
      }
    });

    // Handle any standalone old codes (without SAP code)
    oldCodeMap.forEach((names, old) => {
      if (!canonicalByOld.has(old)) {
        const canonicalName = getMostCommonName(names, '');
        canonicalByOld.set(old, {
          itemName: canonicalName,
          sapCode: '',
          oldCode: old
        });
      }
    });

    // ==========================================
    // 3. MAP INTO FINAL RECORD STRUCTURE
    // ==========================================
    const processedRecords = validRows.map((row, idx) => {
      const dateStr = String(row['التاريخ'] || '').trim();
      const parsedDate = parseFlexibleDate(dateStr);
      const unifiedDate = parsedDate ? formatUnifiedDate(parsedDate) : dateStr;
      const rawKg = String(row['اضافة'] || row['الكمية'] || '0').replace(/,/g, '').trim();
      const kg = parseFloat(rawKg) || 0;
      const tons = kg / 1000;

      const rawCostCenter = String(row['مركز التكلفة'] || '').trim();
      const rawCostCenterCode = String(row['كود مركز التكلفة'] || '').trim();
      const rawSapCode = String(row['كود ساب'] || row['كود SAP'] || row['SAP'] || row['كود الصنف'] || row['كود'] || '').trim();
      const rawOldCode = String(row['كود قديم'] || row['الكود القديم'] || '').trim();
      const rawItemName = String(row['اسم الصنف'] || row['الصنف'] || row['Item Name'] || row['الوصف'] || '').trim();

      // Resolve supplier identity
      let finalCostCenter = rawCostCenter;
      let finalCostCenterCode = rawCostCenterCode;
      if (rawCostCenter && canonicalSupplierMap.has(rawCostCenter)) {
        const supp = canonicalSupplierMap.get(rawCostCenter)!;
        finalCostCenter = supp.name;
        finalCostCenterCode = finalCostCenterCode || supp.code;
      }

      // Resolve unified item identity by code
      let finalItemName = rawItemName;
      let finalSapCode = rawSapCode;
      let finalOldCode = rawOldCode;

      if (rawSapCode && canonicalBySap.has(rawSapCode)) {
        const itemInfo = canonicalBySap.get(rawSapCode)!;
        if (itemInfo.itemName) {
          finalItemName = itemInfo.itemName;
        }
        finalOldCode = finalOldCode || itemInfo.oldCode;
      } else if (rawOldCode && !isGenericOldCode(rawOldCode) && canonicalByOld.has(rawOldCode)) {
        const itemInfo = canonicalByOld.get(rawOldCode)!;
        if (itemInfo.itemName) {
          finalItemName = itemInfo.itemName;
        }
        finalSapCode = finalSapCode || itemInfo.sapCode;
      }

      const rawMoveNo = String(row['رقم الحركة'] || '').trim();
      const fallbackId = `fresh-${idx}-${rawMoveNo || Math.random().toString(36).substr(2, 9)}`;

      // Check overrides by fallbackId (unique row ID) first, then movementNo
      const override = overridesMap[fallbackId] || (rawMoveNo && overridesMap[rawMoveNo]) || overridesMap[`fresh-${idx}`] || {};
      const finalPo = override.po !== undefined && override.po !== '' ? String(override.po) : String(row['PO'] || '').trim();
      const rawSapExecution = String(row['رقم تنفيذ الساب'] || row['تنفيذ الساب'] || row['SAP Execution'] || row['رقم التنفيذ'] || row['تنفيذ ساب'] || '').trim();
      const sapExecutionNo = override.sapExecutionNo !== undefined && override.sapExecutionNo !== '' 
        ? String(override.sapExecutionNo) 
        : rawSapExecution;
      const initialAnalysis = override.initialAnalysis !== undefined ? String(override.initialAnalysis) : '';
      const region = override.region !== undefined ? String(override.region) : '';
      const price = override.price !== undefined && override.price !== '' ? Number(override.price) : 0;
      const qualityDiscountPercent = override.qualityDiscountPercent !== undefined && override.qualityDiscountPercent !== '' 
        ? Number(override.qualityDiscountPercent) 
        : (Number(row['نسبة خصم الجودة'] || row['خصم الجودة'] || row['نسبة الخصم'] || 0) || 0);
      const paymentMethod = override.paymentMethod !== undefined ? String(override.paymentMethod) : '';
      const routing = override.routing !== undefined ? String(override.routing) : String(row['توجيه'] || row['التوجيه'] || '').trim();
      const notes = override.notes !== undefined ? String(override.notes) : '';
      const updatedAt = override.updatedAt;
      const updatedBy = override.updatedBy;

      return {
        id: fallbackId,
        date: unifiedDate,
        originalDate: dateStr,
        parsedDate: parsedDate,
        store: String(row['المخزن'] || '').trim(),
        movementType: String(row['نوع الحركة'] || '').trim(),
        movementNo: rawMoveNo,
        truckNo: String(row['رقم سيارة'] || '').trim(),
        driver: String(row['السائق'] || '').trim(),
        vendorDocNo: String(row['رقم مستند المورد'] || '').trim(),
        costCenterCode: finalCostCenterCode,
        po: finalPo,
        sapExecutionNo,
        initialAnalysis,
        region,
        price,
        qualityDiscountPercent,
        paymentMethod,
        routing,
        notes,
        updatedAt,
        updatedBy,
        reservation: String(row['RESERVATION'] || '').trim(),
        postDocument: String(row['POST DOCUMENT'] || '').trim(),
        oldCode: finalOldCode,
        sapCode: finalSapCode,
        itemName: finalItemName,
        originalItemName: rawItemName,
        unit: String(row['الوحدة'] || 'كيلو').trim(),
        costCenter: finalCostCenter,
        originalCostCenter: rawCostCenter,
        quantityKg: kg,
        quantityTons: tons,
        location: String(row['الموقع'] || '').trim(),
        tankNo: String(row['رقم التانك'] || '').trim(),
        raw: row
      };
    });

    // Default sort by date descending (Newest first, then oldest)
    return processedRecords.sort((a, b) => {
      const timeA = a.parsedDate ? a.parsedDate.getTime() : (parseFlexibleDate(a.date)?.getTime() || 0);
      const timeB = b.parsedDate ? b.parsedDate.getTime() : (parseFlexibleDate(b.date)?.getTime() || 0);
      if (timeB !== timeA) return timeB - timeA;
      const moveA = parseInt(String(a.movementNo).replace(/\D/g, ''), 10) || 0;
      const moveB = parseInt(String(b.movementNo).replace(/\D/g, ''), 10) || 0;
      return moveB - moveA;
    });
  };

  // Fetch from Google Sheet
  const fetchData = async (isManualSync = false) => {
    if (isManualSync) {
      setIsSyncing(true);
    } else {
      setLoading(true);
    }

    try {
      // 1. Fetch persistent overrides
      const overrides = await fetchOverrides();

      // Check cache first if initial load
      if (!isManualSync) {
        const cached = localStorage.getItem(STORAGE_CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setData(processCsvData(parsed, overrides));
              setLoading(false);
            }
          } catch (e) {
            console.error("Cache read error:", e);
          }
        }
      }

      // Live fetch with timestamp to prevent browser caching
      const fetchUrl = `${FRESH_GOOGLE_SHEET_CSV_URL}&_t=${Date.now()}`;
      const response = await fetch(fetchUrl, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const csvText = await response.text();

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const processed = processCsvData(results.data, overrides);
            setData(processed);
            localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(results.data));
            const nowFormatted = new Date().toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            setLastSynced(nowFormatted);
            localStorage.setItem(STORAGE_TIME_KEY, nowFormatted);

            if (isManualSync) {
              toast.success(
                isRtl 
                  ? `تم تحديث البيانات بنجاح (${processed.length} حركة توريد)`
                  : `Data synced successfully (${processed.length} movements)`
              );
            }
          } else {
            if (isManualSync) {
              toast.info(isRtl ? 'لم يتم العثور على بيانات في الملف' : 'No data found in sheet');
            }
          }
          setLoading(false);
          setIsSyncing(false);
        },
        error: (err: any) => {
          console.error("CSV Parse Error:", err);
          toast.error(isRtl ? 'حدث خطأ أثناء معالجة ملف البيانات' : 'Error parsing CSV data');
          setLoading(false);
          setIsSyncing(false);
        }
      });
    } catch (error: any) {
      console.error("Data Fetch Error:", error);
      toast.error(
        isRtl 
          ? 'تعذر الاتصال بملف جوجل شيت، تم عرض أحدث نسخة محفوظة' 
          : 'Failed to fetch from Google Sheet, cached data displayed'
      );
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, []);

  // Filter options (Smart & Dependent)
  const filterOptions = useMemo(() => {
    const dependentFiltered = (excludeKey: string) => {
      return data.filter(record => {
        if (excludeKey !== 'category' && mainCategoryFilter !== 'ALL') {
          const v = detectFreshVariety(record.itemName);
          const { isOlive, isPepper, isOther } = classifyItemCategory(record.itemName, v);
          if (mainCategoryFilter === 'OLIVES' && !isOlive) return false;
          if (mainCategoryFilter === 'PEPPER' && !isPepper) return false;
          if (mainCategoryFilter === 'OTHER' && !isOther) return false;
        }
        if (excludeKey !== 'item' && selectedItems.length > 0 && !selectedItems.includes(record.itemName)) {
          return false;
        }
        if (excludeKey !== 'supplier' && selectedSuppliers.length > 0 && !selectedSuppliers.includes(record.costCenter)) {
          return false;
        }
        if (excludeKey !== 'store' && selectedStores.length > 0 && !selectedStores.includes(record.store)) {
          return false;
        }
        if (excludeKey !== 'location' && selectedLocations.length > 0 && !selectedLocations.includes(record.location)) {
          return false;
        }
        return true;
      });
    };

    const itemsSet = new Set<string>();
    const varietiesSet = new Set<string>();
    dependentFiltered('item').forEach(r => {
      if (r.itemName) {
        itemsSet.add(r.itemName);
        varietiesSet.add(detectFreshVariety(r.itemName));
      }
    });

    const suppliersSet = new Set<string>();
    dependentFiltered('supplier').forEach(r => {
      if (r.costCenter) suppliersSet.add(r.costCenter);
    });

    const storesSet = new Set<string>();
    dependentFiltered('store').forEach(r => {
      if (r.store) storesSet.add(r.store);
    });

    const locationsSet = new Set<string>();
    dependentFiltered('location').forEach(r => {
      if (r.location) locationsSet.add(r.location);
    });

    const datesSet = new Set<string>();
    data.forEach(r => { if (r.date) datesSet.add(r.date); });

    // Sort unique dates descending (newest first)
    const sortedUniqueDates = Array.from(datesSet).sort((a, b) => {
      const da = parseFlexibleDate(a);
      const db = parseFlexibleDate(b);
      const timeA = da ? da.getTime() : 0;
      const timeB = db ? db.getTime() : 0;
      return timeB - timeA;
    });

    return {
      items: Array.from(itemsSet).sort(),
      varieties: Array.from(varietiesSet).map(v => ({ id: v, label: getFreshVarietyName(v, isRtl) })),
      suppliers: Array.from(suppliersSet).sort(),
      stores: Array.from(storesSet).sort(),
      locations: Array.from(locationsSet).sort(),
      dates: sortedUniqueDates
    };
  }, [data, mainCategoryFilter, selectedItems, selectedSuppliers, selectedStores, selectedLocations, isRtl]);

  // Filtered & Sorted Records
  const filteredData = useMemo(() => {
    return data.filter(record => {
      // 1. Search Query
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const match = 
          record.itemName.toLowerCase().includes(term) ||
          (record.originalItemName && record.originalItemName.toLowerCase().includes(term)) ||
          record.costCenter.toLowerCase().includes(term) ||
          (record.originalCostCenter && record.originalCostCenter.toLowerCase().includes(term)) ||
          record.costCenterCode.toLowerCase().includes(term) ||
          record.truckNo.toLowerCase().includes(term) ||
          record.driver.toLowerCase().includes(term) ||
          record.movementNo.toLowerCase().includes(term) ||
          record.po.toLowerCase().includes(term) ||
          (record.sapExecutionNo && record.sapExecutionNo.toLowerCase().includes(term)) ||
          (record.initialAnalysis && record.initialAnalysis.toLowerCase().includes(term)) ||
          (record.region && record.region.toLowerCase().includes(term)) ||
          (record.paymentMethod && record.paymentMethod.toLowerCase().includes(term)) ||
          record.postDocument.toLowerCase().includes(term) ||
          record.sapCode.toLowerCase().includes(term) ||
          record.oldCode.toLowerCase().includes(term) ||
          record.date.toLowerCase().includes(term) ||
          (record.originalDate && record.originalDate.toLowerCase().includes(term)) ||
          record.store.toLowerCase().includes(term) ||
          record.location.toLowerCase().includes(term);
        if (!match) return false;
      }

      // 2. Main Category Filter (Olives, Pepper, Other)
      if (mainCategoryFilter !== 'ALL') {
        const v = detectFreshVariety(record.itemName);
        const { isOlive, isPepper, isOther } = classifyItemCategory(record.itemName, v);

        if (mainCategoryFilter === 'OLIVES' && !isOlive) return false;
        if (mainCategoryFilter === 'PEPPER' && !isPepper) return false;
        if (mainCategoryFilter === 'OTHER' && !isOther) return false;
      }

      // Initial Analysis Filter (خالي مبيدات / مبيدات / عشوائي)
      if (analysisFilter !== 'ALL') {
        const analysis = (record.initialAnalysis || '').trim();
        if (analysisFilter === 'PESTICIDE_FREE' && !analysis.includes('خالي مبيدات')) return false;
        if (analysisFilter === 'PESTICIDES' && (!analysis.includes('مبيدات') || analysis.includes('خالي'))) return false;
        if (analysisFilter === 'RANDOM' && !analysis.includes('عشوائي')) return false;
        if (analysisFilter === 'NONE' && analysis !== '') return false;
      }

      // 3. Item Filter
      if (selectedItems.length > 0 && !selectedItems.includes(record.itemName)) {
        return false;
      }

      // 4. Supplier / Cost Center Filter
      if (selectedSuppliers.length > 0 && !selectedSuppliers.includes(record.costCenter)) {
        return false;
      }

      // 5. Store Filter
      if (selectedStores.length > 0 && !selectedStores.includes(record.store)) {
        return false;
      }

      // 6. Location / Package Filter
      if (selectedLocations.length > 0 && !selectedLocations.includes(record.location)) {
        return false;
      }

      // 7. Multi-Select Variety Filter
      if (selectedVarieties.length > 0) {
        const v = detectFreshVariety(record.itemName);
        if (!selectedVarieties.includes(v)) return false;
      }

      // 10. Date Filter
      if (dateFilter.mode !== 'all') {
        if (dateFilter.mode === 'single' && dateFilter.singleDate) {
          if (record.date === dateFilter.singleDate) return true;
          if (record.originalDate === dateFilter.singleDate) return true;
          const singleD = parseFlexibleDate(dateFilter.singleDate) || new Date(dateFilter.singleDate);
          if (record.parsedDate && !isNaN(singleD.getTime())) {
            if (
              record.parsedDate.getFullYear() === singleD.getFullYear() &&
              record.parsedDate.getMonth() === singleD.getMonth() &&
              record.parsedDate.getDate() === singleD.getDate()
            ) {
              return true;
            }
          }
          return false;
        }

        let startD: Date | null = null;
        let endD: Date | null = null;

        if (dateFilter.mode === 'range') {
          if (dateFilter.startDate) {
            startD = parseFlexibleDate(dateFilter.startDate) || new Date(dateFilter.startDate);
            if (!isNaN(startD.getTime())) startD.setHours(0, 0, 0, 0);
          }
          if (dateFilter.endDate) {
            endD = parseFlexibleDate(dateFilter.endDate) || new Date(dateFilter.endDate);
            if (!isNaN(endD.getTime())) endD.setHours(23, 59, 59, 999);
          }
        } else if (dateFilter.mode === 'preset' && dateFilter.presetKey) {
          const preset = getPresetDates(dateFilter.presetKey);
          if (preset.startDate) {
            startD = parseFlexibleDate(preset.startDate) || new Date(preset.startDate);
            if (!isNaN(startD.getTime())) startD.setHours(0, 0, 0, 0);
          }
          if (preset.endDate) {
            endD = parseFlexibleDate(preset.endDate) || new Date(preset.endDate);
            if (!isNaN(endD.getTime())) endD.setHours(23, 59, 59, 999);
          }
        }

        if (startD || endD) {
          if (!record.parsedDate) return false;
          if (startD && record.parsedDate < startD) return false;
          if (endD && record.parsedDate > endD) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Specialized sorting for Date
      if (sortField === 'date') {
        const timeA = a.parsedDate ? a.parsedDate.getTime() : (parseFlexibleDate(a.date)?.getTime() || 0);
        const timeB = b.parsedDate ? b.parsedDate.getTime() : (parseFlexibleDate(b.date)?.getTime() || 0);
        if (timeA !== timeB) {
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        }
        // Secondary sort on movementNo
        const moveA = parseInt(String(a.movementNo).replace(/\D/g, ''), 10) || 0;
        const moveB = parseInt(String(b.movementNo).replace(/\D/g, ''), 10) || 0;
        if (moveA !== moveB) {
          return sortOrder === 'asc' ? moveA - moveB : moveB - moveA;
        }
      }

      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortOrder === 'asc' ? aStr.localeCompare(bStr, 'ar') : bStr.localeCompare(aStr, 'ar');
    });
  }, [
    data, 
    searchTerm, 
    mainCategoryFilter,
    analysisFilter,
    selectedItems, 
    selectedSuppliers, 
    selectedStores, 
    selectedLocations, 
    selectedVarieties, 
    dateFilter, 
    sortField, 
    sortOrder
  ]);

  // Fixed Totals Independent of Filters (like OliveStock)
  const unmodifiedTotals = useMemo(() => {
    let totalIntake = 0;
    let totalManzanilla = 0;
    let totalPicual = 0;
    let totalKalamata = 0;
    let totalPepper = 0;
    let totalBarrels = 0;
    let totalTanks = 0;
    let totalAzizi = 0;
    let totalKobrosi = 0;

    data.forEach(r => {
      const qty = r.quantityKg;
      totalIntake += qty;

      const variety = detectFreshVariety(r.itemName);
      if (variety === 'Manzanilla') totalManzanilla += qty;
      else if (variety === 'Picual') totalPicual += qty;
      else if (variety === 'Kalamata') totalKalamata += qty;
      else if (variety === 'Pepper') totalPepper += qty;
      else if (variety === 'Azizi') totalAzizi += qty;
      else if (variety === 'Kobrosi') totalKobrosi += qty;

      const loc = (r.location || '').toLowerCase();
      if (loc.includes('تانك') || loc.includes('tank') || Boolean(r.tankNo)) {
        totalTanks += qty;
      } else {
        totalBarrels += qty;
      }
    });

    return {
      totalIntake,
      totalManzanilla,
      totalPicual,
      totalKalamata,
      totalPepper,
      totalBarrels,
      totalTanks,
      totalAzizi,
      totalKobrosi
    };
  }, [data]);

  // Baseline Comparison calculation (like OliveStock)
  const comparison = useMemo(() => {
    if (!savedSupplyMap || data.length === 0) {
      return { totalDiff: 0, hasChanges: false, details: [] };
    }

    const details: {
      key: string;
      description: string;
      oldQty: number;
      newQty: number;
      diff: number;
    }[] = [];
    let totalDiff = 0;

    const currentMap: Record<string, { descr: string; qty: number }> = {};
    data.forEach(r => {
      const key = r.sapCode || r.itemName || r.oldCode || 'item';
      if (!currentMap[key]) {
        currentMap[key] = { descr: r.itemName, qty: 0 };
      }
      currentMap[key].qty += r.quantityKg;
    });

    const checkedKeys = new Set<string>();

    Object.entries(currentMap).forEach(([key, item]) => {
      checkedKeys.add(key);
      const oldQty = savedSupplyMap[key] !== undefined ? savedSupplyMap[key] : 0;
      const newQty = item.qty;
      const diff = newQty - oldQty;

      if (Math.abs(diff) > 0.1) {
        details.push({
          key,
          description: item.descr,
          oldQty,
          newQty,
          diff
        });
        totalDiff += diff;
      }
    });

    Object.entries(savedSupplyMap).forEach(([key, oldQty]) => {
      if (!checkedKeys.has(key) && oldQty > 0.1) {
        details.push({
          key,
          description: key,
          oldQty,
          newQty: 0,
          diff: -oldQty
        });
        totalDiff += -oldQty;
      }
    });

    details.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    return {
      totalDiff,
      hasChanges: details.length > 0,
      details
    };
  }, [data, savedSupplyMap]);

  const handleAcceptNewSupplyBalance = () => {
    const map: Record<string, number> = {};
    data.forEach(r => {
      const key = r.sapCode || r.itemName || r.oldCode || 'item';
      map[key] = (map[key] || 0) + r.quantityKg;
    });
    localStorage.setItem('last_known_fresh_supply_map', JSON.stringify(map));
    setSavedSupplyMap(map);
    setIsComparisonModalOpen(false);
    toast.success(isRtl ? 'تم اعتماد رصيد التوريد الحالي كمرجع' : 'Current supply balance accepted as reference');
  };

  // Variety Chart Data (like OliveStock)
  const varietyChartData = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    filteredData.forEach(r => {
      const v = detectFreshVariety(r.itemName);
      map.set(v, (map.get(v) || 0) + r.quantityKg);
      total += r.quantityKg;
    });

    return Array.from(map.entries())
      .map(([id, value]) => ({
        id,
        name: getFreshVarietyName(id, isRtl),
        value,
        percentage: total > 0 ? (value / total) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData, isRtl]);

  // Supplier Chart Data (like OliveStock)
  const supplierChartData = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    filteredData.forEach(r => {
      const sup = r.costCenter || (isRtl ? 'غير محدد' : 'Unknown');
      map.set(sup, (map.get(sup) || 0) + r.quantityKg);
      total += r.quantityKg;
    });

    return Array.from(map.entries())
      .map(([id, value], idx) => ({
        id,
        name: id,
        value,
        color: CHART_COLORS[idx % CHART_COLORS.length],
        percentage: total > 0 ? (value / total) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData, isRtl]);

  // Storage / Packaging Chart Data (like OliveStock)
  const storageChartData = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    filteredData.forEach(r => {
      const loc = (r.location || '').toLowerCase();
      let key = isRtl ? 'براميل' : 'Barrels';
      if (loc.includes('تانك') || loc.includes('tank') || Boolean(r.tankNo)) {
        key = isRtl ? 'تانكات' : 'Tanks';
      } else if (r.store) {
        key = r.store;
      }
      map.set(key, (map.get(key) || 0) + r.quantityKg);
      total += r.quantityKg;
    });

    const colors = ['#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#3b82f6', '#ec4899'];
    return Array.from(map.entries())
      .map(([id, value], idx) => ({
        id,
        name: id,
        value,
        color: colors[idx % colors.length],
        percentage: total > 0 ? (value / total) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData, isRtl]);

  // Drill Down matching records (like OliveStock)
  const drillDownRecords = useMemo(() => {
    if (!drillDown) return [];
    return filteredData.filter(r => {
      if (drillDown.type === 'variety') {
        return detectFreshVariety(r.itemName) === drillDown.id;
      }
      if (drillDown.type === 'supplier') {
        return (r.costCenter || '') === drillDown.id;
      }
      if (drillDown.type === 'location') {
        const loc = (r.location || '').toLowerCase();
        const isTank = loc.includes('تانك') || loc.includes('tank') || Boolean(r.tankNo);
        if (drillDown.id.includes('تانك') || drillDown.id.toLowerCase().includes('tank')) return isTank;
        if (drillDown.id.includes('براميل') || drillDown.id.toLowerCase().includes('barrel')) return !isTank;
        return r.store === drillDown.id || r.location === drillDown.id;
      }
      if (drillDown.type === 'store') {
        return r.store === drillDown.id;
      }
      return true;
    });
  }, [filteredData, drillDown]);

  // Pivoted Matrix with Cross Tabs (like OliveStock)
  const pivotedSupplyMatrix = useMemo(() => {
    const itemMap = new Map<string, {
      code: string;
      sapCode: string;
      itemName: string;
      variety: string;
      totalKg: number;
      totalTons: number;
      suppliers: Record<string, number>;
      locations: Record<string, number>;
    }>();

    const allSuppliers = new Set<string>();
    const allLocations = new Set<string>();

    filteredData.forEach(r => {
      const code = r.sapCode || r.oldCode || r.itemName || 'unknown';
      const sup = r.costCenter || (isRtl ? 'غير محدد' : 'Unknown');
      const loc = r.location || r.store || (isRtl ? 'غير محدد' : 'Unknown');

      allSuppliers.add(sup);
      allLocations.add(loc);

      if (!itemMap.has(code)) {
        itemMap.set(code, {
          code,
          sapCode: r.sapCode,
          itemName: r.itemName,
          variety: detectFreshVariety(r.itemName),
          totalKg: 0,
          totalTons: 0,
          suppliers: {},
          locations: {}
        });
      }

      const entry = itemMap.get(code)!;
      entry.totalKg += r.quantityKg;
      entry.totalTons += r.quantityTons;
      entry.suppliers[sup] = (entry.suppliers[sup] || 0) + r.quantityKg;
      entry.locations[loc] = (entry.locations[loc] || 0) + r.quantityKg;
    });

    return {
      items: Array.from(itemMap.values()).sort((a, b) => b.totalKg - a.totalKg),
      suppliers: Array.from(allSuppliers).sort(),
      locations: Array.from(allLocations).sort()
    };
  }, [filteredData, isRtl]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalKg = filteredData.reduce((acc, r) => acc + r.quantityKg, 0);
    const totalTons = totalKg / 1000;
    const movementCount = filteredData.length;
    
    const uniqueItems = new Set(filteredData.map(r => r.itemName).filter(Boolean)).size;
    const uniqueSuppliers = new Set(filteredData.map(r => r.costCenter).filter(Boolean)).size;
    const uniqueTrucks = new Set(filteredData.map(r => r.truckNo).filter(Boolean)).size;
    const uniqueDrivers = new Set(filteredData.map(r => r.driver).filter(Boolean)).size;

    // Location breakdown
    const barrelKg = filteredData
      .filter(r => r.location.includes('برميل'))
      .reduce((acc, r) => acc + r.quantityKg, 0);
    const tankKg = filteredData
      .filter(r => r.location.includes('تانك'))
      .reduce((acc, r) => acc + r.quantityKg, 0);

    return {
      totalKg,
      totalTons,
      movementCount,
      uniqueItems,
      uniqueSuppliers,
      uniqueTrucks,
      uniqueDrivers,
      barrelKg,
      barrelTons: barrelKg / 1000,
      tankKg,
      tankTons: tankKg / 1000
    };
  }, [filteredData]);

  // Enhanced Grouping by Item with Variety, Packaging Breakdown & Top Supplier
  const itemsSummary = useMemo(() => {
    const map = new Map<string, {
      itemName: string;
      sapCode: string;
      oldCode: string;
      unit: string;
      variety: string;
      varietyName: string;
      varietyColor: string;
      totalKg: number;
      totalTons: number;
      count: number;
      suppliers: Set<string>;
      suppliersMap: Map<string, number>;
      topSupplier: string;
      locations: Set<string>;
      tankKg: number;
      tankTons: number;
      barrelKg: number;
      barrelTons: number;
      stores: Set<string>;
    }>();

    filteredData.forEach(r => {
      const key = r.itemName || 'غير محدد';
      if (!map.has(key)) {
        const v = detectFreshVariety(key);
        map.set(key, {
          itemName: key,
          sapCode: r.sapCode,
          oldCode: r.oldCode,
          unit: r.unit || 'كيلو',
          variety: v,
          varietyName: getFreshVarietyName(v, isRtl),
          varietyColor: VARIETY_COLORS[v] || '#10b981',
          totalKg: 0,
          totalTons: 0,
          count: 0,
          suppliers: new Set(),
          suppliersMap: new Map(),
          topSupplier: '',
          locations: new Set(),
          tankKg: 0,
          tankTons: 0,
          barrelKg: 0,
          barrelTons: 0,
          stores: new Set()
        });
      }
      const item = map.get(key)!;
      item.totalKg += r.quantityKg;
      item.totalTons += r.quantityTons;
      item.count += 1;
      if (r.sapCode && !item.sapCode) item.sapCode = r.sapCode;
      if (r.oldCode && !item.oldCode) item.oldCode = r.oldCode;
      if (r.costCenter) {
        item.suppliers.add(r.costCenter);
        item.suppliersMap.set(r.costCenter, (item.suppliersMap.get(r.costCenter) || 0) + r.quantityKg);
      }
      if (r.location) item.locations.add(r.location);
      if (r.store) item.stores.add(r.store);

      const locStr = (r.location || '').toLowerCase();
      const isTank = locStr.includes('تانك') || locStr.includes('tank') || Boolean(r.tankNo);
      if (isTank) {
        item.tankKg += r.quantityKg;
        item.tankTons += r.quantityTons;
      } else {
        item.barrelKg += r.quantityKg;
        item.barrelTons += r.quantityTons;
      }
    });

    return Array.from(map.values()).map(item => {
      let topSup = '-';
      let maxKg = 0;
      item.suppliersMap.forEach((kg, sup) => {
        if (kg > maxKg) {
          maxKg = kg;
          topSup = sup;
        }
      });
      return {
        ...item,
        topSupplier: topSup
      };
    }).sort((a, b) => b.totalKg - a.totalKg);
  }, [filteredData, isRtl]);

  // Enhanced Grouping by Supplier / Cost Center
  const suppliersSummary = useMemo(() => {
    const map = new Map<string, {
      costCenter: string;
      costCenterCode: string;
      totalKg: number;
      totalTons: number;
      count: number;
      items: Set<string>;
      itemsMap: Map<string, number>;
      topItem: string;
      trucks: Set<string>;
      drivers: Set<string>;
      tankKg: number;
      tankTons: number;
      barrelKg: number;
      barrelTons: number;
      dates: Set<string>;
    }>();

    filteredData.forEach(r => {
      const key = r.costCenter || 'غير محدد';
      if (!map.has(key)) {
        map.set(key, {
          costCenter: key,
          costCenterCode: r.costCenterCode,
          totalKg: 0,
          totalTons: 0,
          count: 0,
          items: new Set(),
          itemsMap: new Map(),
          topItem: '',
          trucks: new Set(),
          drivers: new Set(),
          tankKg: 0,
          tankTons: 0,
          barrelKg: 0,
          barrelTons: 0,
          dates: new Set()
        });
      }
      const sup = map.get(key)!;
      sup.totalKg += r.quantityKg;
      sup.totalTons += r.quantityTons;
      sup.count += 1;
      if (r.costCenterCode && !sup.costCenterCode) sup.costCenterCode = r.costCenterCode;
      if (r.itemName) {
        sup.items.add(r.itemName);
        sup.itemsMap.set(r.itemName, (sup.itemsMap.get(r.itemName) || 0) + r.quantityKg);
      }
      if (r.truckNo) sup.trucks.add(r.truckNo);
      if (r.driver) sup.drivers.add(r.driver);
      if (r.date) sup.dates.add(r.date);

      const locStr = (r.location || '').toLowerCase();
      const isTank = locStr.includes('تانك') || locStr.includes('tank') || Boolean(r.tankNo);
      if (isTank) {
        sup.tankKg += r.quantityKg;
        sup.tankTons += r.quantityTons;
      } else {
        sup.barrelKg += r.quantityKg;
        sup.barrelTons += r.quantityTons;
      }
    });

    return Array.from(map.values()).map(sup => {
      let topItm = '-';
      let maxKg = 0;
      sup.itemsMap.forEach((kg, itm) => {
        if (kg > maxKg) {
          maxKg = kg;
          topItm = itm;
        }
      });
      return {
        ...sup,
        topItem: topItm,
        avgShipmentTons: sup.count > 0 ? sup.totalTons / sup.count : 0
      };
    }).sort((a, b) => b.totalKg - a.totalKg);
  }, [filteredData]);

  // Enhanced Grouping by Store / Warehouse
  const storesSummary = useMemo(() => {
    const map = new Map<string, {
      storeName: string;
      totalKg: number;
      totalTons: number;
      count: number;
      items: Set<string>;
      itemsMap: Map<string, number>;
      suppliers: Set<string>;
      tankKg: number;
      tankTons: number;
      barrelKg: number;
      barrelTons: number;
    }>();

    filteredData.forEach(r => {
      const key = r.store || (isRtl ? 'مخزن غير محدد' : 'Unspecified Store');
      if (!map.has(key)) {
        map.set(key, {
          storeName: key,
          totalKg: 0,
          totalTons: 0,
          count: 0,
          items: new Set(),
          itemsMap: new Map(),
          suppliers: new Set(),
          tankKg: 0,
          tankTons: 0,
          barrelKg: 0,
          barrelTons: 0
        });
      }
      const st = map.get(key)!;
      st.totalKg += r.quantityKg;
      st.totalTons += r.quantityTons;
      st.count += 1;
      if (r.itemName) {
        st.items.add(r.itemName);
        st.itemsMap.set(r.itemName, (st.itemsMap.get(r.itemName) || 0) + r.quantityKg);
      }
      if (r.costCenter) st.suppliers.add(r.costCenter);

      const locStr = (r.location || '').toLowerCase();
      const isTank = locStr.includes('تانك') || locStr.includes('tank') || Boolean(r.tankNo);
      if (isTank) {
        st.tankKg += r.quantityKg;
        st.tankTons += r.quantityTons;
      } else {
        st.barrelKg += r.quantityKg;
        st.barrelTons += r.quantityTons;
      }
    });

    return Array.from(map.values()).map(st => ({
      ...st,
      itemsCount: st.items.size,
      suppliersCount: st.suppliers.size
    })).sort((a, b) => b.totalKg - a.totalKg);
  }, [filteredData, isRtl]);

  // 1. Items Pie / Donut Chart Data (Top 6 + Others)
  const itemsPieChartData = useMemo(() => {
    if (!itemsSummary.length) return [];
    const totalTons = stats.totalTons || 1;
    const topItems = itemsSummary.slice(0, 6);
    const otherItems = itemsSummary.slice(6);
    
    const result = topItems.map((item, idx) => ({
      name: item.itemName,
      tons: parseFloat(item.totalTons.toFixed(2)),
      kg: item.totalKg,
      percent: parseFloat(((item.totalTons / totalTons) * 100).toFixed(1)),
      color: CHART_COLORS[idx % CHART_COLORS.length],
      count: item.count
    }));

    if (otherItems.length > 0) {
      const otherTons = otherItems.reduce((acc, i) => acc + i.totalTons, 0);
      const otherKg = otherItems.reduce((acc, i) => acc + i.totalKg, 0);
      result.push({
        name: isRtl ? `باقي الأصناف (${otherItems.length})` : `Other Items (${otherItems.length})`,
        tons: parseFloat(otherTons.toFixed(2)),
        kg: otherKg,
        percent: parseFloat(((otherTons / totalTons) * 100).toFixed(1)),
        color: '#94a3b8',
        count: otherItems.reduce((acc, i) => acc + i.count, 0)
      });
    }

    return result;
  }, [itemsSummary, stats.totalTons, isRtl]);

  // 2. Items Variety Donut Chart Data (Manzanilla, Picual, Kalamata, etc.)
  const itemsVarietyPieData = useMemo(() => {
    const totalTons = stats.totalTons || 1;
    const map = new Map<string, { tons: number; kg: number; count: number }>();
    itemsSummary.forEach(item => {
      const v = item.variety;
      if (!map.has(v)) {
        map.set(v, { tons: 0, kg: 0, count: 0 });
      }
      const entry = map.get(v)!;
      entry.tons += item.totalTons;
      entry.kg += item.totalKg;
      entry.count += item.count;
    });

    return Array.from(map.entries())
      .map(([variety, data]) => ({
        id: variety,
        name: getFreshVarietyName(variety, isRtl),
        tons: parseFloat(data.tons.toFixed(2)),
        kg: data.kg,
        percent: parseFloat(((data.tons / totalTons) * 100).toFixed(1)),
        color: VARIETY_COLORS[variety] || '#10b981',
        count: data.count
      }))
      .sort((a, b) => b.tons - a.tons);
  }, [itemsSummary, stats.totalTons, isRtl]);

  // 3. Suppliers Pie / Donut Chart Data (Top 7 + Others)
  const suppliersPieChartData = useMemo(() => {
    if (!suppliersSummary.length) return [];
    const totalTons = stats.totalTons || 1;
    const topSuppliers = suppliersSummary.slice(0, 7);
    const otherSuppliers = suppliersSummary.slice(7);

    const result = topSuppliers.map((sup, idx) => ({
      name: sup.costCenter,
      code: sup.costCenterCode,
      tons: parseFloat(sup.totalTons.toFixed(2)),
      kg: sup.totalKg,
      percent: parseFloat(((sup.totalTons / totalTons) * 100).toFixed(1)),
      color: CHART_COLORS[idx % CHART_COLORS.length],
      count: sup.count
    }));

    if (otherSuppliers.length > 0) {
      const otherTons = otherSuppliers.reduce((acc, s) => acc + s.totalTons, 0);
      const otherKg = otherSuppliers.reduce((acc, s) => acc + s.totalKg, 0);
      result.push({
        name: isRtl ? `باقي الموردين (${otherSuppliers.length})` : `Other Suppliers (${otherSuppliers.length})`,
        code: '-',
        tons: parseFloat(otherTons.toFixed(2)),
        kg: otherKg,
        percent: parseFloat(((otherTons / totalTons) * 100).toFixed(1)),
        color: '#94a3b8',
        count: otherSuppliers.reduce((acc, s) => acc + s.count, 0)
      });
    }

    return result;
  }, [suppliersSummary, stats.totalTons, isRtl]);

  // Filtered & Sorted Items Summary
  const filteredSortedItems = useMemo(() => {
    let result = [...itemsSummary];
    if (itemsSummarySearch.trim()) {
      const q = itemsSummarySearch.toLowerCase().trim();
      result = result.filter(item => 
        item.itemName.toLowerCase().includes(q) ||
        item.sapCode.toLowerCase().includes(q) ||
        item.oldCode.toLowerCase().includes(q) ||
        item.varietyName.toLowerCase().includes(q) ||
        item.topSupplier.toLowerCase().includes(q)
      );
    }
    switch (itemsSummarySort) {
      case 'tons_desc':
        result.sort((a, b) => b.totalKg - a.totalKg);
        break;
      case 'tons_asc':
        result.sort((a, b) => a.totalKg - b.totalKg);
        break;
      case 'movements_desc':
        result.sort((a, b) => b.count - a.count);
        break;
      case 'name_asc':
        result.sort((a, b) => a.itemName.localeCompare(b.itemName, 'ar'));
        break;
    }
    return result;
  }, [itemsSummary, itemsSummarySearch, itemsSummarySort]);

  // Filtered & Sorted Suppliers Summary
  const filteredSortedSuppliers = useMemo(() => {
    let result = [...suppliersSummary];
    if (suppliersSummarySearch.trim()) {
      const q = suppliersSummarySearch.toLowerCase().trim();
      result = result.filter(sup => 
        sup.costCenter.toLowerCase().includes(q) ||
        sup.costCenterCode.toLowerCase().includes(q) ||
        sup.topItem.toLowerCase().includes(q)
      );
    }
    switch (suppliersSummarySort) {
      case 'tons_desc':
        result.sort((a, b) => b.totalKg - a.totalKg);
        break;
      case 'tons_asc':
        result.sort((a, b) => a.totalKg - b.totalKg);
        break;
      case 'movements_desc':
        result.sort((a, b) => b.count - a.count);
        break;
      case 'name_asc':
        result.sort((a, b) => a.costCenter.localeCompare(b.costCenter, 'ar'));
        break;
    }
    return result;
  }, [suppliersSummary, suppliersSummarySearch, suppliersSummarySort]);

  // Daily Timeline for Chart
  const dailySummary = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach(r => {
      const key = r.date || 'بدون تاريخ';
      map.set(key, (map.get(key) || 0) + r.quantityKg);
    });
    return Array.from(map.entries()).map(([date, kg]) => ({
      date,
      kg,
      tons: parseFloat((kg / 1000).toFixed(2))
    }));
  }, [filteredData]);

  // Report 1: Logistics & Fleet Summary (Trucks & Drivers)
  const logisticsSummary = useMemo(() => {
    const map = new Map<string, {
      truckNo: string;
      drivers: Set<string>;
      totalKg: number;
      totalTons: number;
      count: number;
      items: Set<string>;
      suppliers: Set<string>;
      dates: Set<string>;
    }>();

    filteredData.forEach(r => {
      const key = r.truckNo || (isRtl ? 'بدون رقم سيارة' : 'No Truck No');
      if (!map.has(key)) {
        map.set(key, {
          truckNo: key,
          drivers: new Set(),
          totalKg: 0,
          totalTons: 0,
          count: 0,
          items: new Set(),
          suppliers: new Set(),
          dates: new Set()
        });
      }
      const item = map.get(key)!;
      item.totalKg += r.quantityKg;
      item.totalTons += r.quantityTons;
      item.count += 1;
      if (r.driver) item.drivers.add(r.driver);
      if (r.itemName) item.items.add(r.itemName);
      if (r.costCenter) item.suppliers.add(r.costCenter);
      if (r.date) item.dates.add(r.date);
    });

    return Array.from(map.values())
      .map(t => ({
        ...t,
        avgLoadTons: t.count > 0 ? t.totalTons / t.count : 0
      }))
      .sort((a, b) => b.totalKg - a.totalKg);
  }, [filteredData, isRtl]);

  // Report 2: Packaging & Tanks vs Barrels Breakdown
  const packagingSummary = useMemo(() => {
    const barrels = {
      name: isRtl ? 'براميل' : 'Barrels',
      totalKg: 0,
      totalTons: 0,
      count: 0,
      items: new Set<string>(),
      suppliers: new Set<string>()
    };
    const tanks = {
      name: isRtl ? 'تانكات' : 'Tanks',
      totalKg: 0,
      totalTons: 0,
      count: 0,
      items: new Set<string>(),
      suppliers: new Set<string>()
    };
    const tanksMap = new Map<string, {
      tankNo: string;
      itemName: string;
      totalKg: number;
      totalTons: number;
      count: number;
      dates: Set<string>;
      suppliers: Set<string>;
    }>();

    filteredData.forEach(r => {
      const locStr = (r.location || '').toLowerCase();
      const isTank = locStr.includes('تانك') || locStr.includes('tank') || Boolean(r.tankNo);
      
      if (isTank) {
        tanks.totalKg += r.quantityKg;
        tanks.totalTons += r.quantityTons;
        tanks.count += 1;
        if (r.itemName) tanks.items.add(r.itemName);
        if (r.costCenter) tanks.suppliers.add(r.costCenter);

        const tNo = r.tankNo || (r.location?.replace(/[^0-9]/g, '') || (isRtl ? 'تانك غير محدد' : 'Unspecified Tank'));
        if (!tanksMap.has(tNo)) {
          tanksMap.set(tNo, {
            tankNo: tNo,
            itemName: r.itemName,
            totalKg: 0,
            totalTons: 0,
            count: 0,
            dates: new Set(),
            suppliers: new Set()
          });
        }
        const t = tanksMap.get(tNo)!;
        t.totalKg += r.quantityKg;
        t.totalTons += r.quantityTons;
        t.count += 1;
        if (r.date) t.dates.add(r.date);
        if (r.costCenter) t.suppliers.add(r.costCenter);
        if (!t.itemName && r.itemName) t.itemName = r.itemName;
      } else {
        barrels.totalKg += r.quantityKg;
        barrels.totalTons += r.quantityTons;
        barrels.count += 1;
        if (r.itemName) barrels.items.add(r.itemName);
        if (r.costCenter) barrels.suppliers.add(r.costCenter);
      }
    });

    return {
      barrels,
      tanks,
      tanksList: Array.from(tanksMap.values()).sort((a, b) => b.totalKg - a.totalKg)
    };
  }, [filteredData, isRtl]);

  // Report 3: Cross-Tab Matrix (Items x Suppliers)
  const matrixData = useMemo(() => {
    const items = itemsSummary.map(i => i.itemName);
    const suppliers = suppliersSummary.map(s => s.costCenter);
    const cellMap = new Map<string, number>();

    filteredData.forEach(r => {
      const iKey = r.itemName || (isRtl ? 'غير محدد' : 'Unknown');
      const sKey = r.costCenter || (isRtl ? 'غير محدد' : 'Unknown');
      const key = `${iKey}:::${sKey}`;
      cellMap.set(key, (cellMap.get(key) || 0) + r.quantityKg);
    });

    return {
      items,
      suppliers,
      getKg: (item: string, sup: string) => cellMap.get(`${item}:::${sup}`) || 0,
      getTons: (item: string, sup: string) => (cellMap.get(`${item}:::${sup}`) || 0) / 1000
    };
  }, [filteredData, itemsSummary, suppliersSummary, isRtl]);

  // Report 4: Detailed Daily Timeline & Velocity
  const dailyTimelineDetailed = useMemo(() => {
    const map = new Map<string, {
      date: string;
      parsedDate: Date | null;
      totalKg: number;
      totalTons: number;
      count: number;
      suppliers: Set<string>;
      trucks: Set<string>;
      itemsMap: Map<string, number>;
    }>();

    filteredData.forEach(r => {
      const key = r.date || (isRtl ? 'بدون تاريخ' : 'No Date');
      if (!map.has(key)) {
        map.set(key, {
          date: key,
          parsedDate: r.parsedDate,
          totalKg: 0,
          totalTons: 0,
          count: 0,
          suppliers: new Set(),
          trucks: new Set(),
          itemsMap: new Map()
        });
      }
      const d = map.get(key)!;
      d.totalKg += r.quantityKg;
      d.totalTons += r.quantityTons;
      d.count += 1;
      if (r.costCenter) d.suppliers.add(r.costCenter);
      if (r.truckNo) d.trucks.add(r.truckNo);
      if (r.itemName) {
        d.itemsMap.set(r.itemName, (d.itemsMap.get(r.itemName) || 0) + r.quantityKg);
      }
    });

    let runningCumulativeKg = 0;
    return Array.from(map.values()).map(d => {
      runningCumulativeKg += d.totalKg;
      let topItemName = '-';
      let topItemKg = 0;
      d.itemsMap.forEach((kg, name) => {
        if (kg > topItemKg) {
          topItemKg = kg;
          topItemName = name;
        }
      });

      return {
        ...d,
        cumulativeKg: runningCumulativeKg,
        cumulativeTons: runningCumulativeKg / 1000,
        topItem: topItemName,
        topItemTons: topItemKg / 1000
      };
    });
  }, [filteredData, isRtl]);

  // Report 5: PO & SAP Code Reconciliation
  const poReconciliation = useMemo(() => {
    const map = new Map<string, {
      po: string;
      sapCodes: Set<string>;
      items: Set<string>;
      suppliers: Set<string>;
      totalKg: number;
      totalTons: number;
      count: number;
      postDocuments: Set<string>;
      reservations: Set<string>;
    }>();

    filteredData.forEach(r => {
      const key = r.po || (isRtl ? 'بدون PO' : 'No PO');
      if (!map.has(key)) {
        map.set(key, {
          po: key,
          sapCodes: new Set(),
          items: new Set(),
          suppliers: new Set(),
          totalKg: 0,
          totalTons: 0,
          count: 0,
          postDocuments: new Set(),
          reservations: new Set()
        });
      }
      const p = map.get(key)!;
      p.totalKg += r.quantityKg;
      p.totalTons += r.quantityTons;
      p.count += 1;
      if (r.sapCode) p.sapCodes.add(r.sapCode);
      if (r.itemName) p.items.add(r.itemName);
      if (r.costCenter) p.suppliers.add(r.costCenter);
      if (r.postDocument) p.postDocuments.add(r.postDocument);
      if (r.reservation) p.reservations.add(r.reservation);
    });

    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
  }, [filteredData, isRtl]);

  // Table scroll helpers
  const scrollToTop = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ top: tableContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  // Sort handler
  const handleSort = (field: keyof FreshSupplyRecord) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setMainCategoryFilter('ALL');
    setAnalysisFilter('ALL');
    setSelectedItems([]);
    setSelectedSuppliers([]);
    setSelectedStores([]);
    setSelectedLocations([]);
    setSelectedVarieties([]);
    setDateFilter({ mode: 'all' });
    toast.info(isRtl ? 'تمت إعادة ضبط جميع الفلاتر' : 'All filters reset');
  };

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const dataBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<any>(worksheet);

      if (!rows || rows.length === 0) {
        toast.error(isRtl ? 'ملف الإكسيل فارغ أو غير صالح' : 'Excel file is empty or invalid');
        setIsImporting(false);
        return;
      }

      const cachedStr = localStorage.getItem(STORAGE_OVERRIDES_KEY);
      const cachedMap = cachedStr ? JSON.parse(cachedStr) : {};
      let updatedCount = 0;

      rows.forEach((row, idx) => {
        const moveNo = String(row['رقم الحركة'] || '').trim();
        const rowIdx = idx;
        
        const matchedRecord = data.find(r => 
          (moveNo && r.movementNo === moveNo) || 
          (`fresh-${rowIdx}` === r.id) ||
          (r.itemName === row['اسم الصنف'] && r.date === row['التاريخ'] && r.quantityKg === Number(row['الكمية (كجم)']))
        );

        if (matchedRecord) {
          const overrideKey = matchedRecord.id;
          
          const po = row['أمر الشراء PO'] !== undefined ? String(row['أمر الشراء PO']).trim() : matchedRecord.po;
          const sapExecutionNo = row['رقم تنفيذ الساب'] !== undefined ? String(row['رقم تنفيذ الساب']).trim() : matchedRecord.sapExecutionNo;
          const region = row['المنطقة / المزرعة'] !== undefined ? String(row['المنطقة / المزرعة']).trim() : matchedRecord.region;
          const initialAnalysis = row['التحليل الأولي'] !== undefined ? String(row['التحليل الأولي']).trim() : matchedRecord.initialAnalysis;
          
          const rawPrice = row['السعر الأساسي (ج.م/كجم)'];
          const price = rawPrice !== undefined && rawPrice !== '-' && rawPrice !== '' ? Number(rawPrice) || 0 : matchedRecord.price;
          
          const rawDiscount = row['نسبة خصم الجودة %'];
          let qualityDiscountPercent = matchedRecord.qualityDiscountPercent;
          if (rawDiscount !== undefined && rawDiscount !== '-' && rawDiscount !== '') {
            const discStr = String(rawDiscount).replace('%', '').trim();
            qualityDiscountPercent = Number(discStr) || 0;
          }

          const paymentMethod = row['طريقة السداد'] !== undefined && row['طريقة السداد'] !== '-' ? String(row['طريقة السداد']).trim() : matchedRecord.paymentMethod;
          const routing = row['التوجيه'] !== undefined && row['التوجيه'] !== '-' ? String(row['التوجيه']).trim() : matchedRecord.routing;
          const notes = row['ملاحظات'] !== undefined && row['ملاحظات'] !== '-' ? String(row['ملاحظات']).trim() : matchedRecord.notes;

          const updatedData = {
            po,
            sapExecutionNo,
            region,
            initialAnalysis,
            price,
            qualityDiscountPercent,
            paymentMethod,
            routing,
            notes,
            updatedAt: new Date().toISOString(),
            updatedBy: user?.displayName || user?.username || (isRtl ? 'مستخدم النظام' : 'System User')
          };

          cachedMap[overrideKey] = {
            id: overrideKey,
            movementNo: matchedRecord.movementNo || '',
            ...updatedData
          };

          setDoc(doc(db, COLLECTIONS.FRESH_SUPPLY_OVERRIDES, overrideKey), {
            id: overrideKey,
            movementNo: matchedRecord.movementNo || '',
            ...updatedData
          }, { merge: true }).catch(err => console.warn("Firestore import save warning:", err));

          updatedCount++;
        }
      });

      localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(cachedMap));

      setData(prev => prev.map(item => {
        const ov = cachedMap[item.id] || (item.movementNo && cachedMap[item.movementNo]);
        if (ov) {
          return {
            ...item,
            po: ov.po !== undefined ? ov.po : item.po,
            sapExecutionNo: ov.sapExecutionNo !== undefined ? ov.sapExecutionNo : item.sapExecutionNo,
            region: ov.region !== undefined ? ov.region : item.region,
            initialAnalysis: ov.initialAnalysis !== undefined ? ov.initialAnalysis : item.initialAnalysis,
            price: ov.price !== undefined ? ov.price : item.price,
            qualityDiscountPercent: ov.qualityDiscountPercent !== undefined ? ov.qualityDiscountPercent : item.qualityDiscountPercent,
            paymentMethod: ov.paymentMethod !== undefined ? ov.paymentMethod : item.paymentMethod,
            routing: ov.routing !== undefined ? ov.routing : item.routing,
            notes: ov.notes !== undefined ? ov.notes : item.notes,
          };
        }
        return item;
      }));

      toast.success(
        isRtl 
          ? `تم استيراد وتحديث (${updatedCount}) سجل بنجاح من شيت الإكسيل!` 
          : `Successfully imported and updated (${updatedCount}) records from Excel!`
      );
    } catch (err: any) {
      console.error("Excel Import Error:", err);
      toast.error(isRtl ? 'فشل استيراد ملف الإكسيل. تأكد من صحة تنسيق الملف.' : 'Failed to import Excel file. Please check format.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      let grandTotalValue = 0;

      const exportRows = filteredData.map((r, idx) => {
        const basePrice = r.price && r.price > 0 ? r.price : 0;
        const discountPct = r.qualityDiscountPercent && r.qualityDiscountPercent > 0 ? r.qualityDiscountPercent : 0;
        const netPrice = basePrice > 0 ? (discountPct > 0 ? basePrice * (1 - discountPct / 100) : basePrice) : 0;
        const totalValue = netPrice > 0 ? netPrice * r.quantityKg : 0;
        if (totalValue > 0) {
          grandTotalValue += totalValue;
        }

        return {
          'م': idx + 1,
          'التاريخ': r.date,
          'رقم الحركة': r.movementNo || '-',
          'اسم الصنف': r.itemName,
          'كود ساب': r.sapCode || '-',
          'كود قديم': r.oldCode || '-',
          'الكمية (كجم)': r.quantityKg,
          'الكمية (طن)': parseFloat(r.quantityTons.toFixed(3)),
          'الوحدة': r.unit || 'كجم',
          'المورد / مركز التكلفة': r.costCenter || '-',
          'كود مركز التكلفة': r.costCenterCode || '-',
          'رقم سيارة': r.truckNo || '-',
          'السائق': r.driver || '-',
          'الموقع / التعبئة': r.location || '-',
          'رقم التانك': r.tankNo || '-',
          'أمر الشراء PO': r.po || '-',
          'رقم تنفيذ الساب': r.sapExecutionNo || '-',
          'المنطقة / المزرعة': r.region || '-',
          'التحليل الأولي': r.initialAnalysis || '-',
          'السعر الأساسي (ج.م/كجم)': basePrice > 0 ? basePrice : '-',
          'نسبة خصم الجودة %': discountPct > 0 ? `${discountPct}%` : '0%',
          'صافي السعر بعد الخصم (ج.م/كجم)': netPrice > 0 ? parseFloat(netPrice.toFixed(2)) : '-',
          'إجمالي القيمة المستحقة (ج.م)': totalValue > 0 ? parseFloat(totalValue.toFixed(2)) : '-',
          'طريقة السداد': r.paymentMethod || '-',
          'المخزن': r.store || 'GPS',
          'POST DOCUMENT': r.postDocument || '-',
          'RESERVATION': r.reservation || '-',
          'رقم مستند المورد': r.vendorDocNo || '-',
          'ملاحظات': r.notes || '-'
        };
      });

      // Add summary row
      exportRows.push({
        'م': 'الإجمالي' as any,
        'التاريخ': '',
        'رقم الحركة': '',
        'اسم الصنف': `عدد الأصناف: ${stats.uniqueItems}`,
        'كود ساب': '',
        'كود قديم': '',
        'الكمية (كجم)': stats.totalKg,
        'الكمية (طن)': parseFloat(stats.totalTons.toFixed(3)),
        'الوحدة': 'كجم',
        'المورد / مركز التكلفة': `عدد الموردين: ${stats.uniqueSuppliers}`,
        'كود مركز التكلفة': '',
        'رقم سيارة': `عدد السيارات: ${stats.uniqueTrucks}`,
        'السائق': `عدد السائقين: ${stats.uniqueDrivers}`,
        'الموقع / التعبئة': '',
        'رقم التانك': '',
        'أمر الشراء PO': '',
        'رقم تنفيذ الساب': '',
        'المنطقة / المزرعة': '',
        'التحليل الأولي': '',
        'السعر الأساسي (ج.م/كجم)': '' as any,
        'نسبة خصم الجودة %': '',
        'صافي السعر بعد الخصم (ج.م/كجم)': '' as any,
        'إجمالي القيمة المستحقة (ج.م)': grandTotalValue > 0 ? parseFloat(grandTotalValue.toFixed(2)) : ('' as any),
        'طريقة السداد': '',
        'المخزن': '',
        'POST DOCUMENT': '',
        'RESERVATION': '',
        'رقم مستند المورد': '',
        'ملاحظات': ''
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'توريد الفريش');

      // Set column widths
      worksheet['!cols'] = [
        { wch: 5 },  // index
        { wch: 12 }, // date
        { wch: 12 }, // move no
        { wch: 28 }, // item name
        { wch: 14 }, // sap code
        { wch: 12 }, // old code
        { wch: 15 }, // kg
        { wch: 14 }, // tons
        { wch: 8 },  // unit
        { wch: 25 }, // supplier
        { wch: 15 }, // cost center code
        { wch: 12 }, // truck
        { wch: 18 }, // driver
        { wch: 14 }, // location
        { wch: 12 }, // tank
        { wch: 15 }, // PO
        { wch: 16 }, // sap exec
        { wch: 22 }, // region
        { wch: 16 }, // initial analysis
        { wch: 16 }, // base price
        { wch: 15 }, // quality discount %
        { wch: 18 }, // net price
        { wch: 18 }, // total value
        { wch: 15 }, // payment method
        { wch: 10 }, // store
        { wch: 16 }, // post doc
        { wch: 14 }, // res
        { wch: 16 }, // vendor doc
        { wch: 20 }  // notes
      ];

      const fileName = `تقرير_توريد_الفريش_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success(isRtl ? 'تم تصدير ملف الإكسيل بنجاح' : 'Excel file exported successfully');
    } catch (err) {
      console.error('Export Excel Error:', err);
      toast.error(isRtl ? 'فشل تصدير الإكسيل' : 'Failed to export Excel');
    }
  };

  // Export Items Summary to Excel
  const handleExportItemsSummaryExcel = () => {
    try {
      const rows = filteredSortedItems.map((item, idx) => ({
        'م': idx + 1,
        'اسم الصنف': item.itemName,
        'النوع': item.varietyName,
        'كود ساب': item.sapCode || '-',
        'كود قديم': item.oldCode || '-',
        'إجمالي الكمية (كجم)': item.totalKg,
        'إجمالي الكمية (طن)': parseFloat(item.totalTons.toFixed(3)),
        'النسبة من الإجمالي': `${stats.totalKg > 0 ? ((item.totalKg / stats.totalKg) * 100).toFixed(2) : 0}%`,
        'عدد الحركات': item.count,
        'عدد الموردين': item.suppliers.size,
        'أعلى مورد': item.topSupplier,
        'تخزين براميل (طن)': parseFloat(item.barrelTons.toFixed(3)),
        'تخزين تانكات (طن)': parseFloat(item.tankTons.toFixed(3))
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ملخص الأصناف');
      XLSX.writeFile(workbook, `ملخص_أصناف_الفريش_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(isRtl ? 'تم تصدير ملخص الأصناف للإكسيل' : 'Items summary exported');
    } catch (err) {
      toast.error(isRtl ? 'فشل تصدير ملخص الأصناف' : 'Failed to export items summary');
    }
  };

  // Export Suppliers Summary to Excel
  const handleExportSuppliersSummaryExcel = () => {
    try {
      const rows = filteredSortedSuppliers.map((sup, idx) => ({
        'م': idx + 1,
        'المورد / مركز التكلفة': sup.costCenter,
        'كود مركز التكلفة': sup.costCenterCode || '-',
        'إجمالي الكمية (كجم)': sup.totalKg,
        'إجمالي الكمية (طن)': parseFloat(sup.totalTons.toFixed(3)),
        'النسبة من الإجمالي': `${stats.totalKg > 0 ? ((sup.totalKg / stats.totalKg) * 100).toFixed(2) : 0}%`,
        'عدد الحركات / النقلات': sup.count,
        'متوسط النقلة (طن)': parseFloat(sup.avgShipmentTons.toFixed(2)),
        'عدد الأصناف الموردة': sup.items.size,
        'الصنف الأكثر توريداً': sup.topItem,
        'عدد السيارات': sup.trucks.size,
        'عدد السائقين': sup.drivers.size
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ملخص الموردين');
      XLSX.writeFile(workbook, `ملخص_موردي_الفريش_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(isRtl ? 'تم تصدير ملخص الموردين للإكسيل' : 'Suppliers summary exported');
    } catch (err) {
      toast.error(isRtl ? 'فشل تصدير ملخص الموردين' : 'Failed to export suppliers summary');
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Title
      doc.setFontSize(16);
      doc.text('Rich Land Food Industries - Fresh Produce Supply Report', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()} | Total: ${stats.totalTons.toFixed(2)} Tons (${stats.totalKg.toLocaleString()} KG) | Movements: ${stats.movementCount}`, 14, 22);

      const tableData = filteredData.map((r, i) => [
        i + 1,
        r.date,
        r.movementNo,
        r.itemName,
        r.quantityKg.toLocaleString(),
        r.quantityTons.toFixed(2),
        r.costCenter,
        r.truckNo,
        r.driver,
        r.location,
        r.sapCode,
        r.po,
        r.sapExecutionNo || '-'
      ]);

      (doc as any).autoTable({
        head: [['#', 'Date', 'Move No', 'Item Name', 'KG', 'Tons', 'Supplier / Farm', 'Truck', 'Driver', 'Pkg', 'SAP Code', 'PO No', 'SAP Exec No']],
        body: tableData,
        startY: 26,
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 250, 248] },
        margin: { top: 26, left: 10, right: 10, bottom: 10 }
      });

      doc.save(`Fresh_Supply_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(isRtl ? 'تم تصدير ملف PDF بنجاح' : 'PDF exported successfully');
    } catch (err) {
      console.error('Export PDF Error:', err);
      toast.error(isRtl ? 'فشل تصدير PDF' : 'Failed to export PDF');
    }
  };

  // Export Matrix to Excel
  const handleExportMatrixExcel = () => {
    try {
      const rows = matrixData.items.map((item, idx) => {
        const rowObj: any = {
          'م': idx + 1,
          'اسم الصنف': item
        };
        let rowSumTons = 0;
        matrixData.suppliers.forEach(sup => {
          const tons = matrixData.getTons(item, sup);
          rowObj[sup] = tons > 0 ? parseFloat(tons.toFixed(3)) : 0;
          rowSumTons += tons;
        });
        rowObj['إجمالي الصنف (طن)'] = parseFloat(rowSumTons.toFixed(3));
        return rowObj;
      });

      // Total Row
      const totalRow: any = {
        'م': 'الإجمالي',
        'اسم الصنف': `عدد الأصناف: ${matrixData.items.length}`
      };
      let grandTotal = 0;
      matrixData.suppliers.forEach(sup => {
        let colSum = 0;
        matrixData.items.forEach(item => {
          colSum += matrixData.getTons(item, sup);
        });
        totalRow[sup] = parseFloat(colSum.toFixed(3));
        grandTotal += colSum;
      });
      totalRow['إجمالي الصنف (طن)'] = parseFloat(grandTotal.toFixed(3));
      rows.push(totalRow);

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'مصفوفة الأصناف والموردين');
      XLSX.writeFile(wb, `مصفوفة_الأصناف_والموردين_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(isRtl ? 'تم تصدير مصفوفة الأصناف والموردين بنجاح' : 'Cross-tab matrix exported successfully');
    } catch (e) {
      console.error('Matrix Export Error:', e);
      toast.error(isRtl ? 'فشل تصدير المصفوفة' : 'Failed to export matrix');
    }
  };

  // Export Logistics to Excel
  const handleExportLogisticsExcel = () => {
    try {
      const rows = logisticsSummary.map((t, idx) => ({
        'م': idx + 1,
        'رقم السيارة': t.truckNo,
        'السائقين': Array.from(t.drivers).join(' / '),
        'عدد الرحلات / النقلات': t.count,
        'إجمالي الكمية (كجم)': t.totalKg,
        'إجمالي الكمية (طن)': parseFloat(t.totalTons.toFixed(3)),
        'متوسط الحمولة للنقلة (طن)': parseFloat(t.avgLoadTons.toFixed(2)),
        'الأصناف المنقولة': Array.from(t.items).join('، '),
        'الموردين': Array.from(t.suppliers).join('، ')
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير أسطول النقل والسيارات');
      XLSX.writeFile(wb, `تقرير_النقل_والسيارات_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(isRtl ? 'تم تصدير تقرير اللوجستيات بنجاح' : 'Logistics report exported successfully');
    } catch (e) {
      console.error('Logistics Export Error:', e);
      toast.error(isRtl ? 'فشل التصدير' : 'Export failed');
    }
  };

  // Export Packaging & Tanks to Excel
  const handleExportPackagingExcel = () => {
    try {
      const rows = packagingSummary.tanksList.map((t, idx) => ({
        'م': idx + 1,
        'رقم التانك': t.tankNo,
        'الصنف المخزن': t.itemName || 'متعدد / غير محدد',
        'الكمية المخزنة (كجم)': t.totalKg,
        'الكمية المخزنة (طن)': parseFloat(t.totalTons.toFixed(3)),
        'عدد مرات التعبئة': t.count,
        'الموردين': Array.from(t.suppliers).join('، '),
        'التواريخ': Array.from(t.dates).join('، ')
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير تخصيص التانكات');
      XLSX.writeFile(wb, `تقرير_التانكات_والتعبئة_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(isRtl ? 'تم تصدير تقرير التعبئة والتانكات بنجاح' : 'Packaging report exported');
    } catch (e) {
      console.error('Packaging Export Error:', e);
      toast.error(isRtl ? 'فشل التصدير' : 'Export failed');
    }
  };

  // Export Daily Velocity to Excel
  const handleExportDailyExcel = () => {
    try {
      const rows = dailyTimelineDetailed.map((d, idx) => ({
        'م': idx + 1,
        'التاريخ': d.date,
        'كمية اليوم (كجم)': d.totalKg,
        'كمية اليوم (طن)': parseFloat(d.totalTons.toFixed(3)),
        'الكمية التراكمية (طن)': parseFloat(d.cumulativeTons.toFixed(3)),
        'عدد الحركات': d.count,
        'أعلى صنف توريداً اليوم': d.topItem,
        'كمية أعلى صنف (طن)': parseFloat(d.topItemTons.toFixed(3)),
        'عدد الموردين': d.suppliers.size,
        'عدد السيارات': d.trucks.size
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير التوريد اليومي');
      XLSX.writeFile(wb, `تقرير_التوريد_اليومي_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(isRtl ? 'تم تصدير تقرير المسار اليومي بنجاح' : 'Daily report exported');
    } catch (e) {
      console.error('Daily Export Error:', e);
      toast.error(isRtl ? 'فشل التصدير' : 'Export failed');
    }
  };

  // Export PO Reconciliation to Excel
  const handleExportPOExcel = () => {
    try {
      const rows = poReconciliation.map((p, idx) => ({
        'م': idx + 1,
        'أمر الشراء (PO)': p.po,
        'أكواد ساب': Array.from(p.sapCodes).join(' / '),
        'الأصناف المستلمة': Array.from(p.items).join('، '),
        'الموردين': Array.from(p.suppliers).join('، '),
        'إجمالي الكمية (كجم)': p.totalKg,
        'إجمالي الكمية (طن)': parseFloat(p.totalTons.toFixed(3)),
        'عدد الحركات المستلمة': p.count,
        'POST DOCUMENT': Array.from(p.postDocuments).join(' / '),
        'RESERVATION': Array.from(p.reservations).join(' / ')
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'مطابقة أوامر الشراء PO');
      XLSX.writeFile(wb, `مطابقة_أوامر_الشراء_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(isRtl ? 'تم تصدير تقرير مطابقة PO بنجاح' : 'PO reconciliation exported');
    } catch (e) {
      console.error('PO Export Error:', e);
      toast.error(isRtl ? 'فشل التصدير' : 'Export failed');
    }
  };

  // Export Items Summary to Excel
  const handleExportItemsExcel = () => {
    try {
      const rows = itemsSummary.map((item, idx) => ({
        'م': idx + 1,
        'اسم الصنف': item.itemName,
        'كود ساب': item.sapCode || '-',
        'كود قديم': item.oldCode || '-',
        'إجمالي الكمية (كجم)': item.totalKg,
        'إجمالي الكمية (طن)': parseFloat(item.totalTons.toFixed(3)),
        'النسبة المئوية (%)': stats.totalKg > 0 ? parseFloat(((item.totalKg / stats.totalKg) * 100).toFixed(2)) : 0,
        'عدد الحركات': item.count,
        'الموردين': Array.from(item.suppliers).join('، ')
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ملخص الأصناف');
      XLSX.writeFile(wb, `ملخص_الأصناف_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(isRtl ? 'تم تصدير ملخص الأصناف بنجاح' : 'Items summary exported');
    } catch (e) {
      console.error('Items Export Error:', e);
      toast.error(isRtl ? 'فشل التصدير' : 'Export failed');
    }
  };

  // Export Suppliers Summary to Excel
  const handleExportSuppliersExcel = () => {
    try {
      const rows = suppliersSummary.map((sup, idx) => ({
        'م': idx + 1,
        'المورد / مركز التكلفة': sup.costCenter,
        'كود مركز التكلفة': sup.costCenterCode || '-',
        'إجمالي الكمية (كجم)': sup.totalKg,
        'إجمالي الكمية (طن)': parseFloat(sup.totalTons.toFixed(3)),
        'النسبة المئوية (%)': stats.totalKg > 0 ? parseFloat(((sup.totalKg / stats.totalKg) * 100).toFixed(2)) : 0,
        'عدد الحركات': sup.count,
        'الأصناف الموردة': Array.from(sup.items).join('، '),
        'السيارات المستخدمة': Array.from(sup.trucks).join('، ')
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ملخص الموردين');
      XLSX.writeFile(wb, `ملخص_الموردين_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(isRtl ? 'تم تصدير ملخص الموردين بنجاح' : 'Suppliers summary exported');
    } catch (e) {
      console.error('Suppliers Export Error:', e);
      toast.error(isRtl ? 'فشل التصدير' : 'Export failed');
    }
  };

  // Export Stores Summary to Excel
  const handleExportStoresExcel = () => {
    try {
      const rows = storesSummary.map((st, idx) => ({
        'م': idx + 1,
        'المخزن': st.storeName,
        'إجمالي الكمية (كجم)': st.totalKg,
        'إجمالي الكمية (طن)': parseFloat(st.totalTons.toFixed(3)),
        'النسبة المئوية (%)': stats.totalKg > 0 ? parseFloat(((st.totalKg / stats.totalKg) * 100).toFixed(2)) : 0,
        'عدد الحركات': st.count,
        'عدد الأصناف': st.itemsCount,
        'عدد الموردين': st.suppliersCount
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ملخص المخازن');
      XLSX.writeFile(wb, `ملخص_المخازن_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(isRtl ? 'تم تصدير ملخص المخازن بنجاح' : 'Stores summary exported');
    } catch (e) {
      console.error('Stores Export Error:', e);
      toast.error(isRtl ? 'فشل التصدير' : 'Export failed');
    }
  };

  // Copy row summary
  const handleCopyRecord = (r: FreshSupplyRecord) => {
    const text = `تاريخ: ${r.date} | حركة: ${r.movementNo} | صنف: ${r.itemName} | كمية: ${r.quantityKg.toLocaleString()} كجم (${r.quantityTons.toFixed(2)} طن) | مورد: ${r.costCenter} | سيارة: ${r.truckNo} | سائق: ${r.driver} | ساب: ${r.sapCode} | PO: ${r.po}`;
    navigator.clipboard.writeText(text);
    toast.success(isRtl ? 'تم نسخ بيانات الحركة إلى الحافظة' : 'Movement data copied to clipboard');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* 1. Header Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 md:p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Title & Live Status */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner shrink-0">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {isRtl ? 'توريد الفريش (الخام الطازج)' : 'Fresh Produce Supply'}
                </h1>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>{isRtl ? 'إدارة ومتابعة استلامات الخضروات والفواكه الطازجة' : 'Manage and track fresh produce intake records'}</span>
                {lastSynced && (
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                    {isRtl ? `آخر مزامنة: ${lastSynced}` : `Last sync: ${lastSynced}`}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Live Sync Button */}
            <button
              onClick={() => fetchData(true)}
              disabled={isSyncing || loading}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              title={isRtl ? 'تحديث البيانات من جوجل شيت' : 'Sync data from Google Sheet'}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isRtl ? 'مزامنة وتحديث' : 'Sync Sheet'}</span>
            </button>

            {/* Export Buttons - Restricted to authorized roles */}
            {canAccessSupplyActions && (
              <>
                {/* Export Excel */}
                <button
                  onClick={handleExportExcel}
                  disabled={filteredData.length === 0}
                  className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title={isRtl ? 'تصدير إكسيل .xlsx' : 'Export Excel'}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">{isRtl ? 'تصدير إكسيل' : 'Excel'}</span>
                </button>

                {/* Import Excel - Restricted to Admin Only */}
                {userRoles.includes('Admin') && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportExcel}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImporting}
                      className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-sm"
                      title={isRtl ? 'استيراد وتحديث البيانات من شيت إكسيل معدل (متاح للادمن فقط)' : 'Import & update data from modified Excel (Admin Only)'}
                    >
                      <Upload className={`w-4 h-4 ${isImporting ? 'animate-bounce' : ''}`} />
                      <span className="hidden sm:inline">{isRtl ? 'استيراد تعديل الإكسيل' : 'Import Excel'}</span>
                    </button>
                  </>
                )}

                {/* Export PDF */}
                <button
                  onClick={handleExportPDF}
                  disabled={filteredData.length === 0}
                  className="px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title={isRtl ? 'طباعة تقرير PDF' : 'Export PDF'}
                >
                  <FileText className="w-4 h-4 text-red-500" />
                  <span className="hidden sm:inline">{isRtl ? 'تقرير PDF' : 'PDF'}</span>
                </button>
              </>
            )}

            {/* Direct Google Sheet Link */}
            <a
              href="https://docs.google.com/spreadsheets/d/e/2PACX-1vQN1nH0TPk6-NpHHIWN6xQ1RKnjut-nzUgga3-zzB1ydF9f2L3--JPiwu6qJHnCcFymfsZj3gTzKiIo/pub?output=csv"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
              title={isRtl ? 'رابط ملف جوجل شيت المباشر' : 'Direct Sheet Link'}
            >
              <ExternalLink className="w-4 h-4" />
            </a>

          </div>

        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 overflow-x-auto">
          <button
            onClick={() => setActiveView('table')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeView === 'table'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>{isRtl ? 'جدول حركات التوريد' : 'Supply Movements Table'}</span>
            <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px] font-mono">
              {filteredData.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeView === 'analytics'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{isRtl ? 'الرسوم البيانية والتحليلات' : 'Visual Analytics'}</span>
          </button>
        </div>

      </div>

      {/* 2. Interactive KPI Cards (انقر على أي بطاقة لعرض تفاصيلها وتصفية الجدول) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        
        {/* Total Weight in Tons */}
        <div 
          onClick={() => setKpiModal('items')}
          role="button"
          tabIndex={0}
          title={isRtl ? 'انقر لعرض تفاصيل الأصناف وكمياتها بشاشة كاملة' : 'Click to view full screen items breakdown'}
          className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-3 rounded-xl shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1 lg:col-span-2 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all group active:scale-95 select-none relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-white/30 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-100 flex items-center gap-1">
              <span>{isRtl ? 'إجمالي توريد الفريش' : 'Total Fresh Intake'}</span>
              <span className="text-[8px] bg-white/20 px-1 py-0.2 rounded font-mono">تفاصيل ↗</span>
            </span>
            <div className="w-6 h-6 rounded-lg bg-white/15 group-hover:bg-white/25 flex items-center justify-center transition-colors">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-200" />
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xl lg:text-2xl font-black font-mono tracking-tight">
                {stats.totalTons.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] font-bold text-emerald-100">{isRtl ? 'طن' : 'Tons'}</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[10px] font-mono text-emerald-200/90">
                = {stats.totalKg.toLocaleString('en-US')} {isRtl ? 'كجم' : 'KG'}
              </p>
              <span className="text-[9px] text-emerald-200 underline opacity-0 group-hover:opacity-100 transition-opacity">
                {isRtl ? 'عرض التوزيع' : 'View Breakdown'}
              </span>
            </div>
          </div>
        </div>

        {/* Total Movements */}
        <div 
          onClick={() => setKpiModal('movements')}
          role="button"
          tabIndex={0}
          title={isRtl ? 'انقر لعرض تحليل أذون وحركات الاستلام' : 'Click for movements breakdown'}
          className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-blue-400 hover:shadow-sm hover:scale-[1.01] transition-all group active:scale-95 select-none relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
              {isRtl ? 'عدد الحركات' : 'Movements'}
            </span>
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-lg lg:text-xl font-black font-mono text-zinc-900 dark:text-white">
              {stats.movementCount.toLocaleString()}
            </span>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[9px] text-zinc-400">{isRtl ? 'إذن إضافة واستلام' : 'Receipts'}</p>
              <span className="text-[8px] font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                {isRtl ? 'عرض ↗' : 'View ↗'}
              </span>
            </div>
          </div>
        </div>

        {/* Distinct Items (Interactive: shows all items and quantities) */}
        <div 
          onClick={() => setKpiModal('items')}
          role="button"
          tabIndex={0}
          title={isRtl ? 'انقر لعرض تفاصيل الأصناف وكمية كل صنف وتصفيتها' : 'Click to view all items and their quantities'}
          className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/40 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-amber-500 hover:shadow-sm hover:scale-[1.01] transition-all group active:scale-95 select-none relative overflow-hidden bg-gradient-to-b from-amber-50/20 to-transparent dark:from-amber-950/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
              <span>{isRtl ? 'الأصناف الطازجة' : 'Fresh Items'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            </span>
            <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center transition-colors">
              <PackageCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-lg lg:text-xl font-black font-mono text-zinc-900 dark:text-white">
              {stats.uniqueItems}
            </span>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[9px] text-amber-700 dark:text-amber-400 font-bold">{isRtl ? 'انقر لعرض الأصناف' : 'Click for items'}</p>
              <span className="text-[9px] font-black text-amber-600 dark:text-amber-400">⚡</span>
            </div>
          </div>
        </div>

        {/* Distinct Suppliers (Interactive: shows all suppliers and quantities) */}
        <div 
          onClick={() => setKpiModal('suppliers')}
          role="button"
          tabIndex={0}
          title={isRtl ? 'انقر لعرض تفاصيل الموردين وكميات كل مورد ومزرعة' : 'Click to view all suppliers and their quantities'}
          className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-purple-200/80 dark:border-purple-900/40 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-purple-500 hover:shadow-sm hover:scale-[1.01] transition-all group active:scale-95 select-none relative overflow-hidden bg-gradient-to-b from-purple-50/20 to-transparent dark:from-purple-950/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1">
              <span>{isRtl ? 'الموردين والمزارع' : 'Suppliers'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            </span>
            <div className="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 group-hover:bg-purple-500 group-hover:text-white flex items-center justify-center transition-colors">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-lg lg:text-xl font-black font-mono text-zinc-900 dark:text-white">
              {stats.uniqueSuppliers}
            </span>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[9px] text-purple-700 dark:text-purple-400 font-bold">{isRtl ? 'انقر لعرض الموردين' : 'Click for suppliers'}</p>
              <span className="text-[9px] font-black text-purple-600 dark:text-purple-400">⚡</span>
            </div>
          </div>
        </div>

        {/* Trucks & Drivers (Interactive) */}
        <div 
          onClick={() => setKpiModal('trucks')}
          role="button"
          tabIndex={0}
          title={isRtl ? 'انقر لعرض أسطول الشاحنات وسائقي النقل والحمولات' : 'Click to view trucks and drivers logistics'}
          className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-teal-500 hover:shadow-sm hover:scale-[1.01] transition-all group active:scale-95 select-none relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
              {isRtl ? 'السيارات والسائقين' : 'Trucks & Drivers'}
            </span>
            <div className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-colors">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="flex items-center gap-1">
              <span className="text-base lg:text-lg font-black font-mono text-zinc-900 dark:text-white">
                {stats.uniqueTrucks}
              </span>
              <span className="text-[9px] text-zinc-400">س /</span>
              <span className="text-base lg:text-lg font-black font-mono text-zinc-900 dark:text-white">
                {stats.uniqueDrivers}
              </span>
              <span className="text-[9px] text-zinc-400">سائق</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[9px] text-zinc-400">{isRtl ? 'حركة النقل' : 'Logistics'}</p>
              <span className="text-[8px] font-bold text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {isRtl ? 'عرض ↗' : 'View ↗'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Search & Filter Bar - Unified Single Row */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3.5">
        
        {/* Primary Filter Toolbar - All Main Filters In One Unified Row */}
        <div className="flex items-center gap-2.5 flex-wrap xl:flex-nowrap">
          
          {/* Universal Search Input */}
          <div className="flex-1 min-w-[260px] relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRtl ? 'بحث شامل (الصنف، المورد، السيارة، السائق، رقم الحركة، كود ساب، PO)...' : 'Search items, suppliers, trucks, POs...'}
              className="w-full pl-4 pr-10 py-2 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 text-xs font-medium text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all h-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute top-1/2 -translate-y-1/2 left-3 text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Item Filter MultiSelect */}
          <div className="shrink-0">
            <MultiSelect
              label={isRtl ? 'جميع الأصناف' : 'All Items'}
              options={filterOptions.items.map(i => ({ id: i, label: i }))}
              selected={selectedItems}
              onChange={setSelectedItems}
              icon={<Sprout size={14} className="text-emerald-500" />}
              lang={lang}
            />
          </div>

          {/* Supplier Filter MultiSelect */}
          <div className="shrink-0">
            <MultiSelect
              label={isRtl ? 'جميع الموردين' : 'All Suppliers'}
              options={filterOptions.suppliers.map(s => ({ id: s, label: s }))}
              selected={selectedSuppliers}
              onChange={setSelectedSuppliers}
              icon={<Building2 size={14} className="text-purple-500" />}
              lang={lang}
            />
          </div>

          {/* Store Filter MultiSelect */}
          <div className="shrink-0">
            <MultiSelect
              label={isRtl ? 'كل المخازن' : 'All Stores'}
              options={filterOptions.stores.map(st => ({ id: st, label: st }))}
              selected={selectedStores}
              onChange={setSelectedStores}
              icon={<Container size={14} className="text-blue-500" />}
              lang={lang}
            />
          </div>

          {/* Date Filter Dropdown */}
          <div className="shrink-0">
            <DateRangeFilter
              value={dateFilter}
              onChange={(val) => setDateFilter(val)}
              isRtl={isRtl}
              availableDates={filterOptions.dates}
              hideLabel={true}
              hideQuickChips={true}
              buttonClassName="h-10 px-3.5 py-2 text-xs"
              placeholder={isRtl ? 'تصفية بالتاريخ / الفترة' : 'Filter Date / Period'}
            />
          </div>

          {/* Clear Filters Button */}
          {(searchTerm || selectedItems.length > 0 || selectedSuppliers.length > 0 || selectedStores.length > 0 || selectedLocations.length > 0 || selectedVarieties.length > 0 || dateFilter.mode !== 'all' || mainCategoryFilter !== 'ALL' || analysisFilter !== 'ALL') && (
            <button
              onClick={handleClearFilters}
              className="h-10 px-3.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-red-200 dark:border-red-800/60"
            >
              <X className="w-3.5 h-3.5" />
              <span>{isRtl ? 'إلغاء الفلاتر' : 'Clear Filters'}</span>
            </button>
          )}

          {/* Column Visibility Toggle */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowColumnConfig(!showColumnConfig)}
              className="h-10 px-3.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isRtl ? 'أعمدة الجدول' : 'Columns'}</span>
            </button>

            {showColumnConfig && (
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-3 shadow-xl z-50 space-y-2">
                <div className="text-xs font-black text-zinc-900 dark:text-white pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  {isRtl ? 'تخصيص أعمدة الجدول' : 'Customize Columns'}
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {Object.keys(visibleColumns).map(colKey => {
                    const labels: Record<string, string> = {
                      index: isRtl ? 'م' : '#',
                      date: isRtl ? 'التاريخ' : 'Date',
                      movementNo: isRtl ? 'رقم الحركة' : 'Move No',
                      itemName: isRtl ? 'اسم الصنف' : 'Item Name',
                      quantityKg: isRtl ? 'الكمية (كجم/طن)' : 'Quantity',
                      costCenter: isRtl ? 'المورد / مركز التكلفة' : 'Supplier',
                      truckDriver: isRtl ? 'السيارة والسائق' : 'Truck & Driver',
                      location: isRtl ? 'الموقع والتعبئة' : 'Package',
                      sapCode: isRtl ? 'كود ساب' : 'SAP Code',
                      po: isRtl ? 'أمر الشراء (PO)' : 'PO No',
                      sapExecutionNo: isRtl ? 'رقم تنفيذ الساب' : 'SAP Execution No',
                      region: isRtl ? 'المنطقة / المزرعة' : 'Region',
                      price: isRtl ? 'السعر والقيمة (ج.م)' : 'Price & Value',
                      paymentMethod: isRtl ? 'طريقة السداد' : 'Payment Method',
                      initialAnalysis: isRtl ? 'التحليل الأولي' : 'Initial Analysis',
                      postDocument: isRtl ? 'POST DOCUMENT' : 'Post Doc',
                      store: isRtl ? 'المخزن' : 'Store',
                      actions: isRtl ? 'الإجراءات' : 'Actions'
                    };
                    return (
                      <label
                        key={colKey}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns[colKey as keyof typeof visibleColumns]}
                          onChange={(e) => setVisibleColumns({
                            ...visibleColumns,
                            [colKey]: e.target.checked
                          })}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-zinc-700 dark:text-zinc-300">{labels[colKey] || colKey}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Sub-Filters: Category Filter */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex-wrap">
          {/* Main Category Filter (Olives, Pepper, Other) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">
              {isRtl ? 'التصنيف:' : 'Category:'}
            </span>
            <button
              onClick={() => setMainCategoryFilter('ALL')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mainCategoryFilter === 'ALL'
                  ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {isRtl ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setMainCategoryFilter('OLIVES')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                mainCategoryFilter === 'OLIVES'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>{isRtl ? 'الزيتون' : 'Olives'}</span>
            </button>
            <button
              onClick={() => setMainCategoryFilter('PEPPER')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                mainCategoryFilter === 'PEPPER'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>{isRtl ? 'الفلفل' : 'Pepper'}</span>
            </button>
            <button
              onClick={() => setMainCategoryFilter('OTHER')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                mainCategoryFilter === 'OTHER'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>{isRtl ? 'أخرى' : 'Other'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Active View Content */}

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center border border-zinc-200 dark:border-zinc-800">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
            {isRtl ? 'جاري سحب ومعالجة بيانات توريد الفريش...' : 'Fetching and processing fresh supply data...'}
          </p>
        </div>
      )}

      {/* View 1: Main Table View (Single Continuous Scrollable Page) */}
      {!loading && activeView === 'table' && (
        <div className="space-y-4">
          {/* Floating Bulk Selection Action Bar */}
          {selectedRowIds.length > 0 && (
            <div className="bg-purple-900 text-white px-6 py-3.5 rounded-2xl shadow-xl flex items-center justify-between flex-wrap gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">
                  {selectedRowIds.length}
                </div>
                <span className="font-bold text-xs">
                  {isRtl ? `تم تحديد (${selectedRowIds.length}) صف لتعديل أمر التوريد ورقم الساب` : `Selected (${selectedRowIds.length}) rows for bulk update`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBulkEditModalOpen(true)}
                  className="px-4 py-2 bg-white text-purple-900 hover:bg-purple-50 font-black text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تعديل جماعي (أمر توريد / ساب)' : 'Bulk Edit (PO / SAP)'}</span>
                </button>
                <button
                  onClick={() => setSelectedRowIds([])}
                  className="px-3 py-2 bg-purple-800 hover:bg-purple-700 text-purple-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {isRtl ? 'إلغاء التحديد ✕' : 'Clear Selection ✕'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
          
          {/* Scrollable Table Container */}
          <div 
            ref={tableContainerRef}
            className="overflow-x-auto overflow-y-auto max-h-[70vh] md:max-h-[74vh] scroll-smooth relative"
          >
            <table className="w-full text-right border-collapse" dir={isRtl ? 'rtl' : 'ltr'}>
              <thead className="sticky top-0 z-20 shadow-xs">
                <tr className="bg-zinc-100/95 dark:bg-zinc-800/95 backdrop-blur text-zinc-700 dark:text-zinc-300 text-[11px] font-black border-b border-zinc-200 dark:border-zinc-700 select-none">
                  
                  {visibleColumns.index && (
                    <th className="py-3.5 px-3 w-16 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={filteredData.length > 0 && selectedRowIds.length === filteredData.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRowIds(filteredData.map(r => r.id));
                            } else {
                              setSelectedRowIds([]);
                            }
                          }}
                          className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          title={isRtl ? 'تحديد الكل' : 'Select All'}
                        />
                        <span>#</span>
                      </div>
                    </th>
                  )}

                  {visibleColumns.date && (
                    <th 
                      onClick={() => handleSort('date')}
                      className={`py-3.5 px-3 cursor-pointer transition-colors ${
                        sortField === 'date' 
                          ? 'bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 font-black' 
                          : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'
                      }`}
                      title={isRtl ? 'انقر للترتيب حسب التاريخ (الجديد / القديم)' : 'Click to sort by date (Newest / Oldest)'}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{isRtl ? 'التاريخ' : 'Date'}</span>
                        {sortField === 'date' ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold tracking-tight">
                            {sortOrder === 'desc' ? (isRtl ? 'الأحدث ↓' : 'Newest ↓') : (isRtl ? 'الأقدم ↑' : 'Oldest ↑')}
                          </span>
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                        )}
                      </div>
                    </th>
                  )}

                  {visibleColumns.movementNo && (
                    <th 
                      onClick={() => handleSort('movementNo')}
                      className="py-3.5 px-3 cursor-pointer hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isRtl ? 'رقم الحركة' : 'Move No'}</span>
                        <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                      </div>
                    </th>
                  )}

                  {visibleColumns.itemName && (
                    <th 
                      onClick={() => handleSort('itemName')}
                      className="py-3.5 px-3 cursor-pointer hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isRtl ? 'اسم الصنف' : 'Item Name'}</span>
                        <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                      </div>
                    </th>
                  )}

                  {visibleColumns.quantityKg && (
                    <th 
                      onClick={() => handleSort('quantityKg')}
                      className="py-3.5 px-3 cursor-pointer hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isRtl ? 'الكمية المضافة' : 'Quantity'}</span>
                        <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                      </div>
                    </th>
                  )}

                  {visibleColumns.costCenter && (
                    <th 
                      onClick={() => handleSort('costCenter')}
                      className="py-3.5 px-3 cursor-pointer hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isRtl ? 'مركز التكلفة / المورد' : 'Supplier'}</span>
                        <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                      </div>
                    </th>
                  )}

                  {visibleColumns.truckDriver && (
                    <th className="py-3.5 px-3">{isRtl ? 'السيارة والسائق' : 'Truck & Driver'}</th>
                  )}

                  {visibleColumns.location && (
                    <th className="py-3.5 px-3">{isRtl ? 'الموقع / التعبئة' : 'Package'}</th>
                  )}

                  {visibleColumns.sapCode && (
                    <th className="py-3.5 px-3">{isRtl ? 'كود ساب' : 'SAP Code'}</th>
                  )}

                  {visibleColumns.po && (
                    <th className="py-3.5 px-3">{isRtl ? 'أمر الشراء PO' : 'PO No'}</th>
                  )}

                  {visibleColumns.sapExecutionNo && (
                    <th 
                      onClick={() => handleSort('sapExecutionNo')}
                      className="py-3.5 px-3 cursor-pointer hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isRtl ? 'رقم تنفيذ الساب' : 'SAP Execution No'}</span>
                        <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                      </div>
                    </th>
                  )}

                  {visibleColumns.region && (
                    <th className="py-3.5 px-3">{isRtl ? 'المنطقة / المزرعة' : 'Region'}</th>
                  )}

                  {visibleColumns.price && (
                    <th className="py-3.5 px-3">{isRtl ? 'السعر والقيمة' : 'Price & Value'}</th>
                  )}

                  {visibleColumns.paymentMethod && (
                    <th className="py-3.5 px-3">{isRtl ? 'طريقة السداد' : 'Payment Method'}</th>
                  )}

                  {visibleColumns.initialAnalysis && (
                    <th className="py-3.5 px-3">{isRtl ? 'التحليل الأولي' : 'Initial Analysis'}</th>
                  )}

                  {visibleColumns.postDocument && (
                    <th className="py-3.5 px-3">{isRtl ? 'POST DOCUMENT' : 'Post Doc'}</th>
                  )}

                  {visibleColumns.store && (
                    <th className="py-3.5 px-3">{isRtl ? 'المخزن' : 'Store'}</th>
                  )}

                  {visibleColumns.actions && (
                    <th className="py-3.5 px-3 text-center">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  )}

                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800 text-xs">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto" />
                        <p className="font-bold">{isRtl ? 'لا توجد نتائج مطابقة لخيارات البحث' : 'No records match your filters'}</p>
                        <button
                          onClick={handleClearFilters}
                          className="text-xs text-emerald-600 hover:underline font-bold"
                        >
                          {isRtl ? 'إلغاء الفلاتر وعرض الكل' : 'Clear filters & view all'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((record, index) => {
                    const rowNumber = index + 1;
                    return (
                      <tr 
                        key={record.id}
                        className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors group"
                      >
                        
                        {visibleColumns.index && (
                          <td className="py-3 px-3 text-center font-mono text-zinc-400 text-[11px]">
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={selectedRowIds.includes(record.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRowIds(prev => [...prev, record.id]);
                                  } else {
                                    setSelectedRowIds(prev => prev.filter(id => id !== record.id));
                                  }
                                }}
                                className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              <span>{rowNumber}</span>
                            </div>
                          </td>
                        )}

                        {visibleColumns.date && (
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                              {record.date}
                            </span>
                          </td>
                        )}

                        {visibleColumns.movementNo && (
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              {record.movementNo || '-'}
                            </span>
                          </td>
                        )}

                        {visibleColumns.itemName && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="font-black text-zinc-900 dark:text-white">
                                {record.itemName}
                              </span>
                              {record.oldCode && (
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  ({record.oldCode})
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {visibleColumns.quantityKg && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-mono whitespace-nowrap">
                              <span className="font-black text-zinc-900 dark:text-white text-xs">
                                {record.quantityKg.toLocaleString('en-US')} <span className="text-[10px] font-bold text-zinc-500">{record.unit || 'كجم'}</span>
                              </span>
                              <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                                ({record.quantityTons.toFixed(3)} طن)
                              </span>
                            </div>
                          </td>
                        )}

                        {visibleColumns.costCenter && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                {record.costCenter || '-'}
                              </span>
                              {record.costCenterCode && (
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  ({record.costCenterCode})
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {visibleColumns.truckDriver && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="font-mono font-bold text-amber-900 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800 text-[11px]">
                                {record.truckNo || '-'}
                              </span>
                              {record.driver && (
                                <span className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                                  {record.driver}
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {visibleColumns.location && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border whitespace-nowrap ${
                              record.location.includes('تانك')
                                ? 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800'
                                : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                            }`}>
                              {record.location || 'برميل'} {record.tankNo ? `(${record.tankNo})` : ''}
                            </span>
                          </td>
                        )}

                        {visibleColumns.sapCode && (
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-zinc-600 dark:text-zinc-400 text-[11px]">
                            {record.sapCode || '-'}
                          </td>
                        )}

                        {visibleColumns.po && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {record.po ? (
                              <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-[11px]">
                                {record.po}
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">-</span>
                            )}
                          </td>
                        )}

                        {visibleColumns.sapExecutionNo && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {record.sapExecutionNo ? (
                              <span className="font-mono font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-[11px]">
                                {record.sapExecutionNo}
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">-</span>
                            )}
                          </td>
                        )}

                        {visibleColumns.region && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {record.region ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 whitespace-nowrap">
                                <MapPin className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                                {record.region}
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">-</span>
                            )}
                          </td>
                        )}

                        {visibleColumns.price && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {(() => {
                              const base = record.price && record.price > 0 ? record.price : 0;
                              const discountPct = record.qualityDiscountPercent && record.qualityDiscountPercent > 0 ? record.qualityDiscountPercent : 0;
                              const net = base > 0 ? (discountPct > 0 ? base * (1 - discountPct / 100) : base) : 0;
                              const total = net > 0 ? net * record.quantityKg : 0;

                              if (base === 0) return <span className="text-zinc-400 text-[11px]">-</span>;

                              return (
                                <div className="flex items-center gap-1.5 font-mono text-xs whitespace-nowrap">
                                  <span className="font-black text-emerald-700 dark:text-emerald-400">
                                    {net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-bold text-zinc-500">{isRtl ? 'ج.م' : 'EGP'}</span>
                                  </span>
                                  {discountPct > 0 && (
                                    <span 
                                      className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 py-0.5 rounded border border-rose-200 dark:border-rose-800" 
                                      title={`السعر الأساسي: ${base} ج.م | خصم جودة: ${discountPct}%`}
                                    >
                                      (-{discountPct}%)
                                    </span>
                                  )}
                                  <span className="text-[10.5px] font-bold text-zinc-500 dark:text-zinc-400">
                                    [{(total).toLocaleString('en-US', { maximumFractionDigits: 0 })} {isRtl ? 'ج.م' : 'EGP'}]
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                        )}

                        {visibleColumns.paymentMethod && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {record.paymentMethod ? (
                              <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 whitespace-nowrap">
                                {record.paymentMethod}
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">-</span>
                            )}
                          </td>
                        )}

                        {visibleColumns.initialAnalysis && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {record.initialAnalysis ? (
                              record.initialAnalysis.includes('خالي مبيدات') ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700 shadow-2xs whitespace-nowrap">
                                  <Leaf className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  {record.initialAnalysis}
                                </span>
                              ) : record.initialAnalysis === 'مبيدات' || (record.initialAnalysis.includes('مبيدات') && !record.initialAnalysis.includes('خالي')) ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700 shadow-2xs whitespace-nowrap">
                                  <ShieldAlert className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                                  {record.initialAnalysis}
                                </span>
                              ) : record.initialAnalysis.includes('عشوائي') ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-700 shadow-2xs whitespace-nowrap">
                                  <Shuffle className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                  {record.initialAnalysis}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 whitespace-nowrap" title={record.initialAnalysis}>
                                  {record.initialAnalysis}
                                </span>
                              )
                            ) : (
                              <span className="text-zinc-400 text-[11px]">-</span>
                            )}
                          </td>
                        )}

                        {visibleColumns.postDocument && (
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-zinc-500 dark:text-zinc-400 text-[10.5px]">
                            {record.postDocument || '-'}
                          </td>
                        )}

                        {visibleColumns.store && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                              {record.store || 'GPS'}
                            </span>
                          </td>
                        )}

                        {visibleColumns.actions && (
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {canAccessSupplyActions && (
                                <button
                                  onClick={() => setSelectedRecord(record)}
                                  className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                                  title={isRtl ? 'عرض واستكمال بيانات التوريد' : 'View & Complete Supply'}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleCopyRecord(record)}
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 rounded-lg transition-colors cursor-pointer"
                                title={isRtl ? 'نسخ البيانات' : 'Copy data'}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}

                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer with Sticky Summary */}
              {filteredData.length > 0 && (
                <tfoot className="sticky bottom-0 z-20 shadow-md">
                  <tr className="bg-zinc-100/95 dark:bg-zinc-800/95 backdrop-blur font-black text-zinc-900 dark:text-white border-t-2 border-zinc-300 dark:border-zinc-700">
                    <td colSpan={visibleColumns.index ? 4 : 3} className="py-3.5 px-4 text-xs font-black">
                      {isRtl ? `إجمالي السجلات المعروضة (${filteredData.length} حركة):` : `Total Displayed (${filteredData.length} movements):`}
                    </td>
                    {visibleColumns.quantityKg && (
                      <td className="py-3.5 px-3 font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">
                        <div>{stats.totalKg.toLocaleString()} كجم</div>
                        <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">({stats.totalTons.toFixed(2)} طن)</div>
                      </td>
                    )}
                    <td colSpan={8} className="py-3.5 px-3 text-xs text-zinc-600 dark:text-zinc-300 font-bold">
                      {isRtl ? `الموردين: ${stats.uniqueSuppliers} | السيارات: ${stats.uniqueTrucks}` : `Suppliers: ${stats.uniqueSuppliers} | Trucks: ${stats.uniqueTrucks}`}
                    </td>
                  </tr>
                </tfoot>
              )}

            </table>
          </div>

          {/* Continuous Scroll Info & Utility Bar */}
          <div className="p-3.5 bg-zinc-50/90 dark:bg-zinc-850 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {isRtl 
                  ? `عرض جميع السجلات (${filteredData.length} حركة توريد) في صفحة واحدة ممتدة — استخدم التمرير للأسفل`
                  : `Showing all ${filteredData.length} movements in a single scrollable view — scroll down to explore`
                }
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={scrollToTop}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                title={isRtl ? 'الانتقال لأعلى الجدول' : 'Scroll to top'}
              >
                <ChevronUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isRtl ? 'أعلى الجدول' : 'Top'}</span>
              </button>

              <button
                onClick={scrollToBottom}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                title={isRtl ? 'الانتقال لأسفل الجدول' : 'Scroll to bottom'}
              >
                <ChevronDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isRtl ? 'أسفل الجدول' : 'Bottom'}</span>
              </button>
            </div>

          </div>

          </div>

        </div>
      )}



      {/* View 4: Visual Analytics & Executive Charts */}
      {!loading && activeView === 'analytics' && (
        <FreshAnalyticsDashboard
          items={itemsSummary}
          suppliers={suppliersSummary}
          dailyData={dailySummary}
          records={data}
          totalKg={stats.totalKg}
          totalTons={stats.totalTons}
          barrelTons={stats.barrelKg / 1000}
          tankTons={stats.tankKg / 1000}
          uniqueTrucks={stats.uniqueTrucks}
          uniqueDrivers={stats.uniqueDrivers}
          isRtl={isRtl}
          onFilterByItem={(item) => {
            setSelectedItems(item ? [item] : []);
            setActiveView('table');
          }}
          onFilterBySupplier={(sup) => {
            setSelectedSuppliers(sup ? [sup] : []);
            setActiveView('table');
          }}
        />
      )}

      {/* 6. Interactive KPI Breakdown Modal (نافذة تفاعلية بشاشة كاملة عند النقر على بطاقات المؤشرات) */}
      {kpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full h-full sm:h-[95vh] sm:max-w-[96vw] sm:rounded-3xl border-0 sm:border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-98 duration-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-zinc-800 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                  {kpiModal === 'items' && <PackageCheck className="w-5 h-5 text-amber-300" />}
                  {kpiModal === 'suppliers' && <Building2 className="w-5 h-5 text-purple-300" />}
                  {kpiModal === 'stores' && <Container className="w-5 h-5 text-blue-300" />}
                  {kpiModal === 'totals' && <TrendingUp className="w-5 h-5 text-emerald-300" />}
                  {kpiModal === 'movements' && <FileCheck2 className="w-5 h-5 text-blue-300" />}
                  {kpiModal === 'trucks' && <Truck className="w-5 h-5 text-teal-300" />}
                  {kpiModal === 'packaging' && <Container className="w-5 h-5 text-cyan-300" />}
                </div>
                <div>
                  <h3 className="font-black text-base flex items-center gap-2">
                    {kpiModal === 'items' && (isRtl ? 'تفاصيل الأصناف والكميات الموردة' : 'Fresh Items & Supplied Volumes')}
                    {kpiModal === 'suppliers' && (isRtl ? 'تفاصيل الموردين وكميات كل مورد' : 'Suppliers & Supplied Volumes')}
                    {kpiModal === 'totals' && (isRtl ? 'تحليل إجمالي كميات التوريد' : 'Total Supply Breakdown')}
                    {kpiModal === 'movements' && (isRtl ? 'تحليل أذون وحركات التوريد' : 'Delivery Receipts Breakdown')}
                    {kpiModal === 'trucks' && (isRtl ? 'تحليل أسطول النقل وسائقي السيارات' : 'Trucks & Logistics Fleet')}
                    {kpiModal === 'packaging' && (isRtl ? 'تحليل التعبئة (براميل مقابل تانكات)' : 'Packaging & Tanks Allocation')}
                  </h3>
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    {isRtl ? 'انقر على أي صف لتصفية الجدول الرئيسي مباشرة وعرض حركاته' : 'Click any row to filter main table records directly'}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setKpiModal(null);
                  setModalSearchTerm('');
                }}
                className="p-2 hover:bg-white/15 rounded-xl text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Tabs & Fast Search */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              
              {/* Tabs within Modal */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <button
                  onClick={() => setKpiModal('items')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    kpiModal === 'items'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'الأصناف' : 'Items'}</span>
                  <span className="font-mono text-[10px] bg-black/20 px-1 rounded-full">{itemsSummary.length}</span>
                </button>

                <button
                  onClick={() => setKpiModal('suppliers')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    kpiModal === 'suppliers'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'الموردين' : 'Suppliers'}</span>
                  <span className="font-mono text-[10px] bg-black/20 px-1 rounded-full">{suppliersSummary.length}</span>
                </button>

                <button
                  onClick={() => setKpiModal('stores')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    kpiModal === 'stores'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <Container className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'المخزن' : 'Store'}</span>
                  <span className="font-mono text-[10px] bg-black/20 px-1 rounded-full">{storesSummary.length}</span>
                </button>


              </div>

              {/* Fast Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  placeholder={isRtl ? 'بحث داخل هذه القائمة...' : 'Search list...'}
                  className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
              
              {/* TAB 1: ITEMS BREAKDOWN */}
              {kpiModal === 'items' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-bold">
                      {isRtl ? `إجمالي الأصناف الموردة: ${itemsSummary.length} صنف` : `Total items: ${itemsSummary.length}`}
                    </span>
                    <button
                      onClick={handleExportItemsExcel}
                      className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'تصدير الأصناف Excel' : 'Export Items'}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {itemsSummary
                      .filter(i => modalSearchTerm ? i.itemName.toLowerCase().includes(modalSearchTerm.toLowerCase()) : true)
                      .map((item, idx) => {
                        const percent = stats.totalKg > 0 ? ((item.totalKg / stats.totalKg) * 100).toFixed(1) : '0';
                        const isExpanded = expandedItem === item.itemName;
                        return (
                          <div
                            key={item.itemName}
                            className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 transition-all overflow-hidden"
                          >
                            <div 
                              onClick={() => setExpandedItem(isExpanded ? null : item.itemName)}
                              className="p-4 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                            >
                              <div className="flex items-start gap-3">
                                <span className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black font-mono flex items-center justify-center text-xs shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div>
                                  <h4 className="font-black text-sm text-zinc-900 dark:text-white leading-tight flex items-center gap-2">
                                    <span>{item.itemName}</span>
                                    <span className="text-[10px] font-normal text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                                      {isExpanded ? 'إخفاء الحصص ▲' : 'عرض حصص الموردين ▼'}
                                    </span>
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-zinc-500">
                                    {item.sapCode && <span className="font-mono font-bold bg-zinc-200/70 dark:bg-zinc-700 px-1.5 py-0.2 rounded">SAP: {item.sapCode}</span>}
                                    <span>• {item.count} حركات</span>
                                    <span>• {item.suppliers.size} موردين</span>
                                     {item.stores.size > 0 && (
                                       <span className="font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                         {isRtl ? 'المخزن: ' : 'Store: '}{Array.from(item.stores).join(', ')}
                                       </span>
                                     )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 justify-between sm:justify-end">
                                <div className="text-left sm:text-right">
                                  <div className="font-black font-mono text-base text-emerald-600 dark:text-emerald-400">
                                    {item.totalTons.toFixed(2)} <span className="text-xs font-bold">طن</span>
                                  </div>
                                  <div className="text-[11px] font-mono text-zinc-400">
                                    {item.totalKg.toLocaleString()} كجم ({percent}%)
                                  </div>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItems([item.itemName]);
                                    setActiveView('table');
                                    setKpiModal(null);
                                    toast.success(isRtl ? `تمت تصفية الجدول لعرض حركات (${item.itemName})` : `Filtered by ${item.itemName}`);
                                  }}
                                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:scale-95"
                                  title={isRtl ? 'تصفية الجدول بهذا الصنف' : 'Filter table by this item'}
                                >
                                  <Filter className="w-3.5 h-3.5" />
                                  <span>{isRtl ? 'تصفية الجدول' : 'Filter'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Expanded Suppliers Share breakdown */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-2 bg-white/70 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
                                <h5 className="font-bold text-xs text-zinc-700 dark:text-zinc-300">
                                  {isRtl ? 'حصة كل مورد من هذا الصنف:' : 'Suppliers shares for this item:'}
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {Array.from(item.suppliersMap.entries()).sort((a, b) => b[1] - a[1]).map(([supName, supKg]) => {
                                    const supSharePercent = item.totalKg > 0 ? ((supKg / item.totalKg) * 100).toFixed(1) : '0';
                                    const supTons = supKg / 1000;
                                    return (
                                      <div key={supName} className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{supName}</span>
                                        <div className="text-left font-mono">
                                          <span className="font-black text-emerald-600 dark:text-emerald-400">{supTons.toFixed(2)} طن</span>
                                          <span className="text-[10px] text-zinc-400 ml-1.5">({supSharePercent}%)</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 2: SUPPLIERS BREAKDOWN */}
              {kpiModal === 'suppliers' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-bold">
                      {isRtl ? `إجمالي الموردين والمزارع: ${suppliersSummary.length} مورد` : `Total suppliers: ${suppliersSummary.length}`}
                    </span>
                    <button
                      onClick={handleExportSuppliersExcel}
                      className="px-3 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold rounded-lg border border-purple-200 dark:border-purple-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'تصدير الموردين Excel' : 'Export Suppliers'}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {suppliersSummary
                      .filter(s => modalSearchTerm ? s.costCenter.toLowerCase().includes(modalSearchTerm.toLowerCase()) : true)
                      .map((sup, idx) => {
                        const percent = stats.totalKg > 0 ? ((sup.totalKg / stats.totalKg) * 100).toFixed(1) : '0';
                        const isExpanded = expandedSupplier === sup.costCenter;
                        return (
                          <div
                            key={sup.costCenter}
                            className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 transition-all overflow-hidden"
                          >
                            <div 
                              onClick={() => setExpandedSupplier(isExpanded ? null : sup.costCenter)}
                              className="p-4 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                            >
                              <div className="flex items-start gap-3">
                                <span className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-black font-mono flex items-center justify-center text-xs shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div>
                                  <h4 className="font-black text-sm text-zinc-900 dark:text-white leading-tight flex items-center gap-2">
                                    <span>{sup.costCenter}</span>
                                    <span className="text-[10px] font-normal text-purple-600 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-full">
                                      {isExpanded ? 'إخفاء الأصناف ▲' : 'عرض الأصناف والكميات ▼'}
                                    </span>
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-zinc-500">
                                    {sup.costCenterCode && <span className="font-mono font-bold bg-zinc-200/70 dark:bg-zinc-700 px-1.5 py-0.2 rounded">كود: {sup.costCenterCode}</span>}
                                    <span>• {sup.count} حركات</span>
                                    <span>• {sup.items.size} أصناف</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 justify-between sm:justify-end">
                                <div className="text-left sm:text-right">
                                  <div className="font-black font-mono text-base text-purple-600 dark:text-purple-400">
                                    {sup.totalTons.toFixed(2)} <span className="text-xs font-bold">طن</span>
                                  </div>
                                  <div className="text-[11px] font-mono text-zinc-400">
                                    {sup.totalKg.toLocaleString()} كجم ({percent}%)
                                  </div>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSuppliers([sup.costCenter]);
                                    setActiveView('table');
                                    setKpiModal(null);
                                    toast.success(isRtl ? `تمت تصفية الجدول لعرض حركات (${sup.costCenter})` : `Filtered by ${sup.costCenter}`);
                                  }}
                                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:scale-95"
                                  title={isRtl ? 'تصفية الجدول بهذا المورد' : 'Filter table by this supplier'}
                                >
                                  <Filter className="w-3.5 h-3.5" />
                                  <span>{isRtl ? 'تصفية الجدول' : 'Filter'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Expanded Items & Quantities breakdown */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-2 bg-white/70 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
                                <h5 className="font-bold text-xs text-zinc-700 dark:text-zinc-300">
                                  {isRtl ? 'الأصناف والكميات الموردة من هذا المورد:' : 'Items & quantities supplied by this supplier:'}
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {Array.from(sup.itemsMap.entries()).sort((a, b) => b[1] - a[1]).map(([itemName, itemKg]) => {
                                    const itemSharePercent = sup.totalKg > 0 ? ((itemKg / sup.totalKg) * 100).toFixed(1) : '0';
                                    const itemTons = itemKg / 1000;
                                    return (
                                      <div key={itemName} className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{itemName}</span>
                                        <div className="text-left font-mono">
                                          <span className="font-black text-purple-600 dark:text-purple-400">{itemTons.toFixed(2)} طن</span>
                                          <span className="text-[10px] text-zinc-400 ml-1.5">({itemSharePercent}%)</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB: STORES BREAKDOWN */}
              {kpiModal === 'stores' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-bold">
                      {isRtl ? `إجمالي المخازن: ${storesSummary.length} مخزن` : `Total stores: ${storesSummary.length}`}
                    </span>
                    <button
                      onClick={handleExportStoresExcel}
                      className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold rounded-lg border border-blue-200 dark:border-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'تصدير المخازن Excel' : 'Export Stores'}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {storesSummary
                      .filter(st => modalSearchTerm ? st.storeName.toLowerCase().includes(modalSearchTerm.toLowerCase()) : true)
                      .map((st, idx) => {
                        const percent = stats.totalKg > 0 ? ((st.totalKg / stats.totalKg) * 100).toFixed(1) : '0';
                        const isExpanded = expandedStore === st.storeName;
                        return (
                          <div
                            key={st.storeName}
                            className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 transition-all overflow-hidden"
                          >
                            <div 
                              onClick={() => setExpandedStore(isExpanded ? null : st.storeName)}
                              className="p-4 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                            >
                              <div className="flex items-start gap-3">
                                <span className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-black font-mono flex items-center justify-center text-xs shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div>
                                  <h4 className="font-black text-sm text-zinc-900 dark:text-white leading-tight flex items-center gap-2">
                                    <span>{st.storeName}</span>
                                    <span className="text-[10px] font-normal text-blue-600 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                                      {isExpanded ? 'إخفاء التفاصيل ▲' : 'عرض التفاصيل والكميات ▼'}
                                    </span>
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-zinc-500">
                                    <span>• {st.count} حركات</span>
                                    <span>• {st.itemsCount} أصناف</span>
                                    <span>• {st.suppliersCount} موردين</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 justify-between sm:justify-end">
                                <div className="text-left sm:text-right">
                                  <div className="font-black font-mono text-base text-blue-600 dark:text-blue-400">
                                    {st.totalTons.toFixed(2)} <span className="text-xs font-bold">طن</span>
                                  </div>
                                  <div className="text-[11px] font-mono text-zinc-400">
                                    {st.totalKg.toLocaleString()} كجم ({percent}%)
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Store details (Items breakdown) */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-2 bg-white/70 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
                                <div>
                                  <h5 className="font-bold text-xs text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    {isRtl ? 'الأصناف داخل هذا المخزن:' : 'Items in this store:'}
                                  </h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {Array.from(st.itemsMap.entries()).sort((a, b) => b[1] - a[1]).map(([itemName, itemKg]) => {
                                      const itemTons = itemKg / 1000;
                                      return (
                                        <div key={itemName} className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{itemName}</span>
                                          <span className="font-mono font-black text-blue-600 dark:text-blue-400">{itemTons.toFixed(2)} طن</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 3: TRUCKS & DRIVERS BREAKDOWN */}
              {kpiModal === 'trucks' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-bold">
                      {isRtl ? `أسطول السيارات: ${logisticsSummary.length} سيارة` : `Fleet: ${logisticsSummary.length} trucks`}
                    </span>
                    <button
                      onClick={handleExportLogisticsExcel}
                      className="px-3 py-1 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold rounded-lg border border-teal-200 dark:border-teal-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'تصدير اللوجستيات' : 'Export Fleet'}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {logisticsSummary
                      .filter(t => modalSearchTerm ? t.truckNo.toLowerCase().includes(modalSearchTerm.toLowerCase()) || Array.from(t.drivers).join(' ').toLowerCase().includes(modalSearchTerm.toLowerCase()) : true)
                      .map((t, idx) => (
                        <div
                          key={t.truckNo}
                          className="p-4 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 rounded-2xl border border-zinc-200 dark:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-black font-mono flex items-center justify-center text-xs shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-sm bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 text-zinc-900 dark:text-white">
                                  {t.truckNo}
                                </span>
                                <span className="font-bold text-zinc-700 dark:text-zinc-300 text-xs">
                                  السائق: {Array.from(t.drivers).join(' / ') || 'غير محدد'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                                <span>• {t.count} رحلات</span>
                                <span>• حمولة متوسطة: {t.avgLoadTons.toFixed(2)} طن</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 justify-between sm:justify-end">
                            <div className="text-left sm:text-right">
                              <div className="font-black font-mono text-base text-teal-600 dark:text-teal-400">
                                {t.totalTons.toFixed(2)} <span className="text-xs font-bold">طن</span>
                              </div>
                              <div className="text-[11px] font-mono text-zinc-400">
                                {t.totalKg.toLocaleString()} كجم
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setSearchTerm(t.truckNo);
                                setActiveView('table');
                                setKpiModal(null);
                                toast.success(isRtl ? `تمت تصفية الجدول لسيارة (${t.truckNo})` : `Filtered by truck ${t.truckNo}`);
                              }}
                              className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:scale-95"
                            >
                              <Filter className="w-3.5 h-3.5" />
                              <span>{isRtl ? 'تصفية الجدول' : 'Filter'}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* TAB 4: TOTALS & GENERAL BREAKDOWN */}
              {(kpiModal === 'totals' || kpiModal === 'movements' || kpiModal === 'packaging') && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 max-w-md">
                    <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">إجمالي التوريد</span>
                      <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1 block">
                        {stats.totalTons.toFixed(2)} طن
                      </span>
                      <span className="text-[11px] font-mono text-emerald-600/80 mt-0.5 block">{stats.totalKg.toLocaleString()} كجم</span>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                    <h4 className="font-black text-sm text-zinc-900 dark:text-white">روابط سريعة للتنقل:</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setActiveView('table');
                          setKpiModal(null);
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                        <span>عرض جدول حركات التوريد</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveView('analytics');
                          setKpiModal(null);
                        }}
                        className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>عرض الرسوم البيانية والتحليلات</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-850 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <span className="text-xs text-zinc-500 font-bold">
                {isRtl ? 'نظام توريد الفريش المباشر' : 'Fresh Supply Live System'}
              </span>

              <button
                onClick={() => {
                  setKpiModal(null);
                  setModalSearchTerm('');
                }}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                {isRtl ? 'إغلاق النافذة' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. Detail Modal (عرض وتعديل تفاصيل الحركة وتذكرة المعاينة) */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-3xl w-full border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-800 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sprout className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {isRtl ? 'بيانات إذن استلام ومعاينة الفريش' : 'Fresh Delivery & Inspection Record'}
                  </h3>
                  <p className="text-xs text-emerald-100 font-mono">
                    {isRtl ? `حركة رقم: ${selectedRecord.movementNo} | تاريخ: ${selectedRecord.date}` : `Move #${selectedRecord.movementNo} | ${selectedRecord.date}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Direct Inspection & Intake Details Entry */}
            <div className="p-6 space-y-6 overflow-y-auto text-xs flex-1" dir={isRtl ? 'rtl' : 'ltr'}>
              
              <div className="space-y-6">
                {/* Summary Header Card */}
                <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5 dark:from-emerald-950/60 dark:via-zinc-900 dark:to-emerald-950/30 p-5 rounded-3xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px] tracking-wide">
                        {isRtl ? 'حركة توريد نشطة' : 'Active Movement'}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                        {selectedRecord.date} | كود: {selectedRecord.oldCode || selectedRecord.sapCode || '-'}
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-tight">
                      {selectedRecord.itemName}
                    </h4>
                    <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        <strong>{isRtl ? 'المورد/مركز التكلفة:' : 'Cost Center:'}</strong> {selectedRecord.costCenter || '-'}
                      </span>
                      {selectedRecord.truckNo && (
                        <span className="flex items-center gap-1 font-mono">
                          <Truck className="w-3.5 h-3.5 text-amber-600" />
                          <strong>السيارة:</strong> {selectedRecord.truckNo} {selectedRecord.driver ? `(${selectedRecord.driver})` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/80 dark:bg-zinc-800/80 px-4 py-3 rounded-2xl border border-emerald-200 dark:border-emerald-700/60 text-left sm:text-right shrink-0 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block">الكمية الإجمالية المستلمة:</span>
                    <div className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-400">
                      {selectedRecord.quantityKg.toLocaleString()} <span className="text-xs font-bold">{selectedRecord.unit || 'كجم'}</span>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-zinc-500">
                      = {selectedRecord.quantityTons.toFixed(3)} طن
                    </div>
                  </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSaveRecordDetails(); }} className="space-y-6">
                    
                    {/* SECTION 1: Documents & SAP Execution */}
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-850/60 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-xs">
                          1
                        </div>
                        <h5 className="font-black text-sm text-zinc-900 dark:text-white">
                          {isRtl ? 'بيانات المستندات وأوامر الشراء (PO & SAP)' : 'Documents & PO Data'}
                        </h5>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 1. PO Number */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <Hash className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isRtl ? 'رقم أمر الشراء (PO Number)' : 'PO Number'}</span>
                          </label>
                          <input
                            type="text"
                            value={editForm.po}
                            onChange={(e) => setEditForm({ ...editForm, po: e.target.value })}
                            placeholder={isRtl ? 'مثال: PO-2026-0891 أو رقم المستند' : 'e.g. PO-2026-0891'}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                        </div>

                        {/* 2. SAP Execution Number */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>{isRtl ? 'رقم تنفيذ الساب (SAP Execution No)' : 'SAP Execution No'}</span>
                          </label>
                          <input
                            type="text"
                            value={editForm.sapExecutionNo}
                            onChange={(e) => setEditForm({ ...editForm, sapExecutionNo: e.target.value })}
                            placeholder={isRtl ? 'مثال: 50000xxxxx أو كود التنفيذ' : 'e.g. 50000xxxxx'}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: Source, Pricing & Quality Discount */}
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-850/60 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-xs">
                          2
                        </div>
                        <h5 className="font-black text-sm text-zinc-900 dark:text-white">
                          {isRtl ? 'المصدر، التسعير وخصم الجودة وطريقة السداد' : 'Source, Pricing & Payment'}
                        </h5>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 3. Region / Farm */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-sky-600" />
                            <span>{isRtl ? 'المنطقة / المزرعة / المصدر' : 'Region / Farm'}</span>
                          </label>
                          <input
                            type="text"
                            value={editForm.region}
                            onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                            placeholder={isRtl ? 'اختر أو اكتب المنطقة / المزرعة...' : 'e.g. Siwa, Fayoum...'}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                          {/* Preset Region suggestions requested by user */}
                          <div className="flex items-center gap-1 flex-wrap pt-1.5">
                            {[
                              'الفيوم',
                              'طريق مصر الاسكندريه الصحراوي',
                              'الاسماعليه',
                              'البره الثاني ( راس سدر )',
                              'العريش',
                              'المنيا',
                              'المغره',
                              'سيويه'
                            ].map(reg => (
                              <button
                                key={reg}
                                type="button"
                                onClick={() => setEditForm({ ...editForm, region: reg })}
                                className={`px-2.5 py-1 text-[11px] rounded-lg transition-colors cursor-pointer border ${
                                  editForm.region === reg
                                    ? 'bg-sky-600 text-white border-sky-700 font-black shadow-2xs'
                                    : 'bg-white dark:bg-zinc-800 hover:bg-sky-50 dark:hover:bg-sky-950/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                                }`}
                              >
                                + {reg}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 4. Base Price per kg */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                            <span>{isRtl ? 'السعر الأساسي للكيلو (ج.م)' : 'Base Price per Kg (EGP)'}</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editForm.price}
                              onChange={(e) => setEditForm({ ...editForm, price: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                              placeholder="0.00"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                            />
                            <span className="absolute left-3 top-2.5 text-zinc-400 text-[11px] font-bold">ج.م/كجم</span>
                          </div>
                        </div>

                        {/* 5. Quality Discount Percent */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <Percent className="w-3.5 h-3.5 text-rose-600" />
                            <span>{isRtl ? 'نسبة خصم الجودة (%)' : 'Quality Discount (%)'}</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={editForm.qualityDiscountPercent}
                              onChange={(e) => setEditForm({ ...editForm, qualityDiscountPercent: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                            />
                            <span className="absolute left-3 top-2.5 text-zinc-400 text-[11px] font-bold">%</span>
                          </div>
                          {/* Quick Discount Presets */}
                          <div className="flex items-center gap-1 flex-wrap pt-1.5">
                            {[0, 1, 2, 3, 5, 7, 10, 15].map(pct => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setEditForm({ ...editForm, qualityDiscountPercent: pct })}
                                className={`px-2 py-0.5 text-[10px] rounded-md transition-colors cursor-pointer border ${
                                  Number(editForm.qualityDiscountPercent) === pct
                                    ? 'bg-rose-600 text-white border-rose-700 font-bold'
                                    : 'bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 6. Payment Method */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                            <span>{isRtl ? 'طريقة السداد' : 'Payment Method'}</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editForm.paymentMethod}
                              onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                              placeholder={isRtl ? 'اختر أو اكتب طريقة السداد...' : 'Payment...'}
                              className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              {['نقدي', 'دفعات توريد'].map(pay => (
                                <button
                                  key={pay}
                                  type="button"
                                  onClick={() => setEditForm({ ...editForm, paymentMethod: pay })}
                                  className={`px-3 py-2.5 text-xs rounded-xl transition-colors cursor-pointer border whitespace-nowrap font-bold ${
                                    editForm.paymentMethod === pay
                                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                                      : 'bg-white dark:bg-zinc-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                                  }`}
                                >
                                  {pay}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Real-time Calculation Summary Breakdown */}
                      {(() => {
                        const baseP = Number(editForm.price) || 0;
                        const discPct = Number(editForm.qualityDiscountPercent) || 0;
                        const discAmount = baseP * (discPct / 100);
                        const netP = Math.max(0, baseP - discAmount);
                        const totalNetVal = netP * selectedRecord.quantityKg;

                        if (baseP <= 0 && discPct <= 0) return null;

                        return (
                          <div className="p-4 bg-gradient-to-r from-amber-50/80 via-emerald-50/80 to-emerald-100/60 dark:from-zinc-800 dark:via-zinc-800/90 dark:to-emerald-950/40 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-2xs mt-2">
                            <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-emerald-200 dark:border-zinc-700">
                              <span className="font-black text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                                {isRtl ? 'بيان التسعير وخصم الجودة الحسابي التلقائي:' : 'Automated Pricing & Discount Breakdown:'}
                              </span>
                              {discPct > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  {isRtl ? `خصم جودة مقتطع: ${discPct}%` : `Discount: ${discPct}%`}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
                              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                                <span className="text-[10px] font-sans font-bold text-zinc-500 block">{isRtl ? 'السعر الأساسي' : 'Base Price'}</span>
                                <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">{baseP.toFixed(2)} ج.م</span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                                <span className="text-[10px] font-sans font-bold text-rose-600 dark:text-rose-400 block">{isRtl ? 'قيمة الخصم/كجم' : 'Discount/Kg'}</span>
                                <span className="text-xs font-black text-rose-600 dark:text-rose-400">-{discAmount.toFixed(2)} ج.م</span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700">
                                <span className="text-[10px] font-sans font-bold text-emerald-700 dark:text-emerald-300 block">{isRtl ? 'صافي السعر للكيلو' : 'Net Price/Kg'}</span>
                                <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{netP.toFixed(2)} ج.م</span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                                <span className="text-[10px] font-sans font-bold text-emerald-100 block">{isRtl ? 'إجمالي القيمة المستحقة' : 'Net Total Value'}</span>
                                <span className="text-xs font-black">{totalNetVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* SECTION 3: Initial Quality Analysis */}
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-850/60 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-black text-xs">
                            3
                          </div>
                          <label className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <FlaskConical className="w-3.5 h-3.5 text-teal-600" />
                            <span>{isRtl ? 'التحليل الأولي للجودة والمواصفات (اختر النتيجة):' : 'Initial Quality Analysis:'}</span>
                          </label>
                        </div>
                        {editForm.initialAnalysis && (
                          <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, initialAnalysis: '' })}
                            className="text-[11px] font-bold text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            {isRtl ? 'إلغاء التحديد ✕' : 'Clear ✕'}
                          </button>
                        )}
                      </div>

                      {/* 3 Main Choice Cards */}
                      <div className="grid grid-cols-3 gap-3">
                        
                        {/* Option 1: خالي مبيدات */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm(prev => ({
                              ...prev,
                              initialAnalysis: prev.initialAnalysis === 'خالي مبيدات' ? '' : 'خالي مبيدات'
                            }));
                          }}
                          className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                            editForm.initialAnalysis === 'خالي مبيدات' || editForm.initialAnalysis.includes('خالي مبيدات')
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20 scale-[1.02]'
                              : 'bg-white dark:bg-zinc-800/80 border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-400 hover:bg-emerald-50/50 text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            editForm.initialAnalysis === 'خالي مبيدات' || editForm.initialAnalysis.includes('خالي مبيدات')
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            <Leaf className="w-4 h-4" />
                          </div>
                          <span className="font-black text-xs">{isRtl ? 'خالي مبيدات' : 'Pesticide-Free'}</span>
                          <span className={`text-[10px] ${
                            editForm.initialAnalysis === 'خالي مبيدات' || editForm.initialAnalysis.includes('خالي مبيدات')
                              ? 'text-emerald-100'
                              : 'text-zinc-400'
                          }`}>
                            {isRtl ? 'مطابق وسليم' : 'Clean / Safe'}
                          </span>
                        </button>

                        {/* Option 2: مبيدات */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm(prev => ({
                              ...prev,
                              initialAnalysis: prev.initialAnalysis === 'مبيدات' ? '' : 'مبيدات'
                            }));
                          }}
                          className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                            editForm.initialAnalysis === 'مبيدات' || (editForm.initialAnalysis.includes('مبيدات') && !editForm.initialAnalysis.includes('خالي'))
                              ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/20 scale-[1.02]'
                              : 'bg-white dark:bg-zinc-800/80 border-rose-200 dark:border-rose-800/50 hover:border-rose-400 hover:bg-rose-50/50 text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            editForm.initialAnalysis === 'مبيدات' || (editForm.initialAnalysis.includes('مبيدات') && !editForm.initialAnalysis.includes('خالي'))
                              ? 'bg-white/20 text-white'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <span className="font-black text-xs">{isRtl ? 'مبيدات' : 'Pesticides'}</span>
                          <span className={`text-[10px] ${
                            editForm.initialAnalysis === 'مبيدات' || (editForm.initialAnalysis.includes('مبيدات') && !editForm.initialAnalysis.includes('خالي'))
                              ? 'text-rose-100'
                              : 'text-zinc-400'
                          }`}>
                            {isRtl ? 'يحتوي متبقيات' : 'Contains Res.'}
                          </span>
                        </button>

                        {/* Option 3: عشوائي */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm(prev => ({
                              ...prev,
                              initialAnalysis: prev.initialAnalysis === 'عشوائي' ? '' : 'عشوائي'
                            }));
                          }}
                          className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                            editForm.initialAnalysis === 'عشوائي' || editForm.initialAnalysis.includes('عشوائي')
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20 scale-[1.02]'
                              : 'bg-white dark:bg-zinc-800/80 border-indigo-200 dark:border-indigo-800/50 hover:border-indigo-400 hover:bg-indigo-50/50 text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            editForm.initialAnalysis === 'عشوائي' || editForm.initialAnalysis.includes('عشوائي')
                              ? 'bg-white/20 text-white'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}>
                            <Shuffle className="w-4 h-4" />
                          </div>
                          <span className="font-black text-xs">{isRtl ? 'عشوائي' : 'Random Spot'}</span>
                          <span className={`text-[10px] ${
                            editForm.initialAnalysis === 'عشوائي' || editForm.initialAnalysis.includes('عشوائي')
                              ? 'text-indigo-100'
                              : 'text-zinc-400'
                          }`}>
                            {isRtl ? 'فحص عينة عشوائية' : 'Spot Check'}
                          </span>
                        </button>

                      </div>

                      {/* Optional Notes / Specs Input */}
                      <input
                        type="text"
                        value={editForm.initialAnalysis}
                        onChange={(e) => setEditForm({ ...editForm, initialAnalysis: e.target.value })}
                        placeholder={isRtl ? 'أو اكتب نصاً مفصلاً (مثال: خالي مبيدات - نسبة نضج 90%)...' : 'Or enter custom detailed notes...'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    {/* SECTION 4: Processing Routing (التوجيه) */}
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-850/60 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black text-xs">
                            4
                          </div>
                          <label className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <Route className="w-3.5 h-3.5 text-purple-600" />
                            <span>{isRtl ? 'توجيه المعالجة والتصنيع:' : 'Processing Routing:'}</span>
                          </label>
                        </div>
                        {editForm.routing && (
                          <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, routing: '' })}
                            className="text-[11px] font-bold text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            {isRtl ? 'إلغاء التحديد ✕' : 'Clear ✕'}
                          </button>
                        )}
                      </div>

                      {/* Routing Preset Buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { key: 'مياه وملح', label: isRtl ? 'مياه وملح' : 'Water & Salt', desc: isRtl ? 'تخليل / حفظ' : 'Pickling' },
                          { key: 'مطبوخ', label: isRtl ? 'مطبوخ' : 'Cooked', desc: isRtl ? 'حراري / تسوية' : 'Cooked' },
                          { key: 'زيت', label: isRtl ? 'زيت' : 'Oil Extraction', desc: isRtl ? 'عصر زيتون' : 'Oil Pressing' },
                          { key: 'أخري', label: isRtl ? 'أخري' : 'Other', desc: isRtl ? 'توجيه آخر' : 'Other Routing' },
                        ].map(item => {
                          const isSelected = editForm.routing === item.key || editForm.routing.includes(item.key);
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => {
                                setEditForm(prev => ({
                                  ...prev,
                                  routing: prev.routing === item.key ? '' : item.key
                                }));
                              }}
                              className={`p-3 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-700 shadow-md shadow-purple-600/20 scale-[1.02]'
                                  : 'bg-white dark:bg-zinc-800/80 border-purple-200 dark:border-purple-800/50 hover:border-purple-400 hover:bg-purple-50/50 text-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              <span className="font-black text-xs">{item.label}</span>
                              <span className={`text-[10px] ${isSelected ? 'text-purple-100' : 'text-zinc-400'}`}>
                                {item.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Routing Input */}
                      <input
                        type="text"
                        value={editForm.routing}
                        onChange={(e) => setEditForm({ ...editForm, routing: e.target.value })}
                        placeholder={isRtl ? 'أو اكتب تفاصيل التوجيه أو ملاحظات التصنيع...' : 'Or enter custom routing details...'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden mt-2"
                      />
                    </div>

                    {/* SECTION 5: Additional Notes */}
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-850/60 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{isRtl ? 'ملاحظات إضافية' : 'Additional Notes'}</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder={isRtl ? 'أي ملاحظات خاصة بالتسليم أو الحسابات...' : 'Additional delivery/accounting notes...'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Save Button */}
                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(null)}
                        className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl text-xs cursor-pointer"
                      >
                        {isRtl ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingRecord}
                        className="px-7 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                      >
                        {isSavingRecord ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>{isRtl ? 'حفظ البيانات والمزامنة' : 'Save Details'}</span>
                      </button>
                    </div>

                  </form>
                </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-850 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyRecord(selectedRecord)}
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'نسخ البيانات' : 'Copy'}</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Baseline Comparison Modal (مثل رصيد الزيتون) */}
      <AnimatePresence>
        {isComparisonModalOpen && comparison.hasChanges && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-3xl w-full p-6 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-900 dark:text-white">
                      {isRtl ? 'مقارنة رصيد التوريد بالرصيد المرجعي المعتمد' : 'Supply Balance Baseline Comparison'}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {isRtl ? 'تفاصيل التغييرات والفروقات في كميات الأصناف الموردة' : 'Detailed variances between current intake and baseline'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsComparisonModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 my-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl custom-scrollbar">
                <table className="w-full text-right text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
                  <thead className="bg-zinc-50 dark:bg-zinc-800/80 sticky top-0 font-bold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3">{isRtl ? 'الصنف / الكود' : 'Item / Code'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الرصيد المرجعي (طن)' : 'Baseline (T)'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الرصيد الحالي (طن)' : 'Current (T)'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الفارق (طن)' : 'Variance (T)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {comparison.details.map((item, idx) => (
                      <tr key={`comp-${item.key}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="p-3">
                          <div className="font-bold text-zinc-900 dark:text-white">{item.description}</div>
                          <div className="font-mono text-[10px] text-zinc-400">{item.key}</div>
                        </td>
                        <td className="p-3 text-center font-mono">
                          {(item.oldQty / 1000).toFixed(2)}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          {(item.newQty / 1000).toFixed(2)}
                        </td>
                        <td className={`p-3 text-center font-mono font-black ${item.diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {item.diff > 0 ? `+${(item.diff / 1000).toFixed(2)}` : (item.diff / 1000).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="text-xs font-bold text-zinc-500">
                  {isRtl ? `إجمالي الفارق: ${(comparison.totalDiff / 1000).toFixed(2)} طن` : `Net Variance: ${(comparison.totalDiff / 1000).toFixed(2)} T`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsComparisonModalOpen(false)}
                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
                  >
                    {isRtl ? 'إغلاق' : 'Close'}
                  </button>
                  <button
                    onClick={handleAcceptNewSupplyBalance}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    {isRtl ? 'اعتماد الرصيد الجديد' : 'Accept New Balance'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Edit Modal */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-purple-600" />
                <span>{isRtl ? `تعديل جماعي لـ (${selectedRowIds.length}) صف` : `Bulk Edit (${selectedRowIds.length}) Rows`}</span>
              </h3>
              <button
                onClick={() => setIsBulkEditModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isRtl ? 'رقم أمر الشراء / التوريد (PO):' : 'Purchase Order (PO):'}
                </label>
                <input
                  type="text"
                  value={bulkEditForm.po}
                  onChange={(e) => setBulkEditForm({ ...bulkEditForm, po: e.target.value })}
                  placeholder={isRtl ? 'أدخل رقم أمر الشراء المشترك (اختياري)...' : 'Enter common PO number (optional)...'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isRtl ? 'رقم تنفيذ الساب (SAP Execution):' : 'SAP Execution No:'}
                </label>
                <input
                  type="text"
                  value={bulkEditForm.sapExecutionNo}
                  onChange={(e) => setBulkEditForm({ ...bulkEditForm, sapExecutionNo: e.target.value })}
                  placeholder={isRtl ? 'أدخل رقم تنفيذ الساب المشترك (اختياري)...' : 'Enter common SAP execution no (optional)...'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 p-3 rounded-xl leading-relaxed">
                {isRtl 
                  ? 'ملاحظة: سيتم تطبيق القيم المدخلة على جميع الصفوف المحددة وتحديثها في التخزين السحابي والمحلي فوراً.' 
                  : 'Note: Entered values will be applied to all selected rows and updated in cloud & local storage immediately.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsBulkEditModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleBulkSave}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition-all cursor-pointer"
              >
                {isRtl ? 'تطبيق وحفظ التعديلات' : 'Apply & Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

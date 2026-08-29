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
  CircleDot
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
  const [poFilter, setPoFilter] = useState<'ALL' | 'EXISTS' | 'MISSING'>('ALL');
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
    postDocument: true,
    store: true,
    actions: true
  });
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  // Parse raw rows into typed objects
  const processCsvData = (rows: any[]): FreshSupplyRecord[] => {
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

    // A) Link by same non-empty Cost Center Code (كود مركز التكلفة)
    const codeToFirstSupplier = new Map<string, string>();
    validRows.forEach(row => {
      const raw = String(row['مركز التكلفة'] || '').trim();
      const code = String(row['كود مركز التكلفة'] || '').trim();
      if (raw && code) {
        if (!codeToFirstSupplier.has(code)) {
          codeToFirstSupplier.set(code, raw);
        } else {
          supplierUf.union(raw, codeToFirstSupplier.get(code)!);
        }
      }
    });

    // B) Link by exact normalized key and token subset / extension (e.g. "الروضة" vs "الروضة-شبانة-عبدالعليم)")
    for (let i = 0; i < uniqueRawSuppliers.length; i++) {
      const rawA = uniqueRawSuppliers[i];
      const normKeyA = normalizeSupplierKey(rawA);
      const tokensA = extractSupplierTokens(rawA);
      const filteredTokensA = tokensA.filter(t => !GENERIC_SUPPLIER_STOPWORDS.has(t));
      const effectiveTokensA = filteredTokensA.length > 0 ? filteredTokensA : tokensA;
      const setA = new Set(effectiveTokensA);

      for (let j = i + 1; j < uniqueRawSuppliers.length; j++) {
        const rawB = uniqueRawSuppliers[j];
        const normKeyB = normalizeSupplierKey(rawB);

        // Exact match of normalized words in any order
        if (normKeyA && normKeyA === normKeyB) {
          supplierUf.union(rawA, rawB);
          continue;
        }

        const tokensB = extractSupplierTokens(rawB);
        const filteredTokensB = tokensB.filter(t => !GENERIC_SUPPLIER_STOPWORDS.has(t));
        const effectiveTokensB = filteredTokensB.length > 0 ? filteredTokensB : tokensB;
        const setB = new Set(effectiveTokensB);

        // Token subset match (e.g. ['روضه'] is a subset of ['روضه', 'شبانه', 'عبدالعليم'])
        const isASubsetOfB = effectiveTokensA.length > 0 && effectiveTokensA.every(t => setB.has(t));
        const isBSubsetOfA = effectiveTokensB.length > 0 && effectiveTokensB.every(t => setA.has(t));

        if (isASubsetOfB || isBSubsetOfA) {
          const shorter = isASubsetOfB ? effectiveTokensA : effectiveTokensB;
          if (shorter.length >= 2 || (shorter.length === 1 && !COMMON_GENERIC_NAMES.has(shorter[0]) && shorter[0].length >= 3)) {
            supplierUf.union(rawA, rawB);
            continue;
          }
        }

        // Substring match in normalized compact form
        const compactA = normKeyA.replace(/\s+/g, '');
        const compactB = normKeyB.replace(/\s+/g, '');
        if (compactA && compactB) {
          if ((compactA.length >= 4 && compactB.includes(compactA)) || (compactB.length >= 4 && compactA.includes(compactB))) {
            const shorterCompact = compactA.length <= compactB.length ? compactA : compactB;
            if (!COMMON_GENERIC_NAMES.has(shorterCompact)) {
              supplierUf.union(rawA, rawB);
            }
          }
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
    // If multiple item names exist for a single code, standardize to ONE single canonical name
    const itemUf = new UnionFind<string>();
    const allItemCodeKeys = new Set<string>();

    validRows.forEach(row => {
      const sap = String(row['كود ساب'] || row['كود SAP'] || row['SAP'] || row['كود الصنف'] || row['كود'] || '').trim();
      const old = String(row['كود قديم'] || row['الكود القديم'] || '').trim();

      if (sap) allItemCodeKeys.add(`sap:${sap}`);
      if (old) allItemCodeKeys.add(`old:${old}`);
      if (sap && old) {
        itemUf.union(`sap:${sap}`, `old:${old}`);
      }
    });

    // Collect name frequencies per item cluster
    interface ItemClusterInfo {
      sapCodes: Set<string>;
      oldCodes: Set<string>;
      nameFrequencies: Map<string, number>;
    }
    const itemClusters = new Map<string, ItemClusterInfo>();

    validRows.forEach(row => {
      const sap = String(row['كود ساب'] || row['كود SAP'] || row['SAP'] || row['كود الصنف'] || row['كود'] || '').trim();
      const old = String(row['كود قديم'] || row['الكود القديم'] || '').trim();
      const rawItemName = String(row['اسم الصنف'] || row['الصنف'] || row['Item Name'] || row['الوصف'] || '').trim();

      let clusterKey = '';
      if (sap) {
        clusterKey = itemUf.find(`sap:${sap}`);
      } else if (old) {
        clusterKey = itemUf.find(`old:${old}`);
      }

      if (clusterKey) {
        if (!itemClusters.has(clusterKey)) {
          itemClusters.set(clusterKey, {
            sapCodes: new Set(),
            oldCodes: new Set(),
            nameFrequencies: new Map()
          });
        }
        const cluster = itemClusters.get(clusterKey)!;
        if (sap) cluster.sapCodes.add(sap);
        if (old) cluster.oldCodes.add(old);
        if (rawItemName) {
          cluster.nameFrequencies.set(rawItemName, (cluster.nameFrequencies.get(rawItemName) || 0) + 1);
        }
      }
    });

    // Determine the single canonical itemName, sapCode, and oldCode for each item group
    const canonicalItemByCode = new Map<string, {
      itemName: string;
      sapCode: string;
      oldCode: string;
    }>();

    itemClusters.forEach((cluster) => {
      let bestName = '';
      let maxCount = -1;
      cluster.nameFrequencies.forEach((count, name) => {
        if (count > maxCount || (count === maxCount && name.length > bestName.length)) {
          maxCount = count;
          bestName = name;
        }
      });

      const bestSap = Array.from(cluster.sapCodes)[0] || '';
      const bestOld = Array.from(cluster.oldCodes)[0] || '';

      const canonical = {
        itemName: bestName,
        sapCode: bestSap,
        oldCode: bestOld
      };

      cluster.sapCodes.forEach(s => canonicalItemByCode.set(`sap:${s}`, canonical));
      cluster.oldCodes.forEach(o => canonicalItemByCode.set(`old:${o}`, canonical));
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

      const itemKey = rawSapCode ? `sap:${rawSapCode}` : (rawOldCode ? `old:${rawOldCode}` : '');
      if (itemKey && canonicalItemByCode.has(itemKey)) {
        const itemInfo = canonicalItemByCode.get(itemKey)!;
        if (itemInfo.itemName) {
          finalItemName = itemInfo.itemName;
        }
        finalSapCode = finalSapCode || itemInfo.sapCode;
        finalOldCode = finalOldCode || itemInfo.oldCode;
      }

      return {
        id: `fresh-${idx}-${row['رقم الحركة'] || Math.random().toString(36).substr(2, 9)}`,
        date: unifiedDate,
        originalDate: dateStr,
        parsedDate: parsedDate,
        store: String(row['المخزن'] || '').trim(),
        movementType: String(row['نوع الحركة'] || '').trim(),
        movementNo: String(row['رقم الحركة'] || '').trim(),
        truckNo: String(row['رقم سيارة'] || '').trim(),
        driver: String(row['السائق'] || '').trim(),
        vendorDocNo: String(row['رقم مستند المورد'] || '').trim(),
        costCenterCode: finalCostCenterCode,
        po: String(row['PO'] || '').trim(),
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
      // Check cache first if initial load
      if (!isManualSync) {
        const cached = localStorage.getItem(STORAGE_CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setData(processCsvData(parsed));
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
            const processed = processCsvData(results.data);
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

      // PO Filter
      if (poFilter !== 'ALL') {
        const hasPO = record.po && record.po.trim() !== '';
        if (poFilter === 'EXISTS' && !hasPO) return false;
        if (poFilter === 'MISSING' && hasPO) return false;
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
    poFilter,
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
    setPoFilter('ALL');
    setSelectedItems([]);
    setSelectedSuppliers([]);
    setSelectedStores([]);
    setSelectedLocations([]);
    setSelectedVarieties([]);
    setDateFilter({ mode: 'all' });
    toast.info(isRtl ? 'تمت إعادة ضبط جميع الفلاتر' : 'All filters reset');
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const exportRows = filteredData.map((r, idx) => ({
        'م': idx + 1,
        'التاريخ': r.date,
        'المخزن': r.store,
        'نوع الحركة': r.movementType,
        'رقم الحركة': r.movementNo,
        'اسم الصنف': r.itemName,
        'الكمية (كجم)': r.quantityKg,
        'الكمية (طن)': parseFloat(r.quantityTons.toFixed(3)),
        'الوحدة': r.unit,
        'مركز التكلفة / المورد': r.costCenter,
        'رقم سيارة': r.truckNo,
        'السائق': r.driver,
        'الموقع / التعبئة': r.location,
        'رقم التانك': r.tankNo,
        'كود ساب': r.sapCode,
        'كود قديم': r.oldCode,
        'أمر الشراء PO': r.po,
        'POST DOCUMENT': r.postDocument,
        'RESERVATION': r.reservation,
        'كود مركز التكلفة': r.costCenterCode,
        'رقم مستند المورد': r.vendorDocNo
      }));

      // Add summary row
      exportRows.push({
        'م': 'الإجمالي' as any,
        'التاريخ': '',
        'المخزن': '',
        'نوع الحركة': '',
        'رقم الحركة': '',
        'اسم الصنف': `عدد الأصناف: ${stats.uniqueItems}`,
        'الكمية (كجم)': stats.totalKg,
        'الكمية (طن)': parseFloat(stats.totalTons.toFixed(3)),
        'الوحدة': 'كجم',
        'مركز التكلفة / المورد': `عدد الموردين: ${stats.uniqueSuppliers}`,
        'رقم سيارة': `عدد السيارات: ${stats.uniqueTrucks}`,
        'السائق': `عدد السائقين: ${stats.uniqueDrivers}`,
        'الموقع / التعبئة': '',
        'رقم التانك': '',
        'كود ساب': '',
        'كود قديم': '',
        'أمر الشراء PO': '',
        'POST DOCUMENT': '',
        'RESERVATION': '',
        'كود مركز التكلفة': '',
        'رقم مستند المورد': ''
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'توريد الفريش');

      // Set column widths
      worksheet['!cols'] = [
        { wch: 5 },  // index
        { wch: 12 }, // date
        { wch: 10 }, // store
        { wch: 10 }, // move type
        { wch: 12 }, // move no
        { wch: 30 }, // item name
        { wch: 15 }, // kg
        { wch: 15 }, // tons
        { wch: 10 }, // unit
        { wch: 25 }, // supplier
        { wch: 12 }, // truck
        { wch: 20 }, // driver
        { wch: 12 }, // location
        { wch: 12 }, // tank
        { wch: 15 }, // sap
        { wch: 12 }, // old code
        { wch: 15 }, // PO
        { wch: 18 }, // post doc
        { wch: 15 }, // res
        { wch: 15 }, // cost center code
        { wch: 18 }  // vendor doc
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
        r.po
      ]);

      (doc as any).autoTable({
        head: [['#', 'Date', 'Move No', 'Item Name', 'KG', 'Tons', 'Supplier / Farm', 'Truck', 'Driver', 'Pkg', 'SAP Code', 'PO No']],
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
          {(searchTerm || selectedItems.length > 0 || selectedSuppliers.length > 0 || selectedStores.length > 0 || selectedLocations.length > 0 || selectedVarieties.length > 0 || dateFilter.mode !== 'all' || mainCategoryFilter !== 'ALL' || poFilter !== 'ALL') && (
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
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {Object.keys(visibleColumns).map(colKey => {
                    const labels: Record<string, string> = {
                      index: 'م',
                      date: 'التاريخ',
                      movementNo: 'رقم الحركة',
                      itemName: 'اسم الصنف',
                      quantityKg: 'الكمية (كجم/طن)',
                      costCenter: 'المورد / مركز التكلفة',
                      truckDriver: 'السيارة والسائق',
                      location: 'الموقع والتعبئة',
                      sapCode: 'كود ساب',
                      po: 'أمر الشراء PO',
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

        {/* Sub-Filters: Category on one side, PO on the other side */}
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

          {/* PO Filter (يوجد / لا يوجد) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">
              {isRtl ? 'أمر التوريد (PO):' : 'PO:'}
            </span>
            <button
              onClick={() => setPoFilter('ALL')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                poFilter === 'ALL'
                  ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {isRtl ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setPoFilter('EXISTS')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                poFilter === 'EXISTS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{isRtl ? 'يوجد' : 'Yes'}</span>
            </button>
            <button
              onClick={() => setPoFilter('MISSING')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                poFilter === 'MISSING'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{isRtl ? 'لا يوجد' : 'No'}</span>
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
                    <th className="py-3.5 px-3 w-12 text-center">#</th>
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
                    <td colSpan={13} className="py-12 text-center text-zinc-500 dark:text-zinc-400">
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
                            {rowNumber}
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
                          <td className="py-3 px-3">
                            <div className="font-black text-zinc-900 dark:text-white leading-tight">
                              {record.itemName}
                            </div>
                            {record.oldCode && (
                              <span className="text-[10px] text-zinc-400 font-mono">
                                كود: {record.oldCode}
                              </span>
                            )}
                          </td>
                        )}

                        {visibleColumns.quantityKg && (
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-mono font-black text-zinc-900 dark:text-white text-sm">
                              {record.quantityKg.toLocaleString('en-US')} <span className="text-[10px] font-bold text-zinc-500">{record.unit || 'كجم'}</span>
                            </div>
                            <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              = {record.quantityTons.toFixed(3)} طن
                            </div>
                          </td>
                        )}

                        {visibleColumns.costCenter && (
                          <td className="py-3 px-3">
                            <div className="font-bold text-zinc-800 dark:text-zinc-200">
                              {record.costCenter || '-'}
                            </div>
                            {record.costCenterCode && (
                              <span className="text-[10px] text-zinc-400 font-mono">
                                كود: {record.costCenterCode}
                              </span>
                            )}
                          </td>
                        )}

                        {visibleColumns.truckDriver && (
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-black text-amber-900 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-300 dark:border-amber-800 text-[11px]">
                                {record.truckNo || '-'}
                              </span>
                              <span className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                                {record.driver || ''}
                              </span>
                            </div>
                          </td>
                        )}

                        {visibleColumns.location && (
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                              record.location.includes('تانك')
                                ? 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800'
                                : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                            }`}>
                              {record.location || 'برميل'} {record.tankNo ? `(${record.tankNo})` : ''}
                            </span>
                          </td>
                        )}

                        {visibleColumns.sapCode && (
                          <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-zinc-600 dark:text-zinc-400 text-[11px]">
                            {record.sapCode || '-'}
                          </td>
                        )}

                        {visibleColumns.po && (
                          <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-zinc-700 dark:text-zinc-300 text-[11px]">
                            {record.po || '-'}
                          </td>
                        )}

                        {visibleColumns.postDocument && (
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-zinc-500 dark:text-zinc-400 text-[10.5px]">
                            {record.postDocument || '-'}
                          </td>
                        )}

                        {visibleColumns.store && (
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              {record.store || 'GPS'}
                            </span>
                          </td>
                        )}

                        {visibleColumns.actions && (
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setSelectedRecord(record)}
                                className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                                title={isRtl ? 'عرض تفاصيل الحركة' : 'View movement details'}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
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

      {/* 7. Detail Modal (عرض تفاصيل الحركة) */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sprout className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {isRtl ? 'تفاصيل إذن استلام الفريش' : 'Fresh Delivery Movement Details'}
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

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
              
              {/* Main Item & Quantity Box */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">اسم الصنف المستلم (الموحد):</span>
                  <h2 className="text-base font-black text-zinc-900 dark:text-white mt-0.5">{selectedRecord.itemName}</h2>
                  {selectedRecord.originalItemName && selectedRecord.originalItemName !== selectedRecord.itemName && (
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      {isRtl ? `الاسم الأصلي بالملف: ${selectedRecord.originalItemName}` : `Original in sheet: ${selectedRecord.originalItemName}`}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">الوزن المستلم:</span>
                  <span className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-400">
                    {selectedRecord.quantityKg.toLocaleString()} {selectedRecord.unit || 'كجم'}
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-500 block">
                    ({selectedRecord.quantityTons.toFixed(3)} طن)
                  </span>
                </div>
              </div>

              {/* 2x4 Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">رقم الحركة</span>
                  <strong className="text-zinc-900 dark:text-white font-mono text-sm">{selectedRecord.movementNo || '-'}</strong>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">تاريخ الحركة</span>
                  <strong className="text-zinc-900 dark:text-white font-mono text-sm">{selectedRecord.date || '-'}</strong>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">نوع الحركة</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedRecord.movementType || 'اضافة'}</strong>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">رقم السيارة</span>
                  <strong className="text-zinc-900 dark:text-white font-mono text-sm bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-300 dark:border-amber-800 inline-block">
                    {selectedRecord.truckNo || '-'}
                  </strong>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">اسم السائق</span>
                  <strong className="text-zinc-900 dark:text-white font-bold">{selectedRecord.driver || '-'}</strong>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">الموقع / التعبئة</span>
                  <strong className="text-zinc-900 dark:text-white font-bold">
                    {selectedRecord.location || 'برميل'} {selectedRecord.tankNo ? `(تانك ${selectedRecord.tankNo})` : ''}
                  </strong>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 col-span-2">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">المورد / مركز التكلفة</span>
                  <strong className="text-zinc-900 dark:text-white font-black text-sm">{selectedRecord.costCenter || '-'}</strong>
                  {selectedRecord.originalCostCenter && selectedRecord.originalCostCenter !== selectedRecord.costCenter && (
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      {isRtl ? `الاسم الأصلي بالملف: ${selectedRecord.originalCostCenter}` : `Original: ${selectedRecord.originalCostCenter}`}
                    </span>
                  )}
                  {selectedRecord.costCenterCode && (
                    <span className="text-[10px] text-zinc-500 font-mono block">كود المركز: {selectedRecord.costCenterCode}</span>
                  )}
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">المخزن المستلم</span>
                  <strong className="text-zinc-900 dark:text-white font-bold">{selectedRecord.store || 'GPS'}</strong>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">أمر الشراء (PO)</span>
                  <strong className="text-zinc-900 dark:text-white font-mono text-sm">{selectedRecord.po || '-'}</strong>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">POST DOCUMENT</span>
                  <strong className="text-zinc-900 dark:text-white font-mono text-sm">{selectedRecord.postDocument || '-'}</strong>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">كود ساب (SAP Code)</span>
                  <strong className="text-zinc-900 dark:text-white font-mono text-sm">{selectedRecord.sapCode || '-'}</strong>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">كود قديم</span>
                  <strong className="text-zinc-900 dark:text-white font-mono text-sm">{selectedRecord.oldCode || '-'}</strong>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">رقم مستند المورد</span>
                  <strong className="text-zinc-900 dark:text-white font-mono text-sm">{selectedRecord.vendorDocNo || '-'}</strong>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="text-zinc-400 block text-[10px] mb-0.5">RESERVATION</span>
                  <strong className="text-zinc-900 dark:text-white font-mono text-sm">{selectedRecord.reservation || '-'}</strong>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-850 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => handleCopyRecord(selectedRecord)}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isRtl ? 'نسخ البيانات' : 'Copy'}</span>
              </button>

              <button
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
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

    </div>
  );
}

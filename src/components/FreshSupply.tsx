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
  RotateCcw
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
import { DateRangeFilter, DateFilterValue, getPresetDates } from './DateRangeFilter';
import { Language, UserProfile } from '../types';
import { translations } from '../i18n';
import { toast } from 'sonner';

const FRESH_GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQN1nH0TPk6-NpHHIWN6xQ1RKnjut-nzUgga3-zzB1ydF9f2L3--JPiwu6qJHnCcFymfsZj3gTzKiIo/pub?output=csv";
const STORAGE_CACHE_KEY = "fresh_supply_data_cache";
const STORAGE_TIME_KEY = "fresh_supply_last_synced";

export interface FreshSupplyRecord {
  id: string;
  date: string;              // التاريخ (e.g. 3-Aug)
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
  itemName: string;          // اسم الصنف
  unit: string;              // الوحدة (e.g. كيلو)
  costCenter: string;        // مركز التكلفة / المورد (e.g. جمال سالم / الروقا)
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
  if (dLower.includes('manzanilla') || dLower.includes('manzanila') || dLower.includes('منزان') || dLower.includes('منزن')) return 'Manzanilla';
  if (dLower.includes('picual') || dLower.includes('pical') || dLower.includes('بيكوال') || dLower.includes('بكوال')) return 'Picual';
  if (dLower.includes('akas') || dLower.includes('akass') || dLower.includes('عقص') || dLower.includes('عقيص') || dLower.includes('اقيص')) return 'Akas';
  if (dLower.includes('azizi') || dLower.includes('عزيز')) return 'Azizi';
  if (dLower.includes('kobrosi') || dLower.includes('kobrosy') || dLower.includes('قبرص')) return 'Kobrosi';
  if (dLower.includes('kalamata') || dLower.includes('kalama') || dLower.includes('كالمات') || dLower.includes('كلامات')) return 'Kalamata';
  if (dLower.includes('dolsy') || dLower.includes('dolcy') || dLower.includes('dolce') || dLower.includes('تفاح') || dLower.includes('tofah') || dLower.includes('دولس')) return 'Dolsy';
  return 'Other';
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
        className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all text-xs font-bold whitespace-nowrap cursor-pointer ${
          selected.length > 0 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
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

// Helper to parse dates like "3-Aug", "15-Aug", "2024-08-03", etc.
const parseFlexibleDate = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  // Check format "3-Aug" or "03-Aug" or "3-Aug-2024"
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
      const year = dayMonthMatch[3] ? parseInt(dayMonthMatch[3], 10) : new Date().getFullYear();
      const fullYear = year < 100 ? 2000 + year : year;
      return new Date(fullYear, month, day);
    }
  }

  // Check standard ISO / YYYY-MM-DD or DD/MM/YYYY
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
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
  const [activeView, setActiveView] = useState<'table' | 'itemsSummary' | 'suppliersSummary' | 'reports' | 'analytics'>('table');
  const [activeReportTab, setActiveReportTab] = useState<'oliveStockStyle' | 'matrix' | 'logistics' | 'packaging' | 'daily' | 'poRecon'>('oliveStockStyle');
  const [matrixUnit, setMatrixUnit] = useState<'tons' | 'kg'>('tons');
  
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
  const [kpiModal, setKpiModal] = useState<'items' | 'suppliers' | 'totals' | 'movements' | 'trucks' | 'packaging' | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
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
    return rows
      .filter(row => {
        // filter out completely blank rows
        return Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
      })
      .map((row, idx) => {
        const dateStr = String(row['التاريخ'] || '').trim();
        const rawKg = String(row['اضافة'] || row['الكمية'] || '0').replace(/,/g, '').trim();
        const kg = parseFloat(rawKg) || 0;
        const tons = kg / 1000;

        return {
          id: `fresh-${idx}-${row['رقم الحركة'] || Math.random().toString(36).substr(2, 9)}`,
          date: dateStr,
          parsedDate: parseFlexibleDate(dateStr),
          store: String(row['المخزن'] || '').trim(),
          movementType: String(row['نوع الحركة'] || '').trim(),
          movementNo: String(row['رقم الحركة'] || '').trim(),
          truckNo: String(row['رقم سيارة'] || '').trim(),
          driver: String(row['السائق'] || '').trim(),
          vendorDocNo: String(row['رقم مستند المورد'] || '').trim(),
          costCenterCode: String(row['كود مركز التكلفة'] || '').trim(),
          po: String(row['PO'] || '').trim(),
          reservation: String(row['RESERVATION'] || '').trim(),
          postDocument: String(row['POST DOCUMENT'] || '').trim(),
          oldCode: String(row['كود قديم'] || '').trim(),
          sapCode: String(row['كود ساب'] || '').trim(),
          itemName: String(row['اسم الصنف'] || '').trim(),
          unit: String(row['الوحدة'] || 'كيلو').trim(),
          costCenter: String(row['مركز التكلفة'] || '').trim(),
          quantityKg: kg,
          quantityTons: tons,
          location: String(row['الموقع'] || '').trim(),
          tankNo: String(row['رقم التانك'] || '').trim(),
          raw: row
        };
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

  // Filter options
  const filterOptions = useMemo(() => {
    const items = new Set<string>();
    const varieties = new Set<string>();
    const suppliers = new Set<string>();
    const stores = new Set<string>();
    const locations = new Set<string>();
    const dates = new Set<string>();

    data.forEach(r => {
      if (r.itemName) {
        items.add(r.itemName);
        varieties.add(detectFreshVariety(r.itemName));
      }
      if (r.costCenter) suppliers.add(r.costCenter);
      if (r.store) stores.add(r.store);
      if (r.location) locations.add(r.location);
      if (r.date) dates.add(r.date);
    });

    return {
      items: Array.from(items).sort(),
      varieties: Array.from(varieties).map(v => ({ id: v, label: getFreshVarietyName(v, isRtl) })),
      suppliers: Array.from(suppliers).sort(),
      stores: Array.from(stores).sort(),
      locations: Array.from(locations).sort(),
      dates: Array.from(dates)
    };
  }, [data, isRtl]);

  // Filtered & Sorted Records
  const filteredData = useMemo(() => {
    return data.filter(record => {
      // 1. Search Query
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const match = 
          record.itemName.toLowerCase().includes(term) ||
          record.costCenter.toLowerCase().includes(term) ||
          record.truckNo.toLowerCase().includes(term) ||
          record.driver.toLowerCase().includes(term) ||
          record.movementNo.toLowerCase().includes(term) ||
          record.po.toLowerCase().includes(term) ||
          record.postDocument.toLowerCase().includes(term) ||
          record.sapCode.toLowerCase().includes(term) ||
          record.oldCode.toLowerCase().includes(term) ||
          record.date.toLowerCase().includes(term) ||
          record.store.toLowerCase().includes(term) ||
          record.location.toLowerCase().includes(term);
        if (!match) return false;
      }

      // 2. Item Filter
      if (selectedItem !== 'ALL' && record.itemName !== selectedItem) {
        return false;
      }

      // 3. Supplier / Cost Center Filter
      if (selectedSupplier !== 'ALL' && record.costCenter !== selectedSupplier) {
        return false;
      }

      // 4. Store Filter
      if (selectedStore !== 'ALL' && record.store !== selectedStore) {
        return false;
      }

      // 5. Location / Package Filter
      if (selectedLocation !== 'ALL' && record.location !== selectedLocation) {
        return false;
      }

      // 6. Multi-Select Variety Filter
      if (selectedVarieties.length > 0) {
        const v = detectFreshVariety(record.itemName);
        if (!selectedVarieties.includes(v)) return false;
      }

      // 7. Multi-Select Supplier Filter
      if (selectedMultiSuppliers.length > 0) {
        if (!selectedMultiSuppliers.includes(record.costCenter)) return false;
      }

      // 8. Multi-Select Store Filter
      if (selectedMultiStores.length > 0) {
        if (!selectedMultiStores.includes(record.store)) return false;
      }

      // 9. Multi-Select Location Filter
      if (selectedMultiLocations.length > 0) {
        if (!selectedMultiLocations.includes(record.location)) return false;
      }

      // 10. Date Filter
      if (dateFilter.mode !== 'all') {
        if (dateFilter.mode === 'single' && dateFilter.singleDate) {
          if (record.date === dateFilter.singleDate) return true;
          if (record.parsedDate) {
            const singleD = new Date(dateFilter.singleDate);
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
            startD = new Date(dateFilter.startDate);
            startD.setHours(0, 0, 0, 0);
          }
          if (dateFilter.endDate) {
            endD = new Date(dateFilter.endDate);
            endD.setHours(23, 59, 59, 999);
          }
        } else if (dateFilter.mode === 'preset' && dateFilter.presetKey) {
          const preset = getPresetDates(dateFilter.presetKey);
          if (preset.startDate) {
            startD = new Date(preset.startDate);
            startD.setHours(0, 0, 0, 0);
          }
          if (preset.endDate) {
            endD = new Date(preset.endDate);
            endD.setHours(23, 59, 59, 999);
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
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [
    data, 
    searchTerm, 
    selectedItem, 
    selectedSupplier, 
    selectedStore, 
    selectedLocation, 
    selectedVarieties, 
    selectedMultiSuppliers, 
    selectedMultiStores, 
    selectedMultiLocations, 
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

  // Grouping by Item
  const itemsSummary = useMemo(() => {
    const map = new Map<string, {
      itemName: string;
      sapCode: string;
      oldCode: string;
      unit: string;
      totalKg: number;
      totalTons: number;
      count: number;
      suppliers: Set<string>;
      locations: Set<string>;
    }>();

    filteredData.forEach(r => {
      const key = r.itemName || 'غير محدد';
      if (!map.has(key)) {
        map.set(key, {
          itemName: key,
          sapCode: r.sapCode,
          oldCode: r.oldCode,
          unit: r.unit,
          totalKg: 0,
          totalTons: 0,
          count: 0,
          suppliers: new Set(),
          locations: new Set()
        });
      }
      const item = map.get(key)!;
      item.totalKg += r.quantityKg;
      item.totalTons += r.quantityTons;
      item.count += 1;
      if (r.costCenter) item.suppliers.add(r.costCenter);
      if (r.location) item.locations.add(r.location);
    });

    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
  }, [filteredData]);

  // Grouping by Supplier / Cost Center
  const suppliersSummary = useMemo(() => {
    const map = new Map<string, {
      costCenter: string;
      costCenterCode: string;
      totalKg: number;
      totalTons: number;
      count: number;
      items: Set<string>;
      trucks: Set<string>;
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
          trucks: new Set()
        });
      }
      const sup = map.get(key)!;
      sup.totalKg += r.quantityKg;
      sup.totalTons += r.quantityTons;
      sup.count += 1;
      if (r.itemName) sup.items.add(r.itemName);
      if (r.truckNo) sup.trucks.add(r.truckNo);
    });

    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
  }, [filteredData]);

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
    setSelectedItem('ALL');
    setSelectedSupplier('ALL');
    setSelectedStore('ALL');
    setSelectedLocation('ALL');
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
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Google Sheets Live
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>{isRtl ? 'سحب فوري ومباشر لبيانات استلامات الفريش' : 'Real-time sync of fresh intake records'}</span>
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
            onClick={() => setActiveView('itemsSummary')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeView === 'itemsSummary'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isRtl ? 'ملخص حسب الأصناف' : 'Summary by Item'}</span>
            <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px] font-mono">
              {itemsSummary.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('suppliersSummary')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeView === 'suppliersSummary'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{isRtl ? 'ملخص حسب الموردين والمزارع' : 'Summary by Supplier'}</span>
            <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px] font-mono">
              {suppliersSummary.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeView === 'reports'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <FileBarChart className="w-4 h-4 text-amber-500" />
            <span>{isRtl ? 'تقارير التوريد الإضافية المتقدمة' : 'Advanced Supply Reports'}</span>
            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-600 dark:text-amber-300 rounded-full text-[10px] font-bold">
              5 {isRtl ? 'تقارير' : 'Reports'}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Total Weight in Tons */}
        <div 
          onClick={() => setKpiModal('totals')}
          role="button"
          tabIndex={0}
          title={isRtl ? 'انقر لعرض التحليل الشامل لإجمالي الكميات والتعبئة' : 'Click for total intake & packaging overview'}
          className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-4 rounded-2xl shadow-md flex flex-col justify-between col-span-2 sm:col-span-1 lg:col-span-2 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group active:scale-95 select-none relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-white/30 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-100 flex items-center gap-1.5">
              <span>{isRtl ? 'إجمالي توريد الفريش' : 'Total Fresh Intake'}</span>
              <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-mono font-normal">تفاصيل ↗</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/15 group-hover:bg-white/25 flex items-center justify-center transition-colors">
              <TrendingUp className="w-4 h-4 text-emerald-200" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl lg:text-3xl font-black font-mono tracking-tight">
                {stats.totalTons.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-emerald-100">{isRtl ? 'طن' : 'Tons'}</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[11px] font-mono text-emerald-200/90">
                = {stats.totalKg.toLocaleString('en-US')} {isRtl ? 'كيلوجرام' : 'KG'}
              </p>
              <span className="text-[10px] text-emerald-200 underline opacity-0 group-hover:opacity-100 transition-opacity">
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
          className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-400 hover:shadow-lg hover:scale-[1.02] transition-all group active:scale-95 select-none relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-zinc-600 dark:text-zinc-300">
              {isRtl ? 'عدد الحركات' : 'Movements'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl lg:text-2xl font-black font-mono text-zinc-900 dark:text-white">
              {stats.movementCount.toLocaleString()}
            </span>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[10px] text-zinc-400">{isRtl ? 'إذن إضافة واستلام' : 'Receipts'}</p>
              <span className="text-[9px] font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
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
          className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-sm flex flex-col justify-between cursor-pointer hover:border-amber-500 hover:shadow-lg hover:scale-[1.02] transition-all group active:scale-95 select-none relative overflow-hidden bg-gradient-to-b from-amber-50/20 to-transparent dark:from-amber-950/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-900 dark:text-amber-300 flex items-center gap-1">
              <span>{isRtl ? 'الأصناف الطازجة' : 'Fresh Items'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center transition-colors">
              <PackageCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl lg:text-2xl font-black font-mono text-zinc-900 dark:text-white">
              {stats.uniqueItems}
            </span>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">{isRtl ? 'انقر لعرض كميات الأصناف' : 'Click for item list'}</p>
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
          className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 shadow-sm flex flex-col justify-between cursor-pointer hover:border-purple-500 hover:shadow-lg hover:scale-[1.02] transition-all group active:scale-95 select-none relative overflow-hidden bg-gradient-to-b from-purple-50/20 to-transparent dark:from-purple-950/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-purple-900 dark:text-purple-300 flex items-center gap-1">
              <span>{isRtl ? 'الموردين والمزارع' : 'Suppliers'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 group-hover:bg-purple-500 group-hover:text-white flex items-center justify-center transition-colors">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl lg:text-2xl font-black font-mono text-zinc-900 dark:text-white">
              {stats.uniqueSuppliers}
            </span>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[10px] text-purple-700 dark:text-purple-400 font-bold">{isRtl ? 'انقر لعرض كميات الموردين' : 'Click for supplier list'}</p>
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
          className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between cursor-pointer hover:border-teal-500 hover:shadow-lg hover:scale-[1.02] transition-all group active:scale-95 select-none relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-zinc-600 dark:text-zinc-300">
              {isRtl ? 'السيارات والسائقين' : 'Trucks & Drivers'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-colors">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-lg lg:text-xl font-black font-mono text-zinc-900 dark:text-white">
                {stats.uniqueTrucks}
              </span>
              <span className="text-[10px] text-zinc-400">سيارة /</span>
              <span className="text-lg lg:text-xl font-black font-mono text-zinc-900 dark:text-white">
                {stats.uniqueDrivers}
              </span>
              <span className="text-[10px] text-zinc-400">سائق</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[10px] text-zinc-400">{isRtl ? 'حركة النقل اللوجستي' : 'Logistics'}</p>
              <span className="text-[9px] font-bold text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {isRtl ? 'عرض ↗' : 'View ↗'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          
          {/* Universal Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRtl ? 'بحث شامل (الصنف، المورد، السيارة، السائق، رقم الحركة، كود ساب، PO)...' : 'Search items, suppliers, trucks, POs...'}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute top-1/2 -translate-y-1/2 left-3 text-zinc-400 hover:text-zinc-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Item Filter Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">{isRtl ? 'جميع الأصناف الطازجة' : 'All Fresh Items'}</option>
              {filterOptions.items.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          {/* Supplier / Cost Center Filter Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">{isRtl ? 'جميع الموردين / مراكز التكلفة' : 'All Suppliers'}</option>
              {filterOptions.suppliers.map(sup => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>
          </div>

          {/* Store / Warehouse Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">{isRtl ? 'كل المخازن' : 'All Stores'}</option>
              {filterOptions.stores.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Date Filter & Secondary Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          
          <div className="flex-1">
            <DateRangeFilter
              value={dateFilter}
              onChange={(val) => setDateFilter(val)}
              isRtl={isRtl}
              availableDates={filterOptions.dates}
            />
          </div>

          {/* Clear Filters & Column Visibility */}
          <div className="flex items-center gap-2 shrink-0">
            {(searchTerm || selectedItem !== 'ALL' || selectedSupplier !== 'ALL' || selectedStore !== 'ALL' || selectedLocation !== 'ALL' || dateFilter.mode !== 'all') && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isRtl ? 'إلغاء الفلاتر' : 'Clear Filters'}</span>
              </button>
            )}

            {/* Column Visibility Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isRtl ? 'أعمدة الجدول' : 'Columns'}</span>
              </button>

              {showColumnConfig && (
                <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-3 shadow-xl z-30 space-y-2">
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
                        postDocument: 'POST DOCUMENT',
                        store: 'المخزن',
                        actions: 'الإجراءات'
                      };
                      return (
                        <label key={colKey} className="flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 p-1 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded cursor-pointer">
                          <span>{labels[colKey] || colKey}</span>
                          <input
                            type="checkbox"
                            checked={visibleColumns[colKey]}
                            onChange={(e) => setVisibleColumns(prev => ({ ...prev, [colKey]: e.target.checked }))}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

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
                      className="py-3.5 px-3 cursor-pointer hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isRtl ? 'التاريخ' : 'Date'}</span>
                        <ArrowUpDown className="w-3 h-3 text-zinc-400" />
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
                      {isRtl ? `الموردين: ${stats.uniqueSuppliers} | السيارات: ${stats.uniqueTrucks} | براميل: ${stats.barrelTons.toFixed(2)} طن | تانكات: ${stats.tankTons.toFixed(2)} طن` : `Suppliers: ${stats.uniqueSuppliers} | Trucks: ${stats.uniqueTrucks} | Barrels: ${stats.barrelTons.toFixed(2)}t | Tanks: ${stats.tankTons.toFixed(2)}t`}
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

      {/* View 2: Items Summary Grid & Aggregate Table */}
      {!loading && activeView === 'itemsSummary' && (
        <div className="space-y-6">
          
          {/* Summary Cards per Item */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {itemsSummary.map((item, idx) => {
              const percent = stats.totalKg > 0 ? ((item.totalKg / stats.totalKg) * 100).toFixed(1) : '0';
              return (
                <div 
                  key={item.itemName}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-black text-sm text-zinc-900 dark:text-white leading-tight">
                          {item.itemName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {item.sapCode && (
                            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                              SAP: {item.sapCode}
                            </span>
                          )}
                          {item.oldCode && (
                            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                              كود: {item.oldCode}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        {percent}%
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">{isRtl ? 'الكمية بالطن' : 'Tons'}</span>
                        <strong className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {item.totalTons.toFixed(2)} <span className="text-xs font-sans">طن</span>
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">{isRtl ? 'الكمية بالكيلو' : 'Kilograms'}</span>
                        <strong className="text-base font-mono font-bold text-zinc-900 dark:text-white">
                          {item.totalKg.toLocaleString()} <span className="text-xs font-sans">كجم</span>
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{item.count} {isRtl ? 'حركة توريد' : 'movements'}</span>
                    <span>{item.suppliers.size} {isRtl ? 'مورد / مزرعة' : 'suppliers'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Item Aggregate Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                {isRtl ? 'جدول تجميع كميات الأصناف ومقارنتها' : 'Item Aggregation & Comparison Table'}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-black border-b border-zinc-200 dark:border-zinc-700">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{isRtl ? 'اسم الصنف' : 'Item'}</th>
                    <th className="py-3 px-4">{isRtl ? 'كود ساب / قديم' : 'Codes'}</th>
                    <th className="py-3 px-4">{isRtl ? 'إجمالي الكمية (كجم)' : 'Total KG'}</th>
                    <th className="py-3 px-4">{isRtl ? 'إجمالي الكمية (طن)' : 'Total Tons'}</th>
                    <th className="py-3 px-4">{isRtl ? 'النسبة المئوية' : '% Share'}</th>
                    <th className="py-3 px-4">{isRtl ? 'عدد الحركات' : 'Movements'}</th>
                    <th className="py-3 px-4">{isRtl ? 'الموردين' : 'Suppliers'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {itemsSummary.map((item, idx) => {
                    const percent = stats.totalKg > 0 ? ((item.totalKg / stats.totalKg) * 100).toFixed(2) : '0';
                    return (
                      <tr key={item.itemName} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-3 px-4 font-mono text-zinc-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-black text-zinc-900 dark:text-white">{item.itemName}</td>
                        <td className="py-3 px-4 font-mono text-zinc-500">{item.sapCode || item.oldCode || '-'}</td>
                        <td className="py-3 px-4 font-mono font-black">{item.totalKg.toLocaleString()} كجم</td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400">{item.totalTons.toFixed(3)} طن</td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-700 dark:text-zinc-300">{percent}%</td>
                        <td className="py-3 px-4 font-mono">{item.count}</td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{Array.from(item.suppliers).join(', ')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* View 3: Suppliers Summary Grid & Aggregate Table */}
      {!loading && activeView === 'suppliersSummary' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliersSummary.map((sup, idx) => {
              const percent = stats.totalKg > 0 ? ((sup.totalKg / stats.totalKg) * 100).toFixed(1) : '0';
              return (
                <div 
                  key={sup.costCenter}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-black text-sm text-zinc-900 dark:text-white leading-tight">
                          {sup.costCenter}
                        </h3>
                        {sup.costCenterCode && (
                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded mt-1 inline-block">
                            مركز تكلفة: {sup.costCenterCode}
                          </span>
                        )}
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                        {percent}%
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">{isRtl ? 'إجمالي التوريد (طن)' : 'Tons'}</span>
                        <strong className="text-lg font-mono font-black text-purple-600 dark:text-purple-400">
                          {sup.totalTons.toFixed(2)} <span className="text-xs font-sans">طن</span>
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">{isRtl ? 'إجمالي التوريد (كجم)' : 'Kilograms'}</span>
                        <strong className="text-base font-mono font-bold text-zinc-900 dark:text-white">
                          {sup.totalKg.toLocaleString()} <span className="text-xs font-sans">كجم</span>
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{sup.count} {isRtl ? 'حركة' : 'movements'}</span>
                    <span>{sup.items.size} {isRtl ? 'أصناف موردة' : 'items'}</span>
                    <span>{sup.trucks.size} {isRtl ? 'سيارة' : 'trucks'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Supplier Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                {isRtl ? 'جدول تجميع الموردين ومراكز التكلفة' : 'Suppliers & Cost Centers Aggregate'}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-black border-b border-zinc-200 dark:border-zinc-700">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{isRtl ? 'المورد / مركز التكلفة' : 'Supplier'}</th>
                    <th className="py-3 px-4">{isRtl ? 'الكود' : 'Code'}</th>
                    <th className="py-3 px-4">{isRtl ? 'إجمالي الكمية (كجم)' : 'Total KG'}</th>
                    <th className="py-3 px-4">{isRtl ? 'إجمالي الكمية (طن)' : 'Total Tons'}</th>
                    <th className="py-3 px-4">{isRtl ? 'النسبة' : '%'}</th>
                    <th className="py-3 px-4">{isRtl ? 'الحركات' : 'Movements'}</th>
                    <th className="py-3 px-4">{isRtl ? 'الأصناف الموردة' : 'Items'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {suppliersSummary.map((sup, idx) => {
                    const percent = stats.totalKg > 0 ? ((sup.totalKg / stats.totalKg) * 100).toFixed(2) : '0';
                    return (
                      <tr key={sup.costCenter} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-3 px-4 font-mono text-zinc-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-black text-zinc-900 dark:text-white">{sup.costCenter}</td>
                        <td className="py-3 px-4 font-mono text-zinc-500">{sup.costCenterCode || '-'}</td>
                        <td className="py-3 px-4 font-mono font-black">{sup.totalKg.toLocaleString()} كجم</td>
                        <td className="py-3 px-4 font-mono font-black text-purple-600 dark:text-purple-400">{sup.totalTons.toFixed(3)} طن</td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-700 dark:text-zinc-300">{percent}%</td>
                        <td className="py-3 px-4 font-mono">{sup.count}</td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{Array.from(sup.items).join(', ')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* View 4: Visual Analytics & Charts */}
      {!loading && activeView === 'analytics' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Quantities by Item */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                    {isRtl ? 'كميات التوريد حسب الصنف (بالطن)' : 'Supply by Item (Tons)'}
                  </h3>
                  <p className="text-xs text-zinc-400">{isRtl ? 'مقارنة إجمالي أوزان الفريش المستلم' : 'Fresh produce weight comparison'}</p>
                </div>
                <BarChart3 className="w-5 h-5 text-emerald-500" />
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={itemsSummary} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis 
                      dataKey="itemName" 
                      tick={{ fontSize: 10 }} 
                      angle={-25} 
                      textAnchor="end" 
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(val: any) => [`${Number(val).toFixed(2)} طن`, 'الكمية']}
                      contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                    <Bar dataKey="totalTons" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Quantities by Supplier */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                    {isRtl ? 'كميات التوريد حسب المورد / المزرعة (بالطن)' : 'Supply by Supplier (Tons)'}
                  </h3>
                  <p className="text-xs text-zinc-400">{isRtl ? 'توزيع التوريد على مراكز التكلفة' : 'Distribution across cost centers'}</p>
                </div>
                <Building2 className="w-5 h-5 text-purple-500" />
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={suppliersSummary} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis 
                      dataKey="costCenter" 
                      tick={{ fontSize: 10 }} 
                      angle={-25} 
                      textAnchor="end" 
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(val: any) => [`${Number(val).toFixed(2)} طن`, 'الكمية']}
                      contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                    <Bar dataKey="totalTons" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Chart 3: Daily Trend Area Chart */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                  {isRtl ? 'حركة التوريد اليومية عبر الأيام (طن)' : 'Daily Intake Timeline (Tons)'}
                </h3>
                <p className="text-xs text-zinc-400">{isRtl ? 'متابعة مسار التوريد الزمني' : 'Timeline of shipments'}</p>
              </div>
              <TrendingUp className="w-5 h-5 text-teal-500" />
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySummary} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorTons" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(val: any) => [`${Number(val).toFixed(2)} طن`, 'الكمية اليومية']}
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="tons" stroke="#0f766e" strokeWidth={3} fillOpacity={1} fill="url(#colorTons)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* View 5: Advanced Supply Reports (تقارير التوريد الإضافية المتقدمة) */}
      {!loading && activeView === 'reports' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Reports Sub-Navigation Bar */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 md:p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-base md:text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <FileBarChart className="w-5 h-5 text-amber-500" />
                  <span>{isRtl ? 'تقارير توريد الفريش المتقدمة' : 'Advanced Supply Reports'}</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isRtl ? 'تحليلات عميقة للمصفوفات اللوجستية، أسطول الشاحنات، التانكات، والمسار الزمني' : 'Deep insights into cross-tab matrix, logistics fleet, tanks & timeline'}
                </p>
              </div>

              {/* Sub-Tabs Selector */}
              <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-x-auto">
                
                <button
                  onClick={() => setActiveReportTab('oliveStockStyle')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    activeReportTab === 'oliveStockStyle'
                      ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isRtl ? 'تحليل رصيد الأصناف والمواقع (مثل رصيد الزيتون)' : 'Olive Stock-Style Report'}</span>
                </button>

                <button
                  onClick={() => setActiveReportTab('matrix')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    activeReportTab === 'matrix'
                      ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'مصفوفة الأصناف والموردين' : 'Cross-Tab Matrix'}</span>
                </button>

                <button
                  onClick={() => setActiveReportTab('logistics')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    activeReportTab === 'logistics'
                      ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'أسطول السيارات والسائقين' : 'Logistics Fleet'}</span>
                </button>

                <button
                  onClick={() => setActiveReportTab('packaging')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    activeReportTab === 'packaging'
                      ? 'bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Container className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'التانكات والتعبئة' : 'Tanks & Barrels'}</span>
                </button>

                <button
                  onClick={() => setActiveReportTab('daily')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    activeReportTab === 'daily'
                      ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'المسار والتوريد اليومي' : 'Daily Velocity'}</span>
                </button>

                <button
                  onClick={() => setActiveReportTab('poRecon')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    activeReportTab === 'poRecon'
                      ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'مطابقة PO و ساب' : 'PO Reconciliation'}</span>
                </button>

              </div>
            </div>
          </div>

          {/* Sub-Report 0: Olive Stock Style Report (تحليل رصيد الأصناف والمواقع مثل رصيد الزيتون) */}
          {activeReportTab === 'oliveStockStyle' && (
            <div className="space-y-6">
              
              {/* Baseline Comparison Alert Banner */}
              {comparison.hasChanges && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-amber-900 dark:text-amber-300 shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-zinc-900 dark:text-white">
                        {isRtl ? 'تنبيه: تم رصد تغيير في بيانات التوريد مقارنة بالرصيد المرجعي المعتمد!' : 'Notice: Changes detected in supply intake compared to reference baseline!'}
                      </h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                        {isRtl 
                          ? `فرق إجمالي: ${comparison.totalDiff > 0 ? '+' : ''}${(comparison.totalDiff / 1000).toFixed(2)} طن عبر ${comparison.details.length} صنف` 
                          : `Total diff: ${comparison.totalDiff > 0 ? '+' : ''}${(comparison.totalDiff / 1000).toFixed(2)} T across ${comparison.details.length} items`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsComparisonModalOpen(true)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      {isRtl ? 'عرض الفروقات' : 'View Diff'}
                    </button>
                    <button
                      onClick={handleAcceptNewSupplyBalance}
                      className="px-4 py-2 bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      {isRtl ? 'اعتماد الرصيد الجديد' : 'Accept New Balance'}
                    </button>
                  </div>
                </div>
              )}

              {/* Fixed Core Totals Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
                    <span className="text-[11px] font-bold">{isRtl ? 'إجمالي التوريد' : 'Total Supply'}</span>
                    <Weight className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-lg font-black text-zinc-900 dark:text-white">
                    {(unmodifiedTotals.totalIntake / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span className="text-xs font-normal text-zinc-400 ml-1 mr-1">{isRtl ? 'طن' : 'T'}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 font-bold">
                    {unmodifiedTotals.totalIntake.toLocaleString()} {isRtl ? 'كجم' : 'KG'}
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
                    <span className="text-[11px] font-bold">{isRtl ? 'منزانيللا' : 'Manzanilla'}</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  </div>
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                    {(unmodifiedTotals.totalManzanilla / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span className="text-xs font-normal text-zinc-400 ml-1 mr-1">{isRtl ? 'طن' : 'T'}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 font-bold">
                    {unmodifiedTotals.totalIntake > 0 ? ((unmodifiedTotals.totalManzanilla / unmodifiedTotals.totalIntake) * 100).toFixed(1) : 0}%
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
                    <span className="text-[11px] font-bold">{isRtl ? 'بيكوال' : 'Picual'}</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {(unmodifiedTotals.totalPicual / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span className="text-xs font-normal text-zinc-400 ml-1 mr-1">{isRtl ? 'طن' : 'T'}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 font-bold">
                    {unmodifiedTotals.totalIntake > 0 ? ((unmodifiedTotals.totalPicual / unmodifiedTotals.totalIntake) * 100).toFixed(1) : 0}%
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
                    <span className="text-[11px] font-bold">{isRtl ? 'كالماتا' : 'Kalamata'}</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  </div>
                  <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {(unmodifiedTotals.totalKalamata / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span className="text-xs font-normal text-zinc-400 ml-1 mr-1">{isRtl ? 'طن' : 'T'}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 font-bold">
                    {unmodifiedTotals.totalIntake > 0 ? ((unmodifiedTotals.totalKalamata / unmodifiedTotals.totalIntake) * 100).toFixed(1) : 0}%
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
                    <span className="text-[11px] font-bold">{isRtl ? 'براميل' : 'Barrels'}</span>
                    <Boxes className="w-3.5 h-3.5 text-cyan-500" />
                  </div>
                  <div className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                    {(unmodifiedTotals.totalBarrels / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span className="text-xs font-normal text-zinc-400 ml-1 mr-1">{isRtl ? 'طن' : 'T'}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 font-bold">
                    {unmodifiedTotals.totalIntake > 0 ? ((unmodifiedTotals.totalBarrels / unmodifiedTotals.totalIntake) * 100).toFixed(1) : 0}%
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
                    <span className="text-[11px] font-bold">{isRtl ? 'تانكات' : 'Tanks'}</span>
                    <Container className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <div className="text-lg font-black text-purple-600 dark:text-purple-400">
                    {(unmodifiedTotals.totalTanks / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span className="text-xs font-normal text-zinc-400 ml-1 mr-1">{isRtl ? 'طن' : 'T'}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 font-bold">
                    {unmodifiedTotals.totalIntake > 0 ? ((unmodifiedTotals.totalTanks / unmodifiedTotals.totalIntake) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>

              {/* MultiSelect Floating Filter Bar */}
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-zinc-700 dark:text-zinc-300 ml-2">
                    <Sliders className="w-4 h-4 text-emerald-500" />
                    <span>{isRtl ? 'فلاتر سريعة:' : 'Filters:'}</span>
                  </div>

                  <MultiSelect
                    label={isRtl ? 'الأصناف' : 'Varieties'}
                    options={filterOptions.varieties}
                    selected={selectedVarieties}
                    onChange={setSelectedVarieties}
                    icon={<Tag size={13} className="text-emerald-500" />}
                    lang={lang}
                  />

                  <MultiSelect
                    label={isRtl ? 'الموردين' : 'Suppliers'}
                    options={filterOptions.suppliers.map(s => ({ id: s, label: s }))}
                    selected={selectedMultiSuppliers}
                    onChange={setSelectedMultiSuppliers}
                    icon={<User size={13} className="text-teal-500" />}
                    lang={lang}
                  />

                  <MultiSelect
                    label={isRtl ? 'المخازن' : 'Stores'}
                    options={filterOptions.stores.map(s => ({ id: s, label: s }))}
                    selected={selectedMultiStores}
                    onChange={setSelectedMultiStores}
                    icon={<Building2 size={13} className="text-amber-500" />}
                    lang={lang}
                  />

                  <MultiSelect
                    label={isRtl ? 'المواقع والتعبئة' : 'Packaging'}
                    options={filterOptions.locations.map(l => ({ id: l, label: l }))}
                    selected={selectedMultiLocations}
                    onChange={setSelectedMultiLocations}
                    icon={<MapPin size={13} className="text-cyan-500" />}
                    lang={lang}
                  />

                  {(selectedVarieties.length > 0 || selectedMultiSuppliers.length > 0 || selectedMultiStores.length > 0 || selectedMultiLocations.length > 0) && (
                    <button
                      onClick={() => {
                        setSelectedVarieties([]);
                        setSelectedMultiSuppliers([]);
                        setSelectedMultiStores([]);
                        setSelectedMultiLocations([]);
                      }}
                      className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl transition-colors cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>{isRtl ? 'إعادة ضبط' : 'Reset'}</span>
                    </button>
                  )}
                </div>

                <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  {isRtl ? `عرض ${filteredData.length} حركة (${stats.totalTons.toFixed(1)} طن)` : `Showing ${filteredData.length} records (${stats.totalTons.toFixed(1)} T)`}
                </div>
              </div>

              {/* Interactive Donut Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* Donut Chart 1: Varieties */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
                      <h4 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-emerald-500" />
                        <span>{isRtl ? 'توزيع الأصناف والأوزان' : 'Varieties Breakdown'}</span>
                      </h4>
                      <span className="text-[11px] font-bold text-zinc-400">{varietyChartData.length} {isRtl ? 'أصناف' : 'varieties'}</span>
                    </div>

                    <div className="h-56 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={varietyChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={3}
                            onClick={(data: any) => setDrillDown({ type: 'variety', id: data.id, label: data.name })}
                            className="cursor-pointer outline-none"
                          >
                            {varietyChartData.map((entry) => (
                              <Cell 
                                key={`cell-v-${entry.id}`} 
                                fill={VARIETY_COLORS[entry.id] || '#64748b'} 
                                className="hover:opacity-80 transition-opacity"
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => [`${(Number(value) / 1000).toFixed(2)} طن`, isRtl ? 'الكمية' : 'Quantity']}
                            contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Center Total Text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-zinc-400">{isRtl ? 'الإجمالي' : 'Total'}</span>
                        <span className="text-base font-black text-zinc-900 dark:text-white">
                          {stats.totalTons.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-zinc-400">{isRtl ? 'طن' : 'Tons'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bars list */}
                  <div className="space-y-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    {varietyChartData.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setDrillDown({ type: 'variety', id: item.id, label: item.name })}
                        className="w-full text-right group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <div 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: VARIETY_COLORS[item.id] || '#64748b' }} 
                            />
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 font-medium">{(item.value / 1000).toFixed(1)} {isRtl ? 'طن' : 'T'}</span>
                            <span className="font-black text-zinc-900 dark:text-white">{item.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${item.percentage}%`,
                              backgroundColor: VARIETY_COLORS[item.id] || '#64748b'
                            }} 
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Donut Chart 2: Suppliers / Cost Centers */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
                      <h4 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                        <User className="w-4 h-4 text-teal-500" />
                        <span>{isRtl ? 'أعلى الموردين ومراكز التكلفة' : 'Top Suppliers / Cost Centers'}</span>
                      </h4>
                      <span className="text-[11px] font-bold text-zinc-400">{supplierChartData.length} {isRtl ? 'مورد' : 'suppliers'}</span>
                    </div>

                    <div className="h-56 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={supplierChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={3}
                            onClick={(data: any) => setDrillDown({ type: 'supplier', id: data.id, label: data.name })}
                            className="cursor-pointer outline-none"
                          >
                            {supplierChartData.map((entry) => (
                              <Cell 
                                key={`cell-s-${entry.id}`} 
                                fill={entry.color} 
                                className="hover:opacity-80 transition-opacity"
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => [`${(Number(value) / 1000).toFixed(2)} طن`, isRtl ? 'الكمية' : 'Quantity']}
                            contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Center Total Text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-zinc-400">{isRtl ? 'الموردين' : 'Suppliers'}</span>
                        <span className="text-base font-black text-zinc-900 dark:text-white">
                          {stats.uniqueSuppliers}
                        </span>
                        <span className="text-[10px] text-zinc-400">{isRtl ? 'مورد' : 'Vendors'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bars list */}
                  <div className="space-y-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    {supplierChartData.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setDrillDown({ type: 'supplier', id: item.id, label: item.name })}
                        className="w-full text-right group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <div 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: item.color }} 
                            />
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 font-medium">{(item.value / 1000).toFixed(1)} {isRtl ? 'طن' : 'T'}</span>
                            <span className="font-black text-zinc-900 dark:text-white">{item.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${item.percentage}%`,
                              backgroundColor: item.color
                            }} 
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Donut Chart 3: Storage & Packaging */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
                      <h4 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                        <Container className="w-4 h-4 text-cyan-500" />
                        <span>{isRtl ? 'التعبئة والتخزين (تانكات / براميل)' : 'Storage & Packaging'}</span>
                      </h4>
                      <span className="text-[11px] font-bold text-zinc-400">{storageChartData.length} {isRtl ? 'أوعية' : 'types'}</span>
                    </div>

                    <div className="h-56 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={storageChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={3}
                            onClick={(data: any) => setDrillDown({ type: 'location', id: data.id, label: data.name })}
                            className="cursor-pointer outline-none"
                          >
                            {storageChartData.map((entry) => (
                              <Cell 
                                key={`cell-l-${entry.id}`} 
                                fill={entry.color} 
                                className="hover:opacity-80 transition-opacity"
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => [`${(Number(value) / 1000).toFixed(2)} طن`, isRtl ? 'الكمية' : 'Quantity']}
                            contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Center Total Text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-zinc-400">{isRtl ? 'براميل/تانك' : 'Storage'}</span>
                        <span className="text-base font-black text-zinc-900 dark:text-white">
                          {(stats.tankTons > 0 ? stats.tankTons : stats.barrelTons).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-zinc-400">{isRtl ? 'طن' : 'Tons'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bars list */}
                  <div className="space-y-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    {storageChartData.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setDrillDown({ type: 'location', id: item.id, label: item.name })}
                        className="w-full text-right group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <div 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: item.color }} 
                            />
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 font-medium">{(item.value / 1000).toFixed(1)} {isRtl ? 'طن' : 'T'}</span>
                            <span className="font-black text-zinc-900 dark:text-white">{item.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${item.percentage}%`,
                              backgroundColor: item.color
                            }} 
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Dynamic Drill Down Details Panel */}
              <AnimatePresence>
                {drillDown && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-emerald-500/5 border-2 border-emerald-500/30 rounded-3xl p-5 overflow-hidden"
                  >
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-emerald-500/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-sm">
                          <Eye className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {drillDown.type === 'variety' ? (isRtl ? 'تفاصيل الصنف المحدد' : 'Selected Variety Details') :
                               drillDown.type === 'supplier' ? (isRtl ? 'تفاصيل المورد المحدد' : 'Selected Supplier Details') :
                               (isRtl ? 'تفاصيل الموقع المحدد' : 'Selected Location Details')}
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-md text-xs font-black">
                              {drillDownRecords.length} {isRtl ? 'حركة' : 'records'}
                            </span>
                          </div>
                          <h3 className="text-base font-black text-zinc-900 dark:text-white mt-0.5">
                            {drillDown.label}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs text-zinc-500 font-bold block">{isRtl ? 'إجمالي الكمية' : 'Total Qty'}</span>
                          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            {(drillDownRecords.reduce((acc, r) => acc + r.quantityKg, 0) / 1000).toFixed(2)} {isRtl ? 'طن' : 'Tons'}
                          </span>
                        </div>
                        <button
                          onClick={() => setDrillDown(null)}
                          className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Drill-down records cards grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                      {drillDownRecords.map((r, idx) => (
                        <div 
                          key={`dd-${r.id}-${idx}`}
                          onClick={() => setSelectedRecord(r)}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-3.5 rounded-2xl hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[160px]">
                              {r.itemName}
                            </span>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              {(r.quantityKg / 1000).toFixed(2)} {isRtl ? 'طن' : 'T'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                            <div>{isRtl ? 'التاريخ:' : 'Date:'} <span className="font-bold text-zinc-700 dark:text-zinc-300">{r.date}</span></div>
                            <div>{isRtl ? 'حركة:' : 'Mov:'} <span className="font-bold text-zinc-700 dark:text-zinc-300">{r.movementNo || '-'}</span></div>
                            <div>{isRtl ? 'المورد:' : 'Supplier:'} <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate block">{r.costCenter || '-'}</span></div>
                            <div>{isRtl ? 'التعبئة:' : 'Loc:'} <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate block">{r.location || r.tankNo || '-'}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pivoted Supply Matrix Table with Pinned Columns */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                      <TableIcon className="w-4 h-4 text-emerald-500" />
                      <span>{isRtl ? 'جدول رصيد وتوزيع التوريد التفصيلي (مع تثبيت الأعمدة)' : 'Detailed Supply Balance Matrix with Pinned Columns'}</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {isRtl ? 'عرض كميات كل صنف موزعة على الموردين والمواقع مع إمكانية تثبيت الأعمدة والتصدير' : 'Item distribution matrix with column pinning and export'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportMatrixExcel}
                      className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'تصدير إكسيل' : 'Export Excel'}</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[500px] border border-zinc-200 dark:border-zinc-800 rounded-2xl custom-scrollbar">
                  <table className="w-full text-right text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
                    <thead className="bg-zinc-50 dark:bg-zinc-800/80 sticky top-0 z-20 text-zinc-600 dark:text-zinc-300 font-black border-b border-zinc-200 dark:border-zinc-700">
                      <tr>
                        {/* Item Code (Pinnable) */}
                        <th 
                          className={`p-3 whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/80 ${
                            pinnedColumns.includes('item_code') ? 'sticky right-0 z-30 shadow-sm' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>{isRtl ? 'كود الصنف' : 'Item Code'}</span>
                            <button
                              onClick={() => togglePin('item_code')}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                pinnedColumns.includes('item_code') ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'text-zinc-400 hover:text-zinc-600'
                              }`}
                              title={isRtl ? 'تثبيت العمود' : 'Pin Column'}
                            >
                              <Pin size={11} className={pinnedColumns.includes('item_code') ? 'fill-current' : ''} />
                            </button>
                          </div>
                        </th>

                        {/* Item Name (Pinnable) */}
                        <th 
                          className={`p-3 whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/80 min-w-[200px] ${
                            pinnedColumns.includes('item_name') ? (pinnedColumns.includes('item_code') ? 'sticky right-[120px] z-30 shadow-sm' : 'sticky right-0 z-30 shadow-sm') : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>{isRtl ? 'اسم الصنف' : 'Item Description'}</span>
                            <button
                              onClick={() => togglePin('item_name')}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                pinnedColumns.includes('item_name') ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'text-zinc-400 hover:text-zinc-600'
                              }`}
                              title={isRtl ? 'تثبيت العمود' : 'Pin Column'}
                            >
                              <Pin size={11} className={pinnedColumns.includes('item_name') ? 'fill-current' : ''} />
                            </button>
                          </div>
                        </th>

                        <th className="p-3 whitespace-nowrap text-center">{isRtl ? 'الصنف' : 'Variety'}</th>
                        
                        {/* Dynamic Supplier Columns */}
                        {pivotedSupplyMatrix.suppliers.map((sup) => (
                          <th key={`th-sup-${sup}`} className="p-3 whitespace-nowrap text-center min-w-[110px]">
                            {sup}
                          </th>
                        ))}

                        {/* Total Column */}
                        <th className="p-3 whitespace-nowrap text-center bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 sticky left-0 z-20">
                          {isRtl ? 'الإجمالي (طن)' : 'Total (Tons)'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {pivotedSupplyMatrix.items.map((row, idx) => (
                        <tr 
                          key={`piv-row-${row.code}-${idx}`} 
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          {/* Code */}
                          <td 
                            className={`p-3 font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 ${
                              pinnedColumns.includes('item_code') ? 'sticky right-0 z-10' : ''
                            }`}
                          >
                            {row.sapCode || row.code}
                          </td>

                          {/* Name */}
                          <td 
                            className={`p-3 font-bold text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 ${
                              pinnedColumns.includes('item_name') ? (pinnedColumns.includes('item_code') ? 'sticky right-[120px] z-10' : 'sticky right-0 z-10') : ''
                            }`}
                          >
                            {row.itemName}
                          </td>

                          {/* Variety Chip */}
                          <td className="p-3 text-center">
                            <span 
                              className="px-2 py-0.5 rounded-md text-[10px] font-black"
                              style={{ 
                                backgroundColor: `${VARIETY_COLORS[row.variety] || '#64748b'}20`,
                                color: VARIETY_COLORS[row.variety] || '#64748b'
                              }}
                            >
                              {getFreshVarietyName(row.variety, isRtl)}
                            </span>
                          </td>

                          {/* Quantities per supplier */}
                          {pivotedSupplyMatrix.suppliers.map((sup) => {
                            const valKg = row.suppliers[sup] || 0;
                            const valTons = valKg / 1000;
                            return (
                              <td key={`cell-${row.code}-${sup}`} className="p-3 text-center font-mono">
                                {valKg > 0 ? (
                                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                    {valTons.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-zinc-300 dark:text-zinc-700">-</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Total */}
                          <td className="p-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 sticky left-0 z-10">
                            {row.totalTons.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-100 dark:bg-zinc-800 font-black text-zinc-900 dark:text-white sticky bottom-0 z-20 border-t-2 border-zinc-300 dark:border-zinc-700">
                      <tr>
                        <td 
                          colSpan={3} 
                          className={`p-3 text-right ${pinnedColumns.includes('item_code') || pinnedColumns.includes('item_name') ? 'sticky right-0 z-30 bg-zinc-100 dark:bg-zinc-800' : ''}`}
                        >
                          {isRtl ? 'إجمالي الأعمدة (طن)' : 'Column Totals (Tons)'}
                        </td>
                        {pivotedSupplyMatrix.suppliers.map((sup) => {
                          const colTotalKg = pivotedSupplyMatrix.items.reduce((acc, row) => acc + (row.suppliers[sup] || 0), 0);
                          return (
                            <td key={`tf-${sup}`} className="p-3 text-center font-mono font-black">
                              {(colTotalKg / 1000).toFixed(2)}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900 sticky left-0 z-30">
                          {stats.totalTons.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Sub-Report 1: Cross-Tab Matrix (مصفوفة الأصناف مقابل الموردين) */}
          {activeReportTab === 'matrix' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>{isRtl ? 'مصفوفة تقاطع الأصناف والموردين (Pivot Matrix)' : 'Cross-Tab Item vs Supplier Pivot Matrix'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                      {matrixData.items.length} {isRtl ? 'صنف' : 'items'} × {matrixData.suppliers.length} {isRtl ? 'مورد' : 'suppliers'}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {isRtl ? 'جدول تقاطعي يوضح كمية كل صنف تم توريدها من كل مورد / مركز تكلفة على حدة' : 'Matrix displaying exact volume of each fresh item supplied by each cost center'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle Units */}
                  <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setMatrixUnit('tons')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        matrixUnit === 'tons'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {isRtl ? 'بالطن' : 'Tons'}
                    </button>
                    <button
                      onClick={() => setMatrixUnit('kg')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        matrixUnit === 'kg'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {isRtl ? 'بالكيلوجرام' : 'KG'}
                    </button>
                  </div>

                  {/* Export Matrix Excel */}
                  <button
                    onClick={handleExportMatrixExcel}
                    className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'تصدير المصفوفة Excel' : 'Export Matrix'}</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Matrix Table */}
              <div className="overflow-x-auto max-h-[600px] border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <table className="w-full text-right text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-zinc-100/95 dark:bg-zinc-800/95 backdrop-blur text-zinc-900 dark:text-white font-black border-b border-zinc-200 dark:border-zinc-700">
                      <th className="py-3 px-3.5 sticky right-0 z-30 bg-zinc-100/95 dark:bg-zinc-800/95 shadow-sm min-w-[180px]">
                        {isRtl ? 'الصنف / المورد ⤹' : 'Item / Supplier ⤹'}
                      </th>
                      {matrixData.suppliers.map(sup => (
                        <th key={sup} className="py-3 px-3 whitespace-nowrap min-w-[140px] text-center">
                          <span className="block truncate font-bold text-[11px]" title={sup}>{sup}</span>
                        </th>
                      ))}
                      <th className="py-3 px-4 sticky left-0 z-30 bg-emerald-100/95 dark:bg-emerald-950/95 text-emerald-900 dark:text-emerald-200 min-w-[130px] text-center font-black">
                        {isRtl ? 'إجمالي الصنف' : 'Item Total'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {matrixData.items.map((item, idx) => {
                      let rowSum = 0;
                      return (
                        <tr key={item} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                          <td className="py-3 px-3.5 font-black text-zinc-900 dark:text-white sticky right-0 z-10 bg-white dark:bg-zinc-900 shadow-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] flex items-center justify-center font-black shrink-0">
                                {idx + 1}
                              </span>
                              <span className="truncate">{item}</span>
                            </div>
                          </td>
                          {matrixData.suppliers.map(sup => {
                            const val = matrixUnit === 'tons' ? matrixData.getTons(item, sup) : matrixData.getKg(item, sup);
                            rowSum += matrixUnit === 'tons' ? matrixData.getTons(item, sup) : matrixData.getKg(item, sup);
                            return (
                              <td key={sup} className="py-3 px-3 text-center font-mono">
                                {val > 0 ? (
                                  <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded font-bold border border-emerald-200 dark:border-emerald-800">
                                    {val.toLocaleString('en-US', { minimumFractionDigits: matrixUnit === 'tons' ? 2 : 0, maximumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-zinc-300 dark:text-zinc-700">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-3 px-4 text-center font-mono font-black text-emerald-700 dark:text-emerald-300 sticky left-0 z-10 bg-emerald-50/80 dark:bg-emerald-950/60 shadow-sm">
                            {rowSum.toLocaleString('en-US', { minimumFractionDigits: matrixUnit === 'tons' ? 2 : 0, maximumFractionDigits: 2 })} {matrixUnit === 'tons' ? 'طن' : 'كجم'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="sticky bottom-0 z-20">
                    <tr className="bg-zinc-200/95 dark:bg-zinc-800/95 backdrop-blur font-black text-zinc-900 dark:text-white border-t-2 border-zinc-300 dark:border-zinc-700">
                      <td className="py-3.5 px-3.5 sticky right-0 z-30 bg-zinc-200/95 dark:bg-zinc-800/95 shadow-sm">
                        {isRtl ? 'إجمالي المورد:' : 'Supplier Total:'}
                      </td>
                      {matrixData.suppliers.map(sup => {
                        let colSum = 0;
                        matrixData.items.forEach(item => {
                          colSum += matrixUnit === 'tons' ? matrixData.getTons(item, sup) : matrixData.getKg(item, sup);
                        });
                        return (
                          <td key={sup} className="py-3.5 px-3 text-center font-mono font-black text-purple-700 dark:text-purple-300">
                            {colSum.toLocaleString('en-US', { minimumFractionDigits: matrixUnit === 'tons' ? 2 : 0, maximumFractionDigits: 2 })}
                          </td>
                        );
                      })}
                      <td className="py-3.5 px-4 text-center font-mono font-black text-emerald-800 dark:text-emerald-200 sticky left-0 z-30 bg-emerald-200/95 dark:bg-emerald-900/95 shadow-sm text-sm">
                        {(matrixUnit === 'tons' ? stats.totalTons : stats.totalKg).toLocaleString('en-US', { minimumFractionDigits: matrixUnit === 'tons' ? 2 : 0, maximumFractionDigits: 2 })} {matrixUnit === 'tons' ? 'طن' : 'كجم'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Report 2: Logistics & Fleet Breakdown (تحليل أسطول النقل والشاحنات) */}
          {activeReportTab === 'logistics' && (
            <div className="space-y-6">
              
              {/* Fleet Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-400 font-bold block">{isRtl ? 'إجمالي أسطول السيارات' : 'Active Trucks Fleet'}</span>
                    <span className="text-2xl font-black font-mono text-zinc-900 dark:text-white mt-1 block">
                      {logisticsSummary.length} {isRtl ? 'سيارة' : 'Trucks'}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Truck className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-400 font-bold block">{isRtl ? 'إجمالي السائقين المسجلين' : 'Registered Drivers'}</span>
                    <span className="text-2xl font-black font-mono text-zinc-900 dark:text-white mt-1 block">
                      {stats.uniqueDrivers} {isRtl ? 'سائق' : 'Drivers'}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-400 font-bold block">{isRtl ? 'متوسط حمولة النقلة' : 'Avg Payload / Trip'}</span>
                    <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                      {stats.movementCount > 0 ? (stats.totalTons / stats.movementCount).toFixed(2) : '0'} {isRtl ? 'طن' : 'Tons'}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Fleet Table */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                      {isRtl ? 'تفاصيل أداء أسطول وسيارات التوريد' : 'Truck Logistics & Performance Table'}
                    </h3>
                    <p className="text-xs text-zinc-400">{isRtl ? 'عدد الرحلات والأوزان المنقولة ومتوسط الحمولة لكل سيارة' : 'Trip counts, total weight and average payload per truck'}</p>
                  </div>

                  <button
                    onClick={handleExportLogisticsExcel}
                    className="px-3.5 py-1.5 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'تصدير اللوجستيات Excel' : 'Export Fleet Excel'}</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  <table className="w-full text-right text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-black border-b border-zinc-200 dark:border-zinc-700">
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">{isRtl ? 'رقم السيارة' : 'Truck No'}</th>
                        <th className="py-3 px-4">{isRtl ? 'السائقين' : 'Drivers'}</th>
                        <th className="py-3 px-4">{isRtl ? 'عدد النقلات' : 'Trips'}</th>
                        <th className="py-3 px-4">{isRtl ? 'إجمالي الكمية (طن)' : 'Total Tons'}</th>
                        <th className="py-3 px-4">{isRtl ? 'متوسط النقلة (طن)' : 'Avg Load'}</th>
                        <th className="py-3 px-4">{isRtl ? 'الأصناف المنقولة' : 'Transported Items'}</th>
                        <th className="py-3 px-4">{isRtl ? 'الموردين' : 'Suppliers'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {logisticsSummary.map((t, idx) => (
                        <tr key={t.truckNo} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <td className="py-3 px-4 font-mono text-zinc-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-black text-zinc-900 dark:text-white">
                            <span className="bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                              {t.truckNo}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-zinc-700 dark:text-zinc-300">
                            {Array.from(t.drivers).join(' / ') || '-'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{t.count}</td>
                          <td className="py-3 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400">{t.totalTons.toFixed(2)} طن</td>
                          <td className="py-3 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">{t.avgLoadTons.toFixed(2)} طن</td>
                          <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 max-w-xs truncate" title={Array.from(t.items).join(', ')}>
                            {Array.from(t.items).join(', ')}
                          </td>
                          <td className="py-3 px-4 text-zinc-500 max-w-xs truncate" title={Array.from(t.suppliers).join(', ')}>
                            {Array.from(t.suppliers).join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Sub-Report 3: Packaging & Tanks (تقرير التعبئة والتانكات والبراميل) */}
          {activeReportTab === 'packaging' && (
            <div className="space-y-6">
              
              {/* Packaging Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Barrels Card */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/30 dark:to-zinc-900 p-6 rounded-3xl border border-amber-200 dark:border-amber-900/60 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                        <Boxes className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-zinc-900 dark:text-white">
                          {isRtl ? 'تعبئة البراميل (Barrels)' : 'Barrels Packaging'}
                        </h3>
                        <p className="text-xs text-amber-800 dark:text-amber-300 font-bold">{packagingSummary.barrels.count} {isRtl ? 'حركة استلام براميل' : 'movements'}</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black font-mono text-amber-700 dark:text-amber-400">
                      {packagingSummary.barrels.totalTons.toFixed(2)} <span className="text-sm font-bold">طن</span>
                    </span>
                  </div>

                  <div className="p-4 bg-white/80 dark:bg-zinc-900/80 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-bold">{isRtl ? 'النسبة من إجمالي التوريد:' : 'Intake Share:'}</span>
                      <span className="font-mono font-black text-zinc-900 dark:text-white">
                        {stats.totalKg > 0 ? ((packagingSummary.barrels.totalKg / stats.totalKg) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-bold">{isRtl ? 'الأصناف المعبأة:' : 'Packed Items:'}</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{packagingSummary.barrels.items.size} {isRtl ? 'أصناف' : 'items'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-bold">{isRtl ? 'الموردين:' : 'Suppliers:'}</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{packagingSummary.barrels.suppliers.size} {isRtl ? 'مورد' : 'suppliers'}</span>
                    </div>
                  </div>
                </div>

                {/* Tanks Card */}
                <div className="bg-gradient-to-br from-cyan-50 to-teal-100/60 dark:from-cyan-950/30 dark:to-zinc-900 p-6 rounded-3xl border border-cyan-200 dark:border-cyan-900/60 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-md shadow-cyan-600/20">
                        <Container className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-zinc-900 dark:text-white">
                          {isRtl ? 'تعبئة التانكات (Tanks)' : 'Tanks Storage'}
                        </h3>
                        <p className="text-xs text-cyan-800 dark:text-cyan-300 font-bold">{packagingSummary.tanks.count} {isRtl ? 'حركة استلام تانكات' : 'movements'}</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black font-mono text-cyan-700 dark:text-cyan-400">
                      {packagingSummary.tanks.totalTons.toFixed(2)} <span className="text-sm font-bold">طن</span>
                    </span>
                  </div>

                  <div className="p-4 bg-white/80 dark:bg-zinc-900/80 rounded-2xl border border-cyan-200/60 dark:border-cyan-900/40 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-bold">{isRtl ? 'النسبة من إجمالي التوريد:' : 'Intake Share:'}</span>
                      <span className="font-mono font-black text-zinc-900 dark:text-white">
                        {stats.totalKg > 0 ? ((packagingSummary.tanks.totalKg / stats.totalKg) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-bold">{isRtl ? 'عدد التانكات النشطة:' : 'Active Tanks:'}</span>
                      <span className="font-bold text-cyan-700 dark:text-cyan-400 font-mono">{packagingSummary.tanksList.length} {isRtl ? 'تانك' : 'tanks'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-bold">{isRtl ? 'الأصناف بالتانكات:' : 'Tank Items:'}</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{packagingSummary.tanks.items.size} {isRtl ? 'أصناف' : 'items'}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Tanks Allocated Table */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                      <Container className="w-4 h-4 text-cyan-500" />
                      <span>{isRtl ? 'جدول تخصيص التانكات وحمولتها' : 'Tanks Allocation & Stored Volumes'}</span>
                    </h3>
                    <p className="text-xs text-zinc-400">{isRtl ? 'بيان بجميع التانكات المستخدمة والكميات المخزنة بداخلها' : 'List of all operational tanks and stored produce weight'}</p>
                  </div>

                  <button
                    onClick={handleExportPackagingExcel}
                    className="px-3.5 py-1.5 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'تصدير التانكات Excel' : 'Export Tanks Excel'}</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  <table className="w-full text-right text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-black border-b border-zinc-200 dark:border-zinc-700">
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">{isRtl ? 'رقم التانك' : 'Tank No'}</th>
                        <th className="py-3 px-4">{isRtl ? 'الصنف المخزن' : 'Item Stored'}</th>
                        <th className="py-3 px-4">{isRtl ? 'الكمية (طن)' : 'Volume (Tons)'}</th>
                        <th className="py-3 px-4">{isRtl ? 'الكمية (كجم)' : 'Volume (KG)'}</th>
                        <th className="py-3 px-4">{isRtl ? 'عدد الإضافات' : 'Fill Count'}</th>
                        <th className="py-3 px-4">{isRtl ? 'الموردين' : 'Suppliers'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {packagingSummary.tanksList.map((t, idx) => (
                        <tr key={t.tankNo} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <td className="py-3 px-4 font-mono text-zinc-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-black text-cyan-700 dark:text-cyan-400">
                            <span className="px-2.5 py-1 rounded bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-800">
                              تانك {t.tankNo}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-black text-zinc-900 dark:text-white">{t.itemName || '-'}</td>
                          <td className="py-3 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400">{t.totalTons.toFixed(2)} طن</td>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-700 dark:text-zinc-300">{t.totalKg.toLocaleString()} كجم</td>
                          <td className="py-3 px-4 font-mono">{t.count}</td>
                          <td className="py-3 px-4 text-zinc-500 max-w-xs truncate" title={Array.from(t.suppliers).join(', ')}>
                            {Array.from(t.suppliers).join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Sub-Report 4: Daily Intake & Velocity (المسار والتوريد اليومي التراكمي) */}
          {activeReportTab === 'daily' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-amber-500" />
                    <span>{isRtl ? 'تقرير المسار ومعدل التوريد اليومي والتراكمي' : 'Daily Velocity & Cumulative Intake'}</span>
                  </h3>
                  <p className="text-xs text-zinc-400">{isRtl ? 'متابعة كمية التوريد لكل يوم والصنف الأكثر توريداً والكمية التراكمية' : 'Daily intake volumes, leading item per day and running cumulative totals'}</p>
                </div>

                <button
                  onClick={handleExportDailyExcel}
                  className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تصدير التوريد اليومي Excel' : 'Export Daily Excel'}</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <table className="w-full text-right text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-black border-b border-zinc-200 dark:border-zinc-700">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">{isRtl ? 'التاريخ' : 'Date'}</th>
                      <th className="py-3 px-4">{isRtl ? 'توريد اليوم (طن)' : 'Day Intake (Tons)'}</th>
                      <th className="py-3 px-4">{isRtl ? 'التراكمي (طن)' : 'Cumulative (Tons)'}</th>
                      <th className="py-3 px-4">{isRtl ? 'عدد الحركات' : 'Movements'}</th>
                      <th className="py-3 px-4">{isRtl ? 'أعلى صنف توريداً' : 'Top Item'}</th>
                      <th className="py-3 px-4">{isRtl ? 'الموردين' : 'Suppliers'}</th>
                      <th className="py-3 px-4">{isRtl ? 'السيارات' : 'Trucks'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {dailyTimelineDetailed.map((d, idx) => (
                      <tr key={d.date} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-3 px-4 font-mono text-zinc-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-white">{d.date}</td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {d.totalTons.toFixed(2)} طن
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-teal-700 dark:text-teal-300">
                          {d.cumulativeTons.toFixed(2)} طن
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{d.count}</td>
                        <td className="py-3 px-4 font-bold text-zinc-800 dark:text-zinc-200">
                          <span>{d.topItem}</span>
                          <span className="text-[10px] text-zinc-400 font-mono ml-1 font-normal">({d.topItemTons.toFixed(2)} طن)</span>
                        </td>
                        <td className="py-3 px-4 font-mono">{d.suppliers.size}</td>
                        <td className="py-3 px-4 font-mono">{d.trucks.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Report 5: PO & SAP Reconciliation (مطابقة أوامر الشراء PO وكود ساب) */}
          {activeReportTab === 'poRecon' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-purple-500" />
                    <span>{isRtl ? 'مطابقة أوامر الشراء (Purchase Orders) وأكواد SAP' : 'PO & SAP Reconciliation'}</span>
                  </h3>
                  <p className="text-xs text-zinc-400">{isRtl ? 'تجميع الكميات الموردة والمطابقة تحت كل أمر شراء PO ومستندات الإضافة' : 'Consolidated intake quantities and documents per Purchase Order'}</p>
                </div>

                <button
                  onClick={handleExportPOExcel}
                  className="px-3.5 py-1.5 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تصدير مطابقة PO Excel' : 'Export PO Excel'}</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <table className="w-full text-right text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-black border-b border-zinc-200 dark:border-zinc-700">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">{isRtl ? 'أمر الشراء PO' : 'PO Number'}</th>
                      <th className="py-3 px-4">{isRtl ? 'كود SAP' : 'SAP Code'}</th>
                      <th className="py-3 px-4">{isRtl ? 'الصنف' : 'Item'}</th>
                      <th className="py-3 px-4">{isRtl ? 'المورد / مركز التكلفة' : 'Supplier'}</th>
                      <th className="py-3 px-4">{isRtl ? 'الكمية (طن)' : 'Total Tons'}</th>
                      <th className="py-3 px-4">{isRtl ? 'الكمية (كجم)' : 'Total KG'}</th>
                      <th className="py-3 px-4">{isRtl ? 'عدد الحركات' : 'Movements'}</th>
                      <th className="py-3 px-4">{isRtl ? 'POST DOCUMENT' : 'Post Docs'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {poReconciliation.map((p, idx) => (
                      <tr key={p.po} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-3 px-4 font-mono text-zinc-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-black text-purple-700 dark:text-purple-300">
                          <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 border border-purple-300 dark:border-purple-800">
                            {p.po}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">{Array.from(p.sapCodes).join(' / ') || '-'}</td>
                        <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">{Array.from(p.items).join(', ')}</td>
                        <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">{Array.from(p.suppliers).join(', ')}</td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400">{p.totalTons.toFixed(2)} طن</td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-600 dark:text-zinc-400">{p.totalKg.toLocaleString()} كجم</td>
                        <td className="py-3 px-4 font-mono">{p.count}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">{Array.from(p.postDocuments).join(' / ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 6. Interactive KPI Breakdown Modal (نافذة تفاعلية منبثقة عند النقر على بطاقات المؤشرات) */}
      {kpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-4xl w-full border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-zinc-800 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                  {kpiModal === 'items' && <PackageCheck className="w-5 h-5 text-amber-300" />}
                  {kpiModal === 'suppliers' && <Building2 className="w-5 h-5 text-purple-300" />}
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
                  onClick={() => setKpiModal('trucks')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    kpiModal === 'trucks'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'السيارات' : 'Trucks'}</span>
                  <span className="font-mono text-[10px] bg-black/20 px-1 rounded-full">{logisticsSummary.length}</span>
                </button>

                <button
                  onClick={() => setKpiModal('totals')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    kpiModal === 'totals'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'الإجماليات' : 'Overview'}</span>
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
                        return (
                          <div
                            key={item.itemName}
                            className="p-4 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 rounded-2xl border border-zinc-200 dark:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                          >
                            <div className="flex items-start gap-3">
                              <span className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black font-mono flex items-center justify-center text-xs shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div>
                                <h4 className="font-black text-sm text-zinc-900 dark:text-white leading-tight">
                                  {item.itemName}
                                </h4>
                                <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-zinc-500">
                                  {item.sapCode && <span className="font-mono font-bold bg-zinc-200/70 dark:bg-zinc-700 px-1.5 py-0.2 rounded">SAP: {item.sapCode}</span>}
                                  <span>• {item.count} حركات</span>
                                  <span>• {item.suppliers.size} موردين</span>
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
                                onClick={() => {
                                  setSelectedItem(item.itemName);
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
                        return (
                          <div
                            key={sup.costCenter}
                            className="p-4 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 rounded-2xl border border-zinc-200 dark:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                          >
                            <div className="flex items-start gap-3">
                              <span className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-black font-mono flex items-center justify-center text-xs shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div>
                                <h4 className="font-black text-sm text-zinc-900 dark:text-white leading-tight">
                                  {sup.costCenter}
                                </h4>
                                <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-zinc-500">
                                  {sup.costCenterCode && <span className="font-mono font-bold bg-zinc-200/70 dark:bg-zinc-700 px-1.5 py-0.2 rounded">كود: {sup.costCenterCode}</span>}
                                  <span>• {sup.count} حركات</span>
                                  <span>• أصناف: {Array.from(sup.items).join('، ')}</span>
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
                                onClick={() => {
                                  setSelectedSupplier(sup.costCenter);
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">إجمالي التوريد</span>
                      <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1 block">
                        {stats.totalTons.toFixed(2)} طن
                      </span>
                      <span className="text-[11px] font-mono text-emerald-600/80 mt-0.5 block">{stats.totalKg.toLocaleString()} كجم</span>
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">تعبئة البراميل</span>
                      <span className="text-2xl font-black font-mono text-amber-700 dark:text-amber-400 mt-1 block">
                        {packagingSummary.barrels.totalTons.toFixed(2)} طن
                      </span>
                      <span className="text-[11px] text-amber-700 font-bold mt-0.5 block">{packagingSummary.barrels.count} حركة</span>
                    </div>

                    <div className="p-4 bg-cyan-50 dark:bg-cyan-950/40 rounded-2xl border border-cyan-200 dark:border-cyan-800">
                      <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300 block">تعبئة التانكات</span>
                      <span className="text-2xl font-black font-mono text-cyan-700 dark:text-cyan-400 mt-1 block">
                        {packagingSummary.tanks.totalTons.toFixed(2)} طن
                      </span>
                      <span className="text-[11px] text-cyan-700 font-bold mt-0.5 block">{packagingSummary.tanksList.length} تانك نشط</span>
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
                          setActiveView('reports');
                          setActiveReportTab('matrix');
                          setKpiModal(null);
                        }}
                        className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <Grid3X3 className="w-3.5 h-3.5" />
                        <span>عرض مصفوفة الأصناف والموردين</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveView('analytics');
                          setKpiModal(null);
                        }}
                        className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>عرض الرسوم البيانية</span>
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
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">اسم الصنف المستلم:</span>
                  <h2 className="text-base font-black text-zinc-900 dark:text-white mt-0.5">{selectedRecord.itemName}</h2>
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

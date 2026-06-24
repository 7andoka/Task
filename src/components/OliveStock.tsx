import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  RefreshCw, 
  Search, 
  Download, 
  TrendingUp, 
  Layers, 
  MapPin, 
  Percent,
  Pin,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Filter,
  Tag,
  Check,
  ChevronDown,
  X,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Language, UserProfile } from '../types';

interface OliveStockProps {
  lang: Language;
  user: UserProfile;
}

interface PivotedStockRow {
  materialCode: string;
  description: string;
  totalQuantity: number;
  variety: string;
  size: string;
  treatment: string;
  processType: string;
  locationQuantities: Record<string, number>;
  analyses: string[];
  rawRows: {
    quantity: number;
    location: string;
    analysis: string;
    batch: string;
  }[];
}

const CATEGORIES_REF = {
  process: [
    { id: 'SLC', labelAr: 'شرائح', labelEn: 'Sliced', aliases: ['slice', 'slices', 'سلايس', 'شرايح', 'slc'] },
    { id: 'Pre', labelAr: 'خام', labelEn: 'Raw', aliases: ['raw', 'pre', 'preparation', 'تجهيز', 'خامات', 'خام'] },
    { id: 'Grd', labelAr: 'مدرج', labelEn: 'Graded', aliases: ['grd', 'graded', 'فرز', 'تدريج'] },
    { id: 'PTD', labelAr: 'مخلي', labelEn: 'Pitted', aliases: ['ptd', 'pitted', 'مخلي', 'مخلي من النوي'] },
    { id: 'FARZA', labelAr: 'فرزه', labelEn: 'Farza', aliases: ['reject', 'bi products', 'فرزة', 'فرزة زيت', 'فرزه زيت', 'farza'] },
  ],
  direction: [
    { id: 'Green', labelAr: 'مطبوخ', labelEn: 'Cooked', aliases: ['gree', 'olive', 'green', 'green olive', 'cooked', 'اخضر', 'مطبوخ'] },
    { id: 'Black', labelAr: 'مياه وملح', labelEn: 'Brine', aliases: ['brine', 'black', 'water and salt', 'م م', 'مياه ملح', 'اسود', 'مياه وملح'] },
  ],
  size: [
    { id: 'L', labelAr: 'L', labelEn: 'L', aliases: ['كبير', 'لارج', 'large'] },
    { id: 'M', labelAr: 'M', labelEn: 'M', aliases: ['وسط', 'ميديم', 'medium'] },
    { id: 'S', labelAr: 'S', labelEn: 'S', aliases: ['صغير', 'سمول', 'small'] },
    { id: 'XXXS', labelAr: 'XXXS', labelEn: 'XXXS', aliases: ['3xs', 'xxxs'] },
    { id: 'XXS', labelAr: 'XXS', labelEn: 'XXS', aliases: ['2xs', 'xxs'] },
  ]
};

const ANALYSIS_CATEGORIES = [
  { id: 'Within Limits', labelAr: 'مطابق (Within Limits)', labelEn: 'Within Limits' },
  { id: 'Not Comply', labelAr: 'غير مطابق (Not Comply)', labelEn: 'Not Comply' },
  { id: 'Free', labelAr: 'حر (Free)', labelEn: 'Free' }
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all text-xs font-bold whitespace-nowrap ${
          selected.length > 0 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
            : 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-700/50 text-zinc-500 dark:text-zinc-400'
        }`}
      >
        {icon}
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="bg-emerald-500 text-white text-[9px] px-1.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
            {selected.length}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`absolute z-50 mt-2 min-w-[200px] max-h-[300px] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 ${
              isRtl ? 'right-0' : 'left-0'
            }`}
          >
            <div className="space-y-1">
              {options.map(option => (
                <button
                  key={option.id}
                  onClick={() => toggleOption(option.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    selected.includes(option.id)
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {selected.includes(option.id) && <Check size={14} />}
                </button>
              ))}
            </div>
            {selected.length > 0 && (
              <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                <button
                  onClick={() => onChange([])}
                  className="w-full py-1.5 text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider"
                >
                  {isRtl ? 'مسح الكل' : 'Clear All'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OliveStock({ lang, user }: OliveStockProps) {
  const [rawData, setRawData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastModified, setLastModified] = useState<string | null>(null);

  // Comparison state
  const [savedStockMap, setSavedStockMap] = useState<Record<string, number> | null>(() => {
    try {
      const saved = localStorage.getItem('last_known_olive_stock_map');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedVarieties, setSelectedVarieties] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>([]);

  const isRtl = lang === 'ar';

  const formatNumber = (num: number) => {
    if (num === 0) return '—';
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0
    }).format(num);
  };

  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOGkYpf6hSa20PDIE2BxZ0ClH7vXd9aA7yrAOxO4nN-afVgi8RdqY8EDbzD_hRHR9A8kYr34RRndv3/pub?gid=801884526&single=true&output=csv';

  // Parse CSV helper that handles quotes with commas inside them correctly
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentVal.trim());
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
          lines.push(row);
        }
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }

    if (row.length > 0 || currentVal !== '') {
      row.push(currentVal.trim());
      lines.push(row);
    }

    return lines;
  };

  // Classify olive variety dynamically from description
  const detectVariety = (descr: string): string => {
    let extracted = '';
    // Look for text between OLV (case-insensitive) and Black/Green (case-insensitive)
    const match = descr.match(/OLV\s+(.*?)\s+(Black|Green)/i);
    if (match && match[1]) {
      extracted = match[1].trim();
    } else {
      extracted = descr;
    }

    const eLower = extracted.toLowerCase();
    if (eLower.includes('manzanilla') || eLower.includes('manzanila')) return 'Manzanilla';
    if (eLower.includes('picual') || eLower.includes('pical')) return 'Picual';
    if (eLower.includes('akas') || eLower.includes('akass') || eLower.includes('akisi') || eLower.includes('aqezi')) return 'Akas';
    if (eLower.includes('azizi')) return 'Azizi';
    if (eLower.includes('kobrosi') || eLower.includes('kobrosy') || eLower.includes('qobr') || eLower.includes('cyprus')) return 'Kobrosi';
    if (eLower.includes('kalamata') || eLower.includes('kalama')) return 'Kalamata';
    if (eLower.includes('dolsy') || eLower.includes('dolcy') || eLower.includes('dolce') || eLower.includes('dolsi')) return 'Dolsy';

    return 'Other';
  };

  const getVarietyName = (v: string) => {
    if (v === 'Other') {
      return isRtl ? 'آخر / مشكل' : 'Other / mixed';
    }
    return v;
  };

  const getVarietyColor = (v: string) => {
    switch (v) {
      case 'Manzanilla':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50';
      case 'Picual':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'Akas':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50';
      case 'Azizi':
        return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/50';
      case 'Kobrosi':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
      case 'Kalamata':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50';
      case 'Dolsy':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-700/50';
    }
  };

  const getAnalysisLabel = (id: string) => {
    if (id === 'Within Limits') return isRtl ? 'مطابق (Within Limits)' : 'Within Limits';
    if (id === 'Not Comply') return isRtl ? 'غير مطابق (Not Comply)' : 'Not Comply';
    return isRtl ? 'حر (Free)' : 'Free';
  };

  const getAnalysisColor = (id: string) => {
    if (id === 'Within Limits') {
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400 dark:border-emerald-500/10';
    }
    if (id === 'Not Comply') {
      return 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-400 dark:border-rose-500/10';
    }
    return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/5 dark:text-blue-400 dark:border-blue-500/10';
  };

  const detectAttribute = (descr: string, type: 'size' | 'process' | 'direction'): string => {
    const dLower = descr.toLowerCase().replace(/[._\-/\\]/g, ' ');
    const words = dLower.split(/\s+/);
    const categories = CATEGORIES_REF[type];
    
    for (const cat of categories) {
      // Check ID
      const catId = cat.id.toLowerCase();
      if (catId.length <= 2) {
        if (words.includes(catId)) return cat.id;
      } else {
        if (dLower.includes(catId)) return cat.id;
      }

      // Check Aliases
      if (cat.aliases) {
        for (const alias of cat.aliases) {
          const aLower = alias.toLowerCase();
          if (aLower.length <= 2) {
            if (words.includes(aLower)) return cat.id;
          } else {
            if (dLower.includes(aLower)) return cat.id;
          }
        }
      }
    }
    return '';
  };

  const getAttributeLabel = (id: string, type: 'size' | 'process' | 'direction') => {
    if (!id) return '—';
    const categories = CATEGORIES_REF[type];
    const cat = categories.find(c => c.id === id);
    if (!cat) return id;
    return isRtl ? cat.labelAr : cat.labelEn;
  };

  const getLocationName = (loc: string) => {
    if (isRtl) {
      if (loc === 'Richland') return 'ريتشلاند (Richland)';
      if (loc === 'Olive Land') return 'أوليف لاند (Olive Land)';
      return loc;
    }
    return loc;
  };

  const loadData = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const toastId = isManual ? toast.loading(isRtl ? 'جاري تحديث البيانات من شيت جوجل...' : 'Refreshing from Google Sheet...') : null;

    try {
      let text = '';
      let lastModHeader: string | null = null;

      // 1. Try fetching from internal proxy
      try {
        const baseUrl = window.location.origin ? window.location.origin.replace(/\/$/, '') : '';
        const proxyUrl = `${baseUrl}/api/stock-data?t=${Date.now()}`;
        console.log('Fetching olive stock data from proxy:', proxyUrl);
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const result = await response.json();
            if (result && !result.error && result.data) {
              text = result.data;
              lastModHeader = result.lastModified || null;
            } else if (result && result.error) {
              console.warn('Proxy returned error, will fallback:', result.error);
            }
          }
        } else {
          console.warn('Proxy response not ok. Status:', response.status);
        }
      } catch (proxyErr) {
        console.warn('Proxy fetch failed, falling back to direct fetch:', proxyErr);
      }

      // 2. Fallback to direct client-side fetch from Google Sheet (supports CORS)
      if (!text) {
        const csvUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTOGkYpf6hSa20PDIE2BxZ0ClH7vXd9aA7yrAOxO4nN-afVgi8RdqY8EDbzD_hRHR9A8kYr34RRndv3/pub?gid=801884526&single=true&output=csv&t=${Date.now()}`;
        const directResp = await fetch(csvUrl);
        if (!directResp.ok) {
          throw new Error(`Google Sheet direct fetch failed: ${directResp.status} ${directResp.statusText}`);
        }
        text = await directResp.text();
        lastModHeader = directResp.headers.get('last-modified') || directResp.headers.get('Date') || null;
      }

      if (!text) {
        throw new Error('Data is empty');
      }

      const formatTime = (date: Date) => {
        if (isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }).format(date);
      };

      const parseSheetDate = (str: string): Date | null => {
        if (!str) return null;
        // Format: DD/MM/YYYY HH:mm:ss
        const match = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
        if (match) {
          const [_, day, month, year, hour, minute, second] = match.map(Number);
          return new Date(year, month - 1, day, hour, minute, second);
        }
        const simpleMatch = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (simpleMatch) {
          const [_, day, month, year] = simpleMatch.map(Number);
          return new Date(year, month - 1, day);
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      };

      const parsed = parseCSV(text);
      
      if (parsed.length === 0) {
        throw new Error('Retrieved CSV is empty');
      }

      // Try extraction of update time from cell I2 (row 1, column 8 in parsed data)
      let matchedDate = false;
      if (parsed.length > 1 && parsed[1] && parsed[1][8]) {
        try {
          const dateStr = parsed[1][8].trim();
          const parsedDate = parseSheetDate(dateStr);
          if (parsedDate) {
            setLastModified(formatTime(parsedDate));
            console.log('Timestamp set from sheet cell I2:', dateStr);
            matchedDate = true;
          }
        } catch (e) {
          console.error('Error parsing sheet cell I2 metadata date:', e);
        }
      }

      // Fallback if cell extraction didn't work
      if (!matchedDate) {
        if (lastModHeader) {
          try {
            const date = new Date(lastModHeader);
            setLastModified(formatTime(date) || null);
            console.log('Timestamp set from fallback header:', formatTime(date));
          } catch (e) {
            console.error('Error parsing Last-Modified fallback header:', e);
            setLastModified(null);
          }
        } else {
          setLastModified(null);
        }
      }

      setRawData(parsed);
      setError(null);
      if (isManual) {
        toast.success(isRtl ? 'تم تحديث رصيد الزيتون بنجاح' : 'Olive stock updated successfully', { id: toastId! });
      }
    } catch (err: any) {
      console.error('Error fetching olive stock sheet:', err, err?.stack);
      setError(`${err.message || 'Error occurred while loading data'}${err?.stack ? ' - ' + err.stack : ''}`);
      if (isManual) {
        toast.error(isRtl ? 'فشل التحديث، يرجى المحاولة لاحقاً' : 'Refresh failed, please try again', { id: toastId! });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format dataset - PIVOTED
  const [pinnedColumns, setPinnedColumns] = useState<string[]>(['material_code']);

  const togglePin = (colId: string) => {
    setPinnedColumns(prev => 
      prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
    );
  };

  const getPinnedOffset = (colId: string, allCols: string[]) => {
    if (!pinnedColumns.includes(colId)) return null;
    
    // In RTL, we pin to the right. 
    const materialCodeWidth = 100;
    const materialDescWidth = 250;
    const detailsWidth = 200; // estimated/min
    const totalQtyWidth = 100;

    let offset = 0;
    
    if (colId === 'material_code') return offset;
    if (pinnedColumns.includes('material_code')) offset += materialCodeWidth;

    if (colId === 'material_desc') return offset;
    if (pinnedColumns.includes('material_desc')) offset += materialDescWidth;

    if (colId === 'details') return offset;
    if (pinnedColumns.includes('details')) offset += detailsWidth;

    if (colId === 'total_qty') return offset;
    if (pinnedColumns.includes('total_qty')) offset += totalQtyWidth;

    // For location columns
    const locIdx = allCols.indexOf(colId);
    for (let i = 0; i < locIdx; i++) {
       if (pinnedColumns.includes(allCols[i])) {
         offset += 120; // assumed width for location cols
       }
    }
    return offset;
  };

  const dataset = useMemo<PivotedStockRow[]>(() => {
    if (rawData.length <= 1) return [];
    
    const headers = rawData[0].map(h => h.trim().toLowerCase());
    const materialIdx = headers.findIndex(h => h === 'material' || h.includes('material code'));
    const descrIdx = headers.findIndex(h => h === 'material description' || (h.includes('descr') && h.includes('material')));
    const unrestrictedIdx = headers.findIndex(h => h === 'unrestricted' || h.includes('unrestricted') || h.includes('qty') || h.includes('quantity'));
    const locDescrIdx = headers.findIndex(h => h === 'descr. of storage loc.' || h.includes('storage loc') || h.includes('location descr'));
    const batchIdx = headers.findIndex(h => h === 'batch' || h.includes('batch') || h.includes('تشغيلة'));

    if (materialIdx === -1 || unrestrictedIdx === -1) return [];

    const pivotMap = new Map<string, PivotedStockRow>();

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length < 3 || !row[materialIdx]) continue;

      const code = row[materialIdx];
      const descr = descrIdx !== -1 ? row[descrIdx] : '';
      const rawQty = unrestrictedIdx !== -1 ? row[unrestrictedIdx] : '0';
      const cleanQtyStr = rawQty.replace(/"/g, '').replace(/,/g, '').trim();
      const quantity = parseFloat(cleanQtyStr) || 0;

      let locDescr = locDescrIdx !== -1 && row[locDescrIdx] ? row[locDescrIdx] : (isRtl ? 'مخزن غير محدد' : 'Unknown');
      
      // Grouping logic: Richland & Olive Land & merged warehouses
      const normalizedLoc = locDescr.toLowerCase().trim();
      const richlandTargets = [
        'raw material', 'wip production', 'qualtiy storage', 'quality storage', 'wip r2e', '10000 m',
        'pacakging', 'packaging', 'packaging warehouse', 'pacakging warehouse',
        'unknown', 'غير محدد', 'مخزن غير محدد', 'unassigned', ''
      ];

      if (normalizedLoc.startsWith('ol tank')) {
        locDescr = 'Olive Land';
      } else if (
        normalizedLoc.startsWith('tank') || 
        normalizedLoc.startsWith('wip tank') || 
        normalizedLoc.startsWith('pacakging') ||
        normalizedLoc.startsWith('packaging') ||
        normalizedLoc.startsWith('unknown') ||
        normalizedLoc.startsWith('غير محدد') ||
        normalizedLoc.startsWith('مخزن غير محدد') ||
        richlandTargets.includes(normalizedLoc)
      ) {
        locDescr = 'Richland';
      }

      // Determine batch analysis
      const batchVal = batchIdx !== -1 && row[batchIdx] ? row[batchIdx].trim() : '';
      const prefix = batchVal.substring(0, 3).toUpperCase();
      let rowAnalysis = 'Free';
      if (prefix === 'PWL') {
        rowAnalysis = 'Within Limits';
      } else if (prefix === 'PNC') {
        rowAnalysis = 'Not Comply';
      }

      if (!pivotMap.has(code)) {
        pivotMap.set(code, {
          materialCode: code,
          description: descr,
          totalQuantity: 0,
          variety: detectVariety(descr),
          size: detectAttribute(descr, 'size'),
          treatment: detectAttribute(descr, 'direction'),
          processType: detectAttribute(descr, 'process'),
          locationQuantities: {},
          analyses: [],
          rawRows: []
        });
      }

      const entry = pivotMap.get(code)!;
      entry.totalQuantity += quantity;
      entry.locationQuantities[locDescr] = (entry.locationQuantities[locDescr] || 0) + quantity;
      
      entry.rawRows.push({
        quantity,
        location: locDescr,
        analysis: rowAnalysis,
        batch: batchVal
      });

      if (!entry.analyses.includes(rowAnalysis)) {
        entry.analyses.push(rowAnalysis);
      }
    }

    return Array.from(pivotMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [rawData, isRtl]);

  // Save initial baseline if not set yet (so user doesn't get a huge change list on first load)
  useEffect(() => {
    if (dataset.length > 0 && !savedStockMap) {
      const map: Record<string, number> = {};
      dataset.forEach(row => {
        map[row.materialCode] = row.totalQuantity;
      });
      localStorage.setItem('last_known_olive_stock_map', JSON.stringify(map));
      setSavedStockMap(map);
    }
  }, [dataset, savedStockMap]);

  // Comparison logic
  const comparison = useMemo(() => {
    if (!savedStockMap || dataset.length === 0) {
      return { totalDiff: 0, hasChanges: false, details: [] };
    }

    const details: {
      materialCode: string;
      description: string;
      oldQty: number;
      newQty: number;
      diff: number;
    }[] = [];
    let totalDiff = 0;

    const checkedCodes = new Set<string>();

    dataset.forEach(row => {
      const code = row.materialCode;
      checkedCodes.add(code);
      const oldQty = savedStockMap[code] !== undefined ? savedStockMap[code] : 0;
      const newQty = row.totalQuantity;
      const diff = newQty - oldQty;

      // Only record changes with significant difference (> 0.1 kg)
      if (Math.abs(diff) > 0.1) {
        details.push({
          materialCode: code,
          description: row.description,
          oldQty,
          newQty,
          diff
        });
        totalDiff += diff;
      }
    });

    // Check for items that were in the reference map but are completely missing in the new dataset
    Object.entries(savedStockMap).forEach(([code, oldQty]) => {
      if (!checkedCodes.has(code) && oldQty > 0.1) {
        // Find if this item ever existed inside previous runs to grab its description
        const previousItem = dataset.find(d => d.materialCode === code);
        details.push({
          materialCode: code,
          description: previousItem?.description || (isRtl ? 'خام تم تصفيره أو غير موجود بالشيت' : 'Material removed or missing from sheet'),
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
  }, [dataset, savedStockMap, isRtl]);

  const handleAcceptNewBalance = () => {
    const map: Record<string, number> = {};
    dataset.forEach(row => {
      map[row.materialCode] = row.totalQuantity;
    });
    localStorage.setItem('last_known_olive_stock_map', JSON.stringify(map));
    setSavedStockMap(map);
    setIsComparisonModalOpen(false);
    toast.success(isRtl ? 'تم اعتماد الرصيد الجديد كمرجع للمقارنة' : 'New balance accepted as comparison reference');
  };

  // Extract unique storage locations found in data
  const storageLocations = useMemo(() => {
    const locSet = new Set<string>();
    dataset.forEach(row => {
      Object.keys(row.locationQuantities).forEach(loc => locSet.add(loc));
    });
    
    // Sort locations: Richland first, then others
    const locs = Array.from(locSet).sort((a, b) => {
      if (a === 'Richland') return -1;
      if (b === 'Richland') return 1;
      if (a === 'Olive Land') return -1;
      if (b === 'Olive Land') return 1;
      return a.localeCompare(b);
    });
    return locs;
  }, [dataset]);

  const varieties = useMemo(() => {
    return ['Manzanilla', 'Picual', 'Akas', 'Azizi', 'Kobrosi', 'Kalamata', 'Dolsy', 'Other'];
  }, []);

  const visibleLocations = useMemo(() => {
    if (selectedLocations.length === 0) {
      return storageLocations;
    }
    return storageLocations.filter(loc => selectedLocations.includes(loc));
  }, [storageLocations, selectedLocations]);

  // Filtered dataset
  const filteredDataset = useMemo(() => {
    return dataset
      .map(row => {
        // If analysis filter is selected, we filter the rawRows inside
        const activeRawRows = selectedAnalyses.length === 0
          ? row.rawRows
          : row.rawRows.filter(r => selectedAnalyses.includes(r.analysis));

        // Recompute quantities based on the active rawRows
        const totalQuantity = activeRawRows.reduce((sum, r) => sum + r.quantity, 0);
        
        const locationQuantities: Record<string, number> = {};
        activeRawRows.forEach(r => {
          locationQuantities[r.location] = (locationQuantities[r.location] || 0) + r.quantity;
        });

        // Unique analyses remaining with quantity > 0
        const activeAnalyses = Array.from(new Set(activeRawRows.filter(r => r.quantity > 0).map(r => r.analysis)));

        return {
          ...row,
          totalQuantity,
          locationQuantities,
          analyses: activeAnalyses
        };
      })
      .filter(row => {
        // Only keep rows that have stock remaining after analysis filter
        if (row.totalQuantity <= 0) return false;

        const matchesSearch = 
          row.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesLocation = 
          selectedLocations.length === 0 || 
          selectedLocations.some(loc => row.locationQuantities[loc] && row.locationQuantities[loc] > 0);

        const matchesVariety = 
          selectedVarieties.length === 0 || 
          selectedVarieties.includes(row.variety);

        const matchesSize = 
          selectedSizes.length === 0 || 
          selectedSizes.includes(row.size);

        const matchesTreatment = 
          selectedTreatments.length === 0 || 
          selectedTreatments.includes(row.treatment);

        const matchesProcess = 
          selectedProcesses.length === 0 || 
          selectedProcesses.includes(row.processType);

        return matchesSearch && matchesLocation && matchesVariety && matchesSize && matchesTreatment && matchesProcess;
      });
  }, [dataset, searchTerm, selectedLocations, selectedVarieties, selectedSizes, selectedTreatments, selectedProcesses, selectedAnalyses]);

  // Unmodified totals block, independent of filters
  const unmodifiedTotals = useMemo(() => {
    let totalOlive = 0;
    let totalPepper = 0;
    let totalFarza = 0;
    let totalXxxs = 0;
    let totalS = 0;

    dataset.forEach(row => {
      const desc = (row.description || '').trim().toUpperCase();
      const isPepperItem = [
        "PEPPER, JALAPENO, GREEN, SLICED IN BRINE",
        "PEPPER, BANANA, SLICED IN BRINE",
        "PEPPER, PEPPERONCINI, 3-6 WHOLE IN BRINE"
      ].includes(desc);

      const isFarzaItem = [
        "BI PRODUCTS OLV FARZA",
        "BI PRODUCT OLV PTD",
        "BI PRODUCT OLV SLC"
      ].includes(desc);

      if (isPepperItem) {
        totalPepper += row.totalQuantity;
      } else if (isFarzaItem) {
        totalFarza += row.totalQuantity;
      } else {
        totalOlive += row.totalQuantity;
      }

      // Check if size is XXXS
      if (row.size === 'XXXS') {
        totalXxxs += row.totalQuantity;
      }

      // Check if size is S
      if (row.size === 'S') {
        totalS += row.totalQuantity;
      }
    });

    return { totalOlive, totalPepper, totalFarza, totalXxxs, totalS };
  }, [dataset]);

  // Statistics
  const stats = useMemo(() => {
    const totalQty = filteredDataset.reduce((sum, row) => sum + row.totalQuantity, 0);
    const uniqueItems = filteredDataset.length;
    const uniqueLocs = storageLocations.length;

    // Variety summaries
    const varietyBreakdown = varieties.reduce((acc, v) => {
      acc[v] = 0;
      return acc;
    }, {} as Record<string, number>);

    filteredDataset.forEach(row => {
      varietyBreakdown[row.variety] = (varietyBreakdown[row.variety] || 0) + row.totalQuantity;
    });

    // Find variety with maximum stock
    let topVariety = 'Other';
    let maxVarietyQty = -1;
    Object.entries(varietyBreakdown).forEach(([v, qty]) => {
      if (qty > maxVarietyQty) {
        maxVarietyQty = qty;
        topVariety = v;
      }
    });

    // Storage Location summaries
    const locationBreakdown: Record<string, number> = {};
    filteredDataset.forEach(row => {
      Object.entries(row.locationQuantities).forEach(([loc, qty]) => {
        locationBreakdown[loc] = (locationBreakdown[loc] || 0) + qty;
      });
    });

    return {
      totalQty,
      uniqueItems,
      uniqueLocs,
      topVariety,
      varietyBreakdown,
      locationBreakdown
    };
  }, [filteredDataset, varieties, storageLocations]);

  const chartData = useMemo(() => {
    return Object.entries(stats.varietyBreakdown)
      .map(([variety, qty]) => ({
        id: variety,
        name: getVarietyName(variety),
        value: qty,
        percentage: stats.totalQty > 0 ? (qty / stats.totalQty) * 100 : 0
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [stats.varietyBreakdown, stats.totalQty, lang]);

  const locationChartData = useMemo(() => {
    return Object.entries(stats.locationBreakdown)
      .map(([location, qty], idx) => {
        const percentage = stats.totalQty > 0 ? (qty / stats.totalQty) * 100 : 0;
        return {
          id: location,
          name: getLocationName(location),
          value: qty,
          percentage,
          color: location.toLowerCase().includes('richland') 
            ? '#3b82f6' // Blue for Richland
            : location.toLowerCase().includes('olive land') 
              ? '#d946ef' // Fuchsia/Indigo for Olive Land
              : ['#0ea5e9', '#8b5cf6', '#14b8a6', '#f43f5e', '#eab308'][idx % 5] // Multi-color rotation
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [stats.locationBreakdown, stats.totalQty, lang]);

  const VARIETY_COLORS: Record<string, string> = {
    Manzanilla: '#f59e0b', // Amber
    Picual: '#10b981',    // Emerald
    Akas: '#8b5cf6',      // Violet
    Azizi: '#06b6d4',     // Cyan
    Kobrosi: '#3b82f6',   // Blue
    Kalamata: '#6366f1',  // Indigo
    Dolsy: '#f43f5e',     // Rose
    Other: '#64748b'       // Slate
  };

  const handleExportToExcel = () => {
    if (filteredDataset.length === 0) {
      toast.error(isRtl ? 'لا توجد بيانات لتصديرها' : 'No data to export');
      return;
    }

    const excelData = filteredDataset.map(item => {
      const row: any = {
        [isRtl ? 'كود الخام' : 'Material Code']: item.materialCode,
        [isRtl ? 'الوصف' : 'Description']: item.description,
        [isRtl ? 'صنف الزيتون' : 'Variety']: getVarietyName(item.variety),
        [isRtl ? 'الحجم' : 'Size']: item.size || '—',
        [isRtl ? 'التشغيل' : 'Process']: getAttributeLabel(item.processType, 'process'),
        [isRtl ? 'التوجيه' : 'Treatment']: getAttributeLabel(item.treatment, 'direction'),
        [isRtl ? 'التحليل' : 'Analysis']: item.analyses.map(a => getAnalysisLabel(a)).join(', '),
        [isRtl ? 'إجمالي الكمية (كجم)' : 'Total Qty (Kg)']: item.totalQuantity,
      };
      
      // Add location columns
      visibleLocations.forEach(loc => {
        row[getLocationName(loc)] = item.locationQuantities[loc] || 0;
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isRtl ? 'رصيد الزيتون' : 'Olive Stock Pivot');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RichLand_OliveStock_Pivot_${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(isRtl ? 'تم تحميل ملف Excel بنجاح' : 'Excel spreadsheet downloaded successfully');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Database size={24} />
            </span>
            <h1 className="text-xl font-bold font-serif tracking-tight text-zinc-900 dark:text-zinc-50">
              {isRtl ? 'رصيد الزيتون المتاح' : 'Olive Stock Balance'}
            </h1>
            
            <div className="flex flex-wrap items-center gap-2">
              {refreshing ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 dark:bg-amber-500/5 rounded-full border border-amber-500/20 dark:border-amber-500/10">
                  <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
                  <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    {isRtl ? 'جاري التحديث والاتصال بالسرفر' : 'Connecting & updating from server...'}
                  </span>
                </div>
              ) : lastModified ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full border border-emerald-500/20 dark:border-emerald-500/10">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    {isRtl ? `تحديث الرصيد بتاريخ : ${lastModified}` : `Stock updated on: ${lastModified}`}
                  </span>
                </div>
              ) : !loading && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-full border border-zinc-200 dark:border-zinc-700/50">
                  <span className="w-2 h-2 bg-zinc-400 rounded-full" />
                  <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">
                    {isRtl ? 'وقت التحديث غير متاح' : 'Update time unavailable'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">

          <button
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="flex items-center justify-center p-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-650 dark:text-zinc-300 font-bold text-sm transition-all border border-zinc-200/60 dark:border-zinc-700/60 disabled:opacity-50 cursor-pointer"
            title={isRtl ? 'تحديث البيانات' : 'Refresh Data'}
          >
            <RefreshCw size={16} className={refreshing || loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleExportToExcel}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-emerald-500/10"
          >
            <Download size={16} />
            {isRtl ? 'تصدير إكسل' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Comparison Alert Banner */}
      {!loading && !error && comparison.hasChanges && (
        <motion.button
          id="stock-comparison-alert-banner"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsComparisonModalOpen(true)}
          className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-3xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 transition-all text-sm font-bold text-right sm:text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl">
              <TrendingUp size={20} className={comparison.totalDiff > 0 ? "rotate-0 text-emerald-500" : "rotate-180 text-rose-500"} />
            </span>
            <div className="text-right">
              <p className="text-sm font-black">
                {isRtl 
                  ? `تنبيه: تم رصد تغيير في الرصيد مقارنة بالرصيد المرجعي!`
                  : `Alert: Stock balance changes detected compared to reference!`
                }
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">
                {isRtl
                  ? `إجمالي الفرق: ${comparison.totalDiff > 0 ? '+' : ''}${formatNumber(comparison.totalDiff)} كجم`
                  : `Total Difference: ${comparison.totalDiff > 0 ? '+' : ''}${formatNumber(comparison.totalDiff)} kg`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 underline decoration-dotted underline-offset-4">
            <span>{isRtl ? 'اضغط هنا لمشاهدة التفاصيل' : 'Click here to view details'}</span>
          </div>
        </motion.button>
      )}

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-12 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-850 rounded-3xl">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400 font-bold animate-pulse text-sm">
            {isRtl ? 'جاري التحديث والاتصال بالسرفر...' : 'Connecting & updating from server...'}
          </p>
        </div>
      ) : error ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-900/10 border border-red-200 dark:border-red-900/30 rounded-3xl text-center">
          <span className="p-4 bg-red-500/10 text-red-500 rounded-full mb-4">
            <AlertTriangle size={36} />
          </span>
          <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 mb-2">
            {isRtl ? 'فشل تحميل البيانات' : 'Failed to Load Data'}
          </h3>
          <button
            onClick={() => loadData(false)}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg transition-all"
          >
            {isRtl ? 'إعادة المحاولة' : 'Retry Connection'}
          </button>
        </div>
      ) : (
        <>
          {/* Charts & Reports Section */}
          <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl p-5 flex flex-col md:flex-row items-center gap-8">
            <div className="flex flex-col items-center">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2 self-start px-2">
                <PieChartIcon size={14} className="text-emerald-500" />
                {isRtl ? 'تحليل الأصناف والنسب' : 'Varieties & Percentages'}
              </h3>
              <div className="w-48 h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      cornerRadius={6}
                      dataKey="value"
                    >
                      {chartData.map((entry) => (
                        <Cell 
                          key={`cell-${entry.id}`} 
                          fill={VARIETY_COLORS[entry.id] || '#71717a'} 
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${formatNumber(value)} kg`, '']}
                      contentStyle={{ 
                        backgroundColor: '#18181b', 
                        border: 'none', 
                        borderRadius: '12px',
                        fontSize: '10px',
                        color: '#fff',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center Total Metric */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter leading-none mb-1">
                    {isRtl ? 'إجمالي' : 'Total'}
                  </p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white leading-none">
                    {Math.round(stats.totalQty / 1000)}
                    <span className="text-[9px] font-bold ml-0.5">T</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 w-full">
              {chartData.map((item) => (
                <div key={item.id} className="flex flex-col group py-1.5 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: VARIETY_COLORS[item.id] || '#71717a' }} />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-zinc-900 dark:text-zinc-100">{item.percentage.toFixed(1)}%</span>
                      <span className="text-[10px] text-zinc-400 font-medium">({(item.value/1000).toFixed(1)}t)</span>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-1000 ease-out" 
                      style={{ 
                        width: `${item.percentage}%`,
                        backgroundColor: VARIETY_COLORS[item.id] || '#71717a'
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Storage Locations Balances Section - Styled EXACTLY like the varieties block with localized support & custom colors */}
          <div className="mt-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl p-5 flex flex-col md:flex-row items-center gap-8">
            <div className="flex flex-col items-center">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2 self-start px-2">
                <MapPin size={14} className="text-blue-500" />
                {isRtl ? 'تحليل أرصدة ونسب المخازن' : 'Warehouse Balances & Percentages'}
              </h3>
              <div className="w-48 h-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={locationChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      cornerRadius={6}
                      dataKey="value"
                    >
                      {locationChartData.map((entry) => (
                        <Cell 
                          key={`cell-${entry.id}`} 
                          fill={entry.color} 
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${formatNumber(value)} kg`, '']}
                      contentStyle={{ 
                        backgroundColor: '#18181b', 
                        border: 'none', 
                        borderRadius: '12px',
                        fontSize: '10px',
                        color: '#fff',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center Total Metric */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter leading-none mb-1">
                    {isRtl ? 'إجمالي المخزون' : 'Total Stock'}
                  </p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white leading-none">
                    {Math.round(stats.totalQty / 1000)}
                    <span className="text-[9px] font-bold ml-0.5">T</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 w-full">
              {locationChartData.map((item) => (
                <div key={item.id} className="flex flex-col group py-1.5 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0" dir={isRtl ? 'rtl' : 'ltr'}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-zinc-900 dark:text-zinc-100">{item.percentage.toFixed(1)}%</span>
                      <span className="text-[10px] text-zinc-400 font-medium">({(item.value/1000).toFixed(1)}t)</span>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-1000 ease-out" 
                      style={{ 
                        width: `${item.percentage}%`,
                        backgroundColor: item.color
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics summary */}
          <div className="space-y-4 mt-4">
            {/* Primary Inventory Balances (Independent of filters) */}
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest px-2 mb-1 flex items-center gap-1.5">
              <Database size={13} className="text-emerald-500 animate-pulse" />
              {isRtl ? 'إجمالي أرصدة المخزون الرئيسي (ثابت)' : 'Core Inventory Stock Totals (Fixed)'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {/* Olive Stock Card */}
              <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {isRtl ? 'إجمالي رصيد الزيتون' : 'Total Olive Stock'}
                  </span>
                  <div className="p-1.5 bg-emerald-500/5 text-emerald-500 rounded-lg">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black font-sans text-emerald-600 dark:text-emerald-400">
                    {formatNumber(unmodifiedTotals.totalOlive)} <span className="text-xs text-zinc-400 font-medium">kg</span>
                  </h3>
                </div>
              </div>

              {/* Pepper Stock Card */}
              <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl shadow-sm flex flex-col justify-between hover:border-red-500/30 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {isRtl ? 'إجمالي رصيد الفلفل' : 'Total Pepper Stock'}
                  </span>
                  <div className="p-1.5 bg-red-500/5 text-red-500 rounded-lg">
                    <Database size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black font-sans text-red-600 dark:text-red-400">
                    {formatNumber(unmodifiedTotals.totalPepper)} <span className="text-xs text-zinc-400 font-medium">kg</span>
                  </h3>
                </div>
              </div>

              {/* Farza Stock Card */}
              <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl shadow-sm flex flex-col justify-between hover:border-purple-500/30 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {isRtl ? 'إجمالي رصيد الفرزه' : 'Total Farza Stock'}
                  </span>
                  <div className="p-1.5 bg-purple-500/5 text-purple-500 rounded-lg">
                    <Layers size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black font-sans text-purple-600 dark:text-purple-400">
                    {formatNumber(unmodifiedTotals.totalFarza)} <span className="text-xs text-zinc-400 font-medium">kg</span>
                  </h3>
                </div>
              </div>

              {/* Size S Stock Card */}
              <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl shadow-sm flex flex-col justify-between hover:border-amber-500/30 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {isRtl ? 'إجمالي رصيد مقاس S' : 'Total Size S Stock'}
                  </span>
                  <div className="p-1.5 bg-amber-500/5 text-amber-500 rounded-lg">
                    <Percent size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black font-sans text-amber-600 dark:text-amber-400">
                    {formatNumber(unmodifiedTotals.totalS)} <span className="text-xs text-zinc-400 font-medium">kg</span>
                  </h3>
                </div>
              </div>

              {/* Size XXXS Stock Card */}
              <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl shadow-sm flex flex-col justify-between hover:border-blue-500/30 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {isRtl ? 'إجمالي رصيد مقاس XXXS' : 'Total Size XXXS Stock'}
                  </span>
                  <div className="p-1.5 bg-blue-500/5 text-blue-500 rounded-lg">
                    <Layers size={16} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black font-sans text-blue-600 dark:text-blue-400">
                    {formatNumber(unmodifiedTotals.totalXxxs)} <span className="text-xs text-zinc-400 font-medium">kg</span>
                  </h3>
                </div>
              </div>
            </div>


          </div>

          {/* Table Filters Search Bar */}
          <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col items-stretch gap-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  placeholder={isRtl ? 'ابحث بكود الخام أو اسم الصنف...' : 'Search by material code or description...'}
                  className="w-full pl-4 pr-10 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-205 dark:border-zinc-700/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-right"
                  dir={isRtl ? 'rtl' : 'ltr'}
                />
              </div>

              {(searchTerm !== '' || selectedLocations.length > 0 || selectedVarieties.length > 0 || selectedSizes.length > 0 || selectedTreatments.length > 0 || selectedProcesses.length > 0 || selectedAnalyses.length > 0) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedLocations([]);
                    setSelectedVarieties([]);
                    setSelectedSizes([]);
                    setSelectedTreatments([]);
                    setSelectedProcesses([]);
                    setSelectedAnalyses([]);
                  }}
                  className="text-xs text-red-500 hover:text-red-750 font-bold px-3 py-1.5 transition-colors underline decoration-dotted flex items-center gap-1"
                >
                  <X size={14} />
                  {isRtl ? 'تصفير كل الفلاتر' : 'Clear All Filters'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
              {/* Variety Multi-Filter */}
              <MultiSelect
                lang={lang}
                label={isRtl ? 'الأصناف' : 'Varieties'}
                icon={<Filter size={12} />}
                options={varieties.map(v => ({ id: v, label: getVarietyName(v) }))}
                selected={selectedVarieties}
                onChange={setSelectedVarieties}
              />

              {/* Size Multi-Filter */}
              <MultiSelect
                lang={lang}
                label={isRtl ? 'الأحجام' : 'Sizes'}
                icon={<Tag size={12} />}
                options={CATEGORIES_REF.size.map(s => ({ id: s.id, label: isRtl ? s.labelAr : s.labelEn }))}
                selected={selectedSizes}
                onChange={setSelectedSizes}
              />

              {/* Treatment Multi-Filter */}
              <MultiSelect
                lang={lang}
                label={isRtl ? 'التوجيه' : 'Treatments'}
                icon={<TrendingUp size={12} />}
                options={CATEGORIES_REF.direction.map(d => ({ id: d.id, label: isRtl ? d.labelAr : d.labelEn }))}
                selected={selectedTreatments}
                onChange={setSelectedTreatments}
              />

              {/* Process Multi-Filter */}
              <MultiSelect
                lang={lang}
                label={isRtl ? 'عمليات التشغيل' : 'Processes'}
                icon={<Layers size={12} />}
                options={CATEGORIES_REF.process.map(p => ({ id: p.id, label: isRtl ? p.labelAr : p.labelEn }))}
                selected={selectedProcesses}
                onChange={setSelectedProcesses}
              />

              {/* Analysis Multi-Filter */}
              <MultiSelect
                lang={lang}
                label={isRtl ? 'التحليل' : 'Analysis'}
                icon={<CheckCircle size={12} />}
                options={ANALYSIS_CATEGORIES.map(a => ({ id: a.id, label: isRtl ? a.labelAr : a.labelEn }))}
                selected={selectedAnalyses}
                onChange={setSelectedAnalyses}
              />

              {/* Location Multi-Filter */}
              <MultiSelect
                lang={lang}
                label={isRtl ? 'المواقع' : 'Locations'}
                icon={<MapPin size={12} />}
                options={storageLocations.map(loc => ({ id: loc, label: loc }))}
                selected={selectedLocations}
                onChange={setSelectedLocations}
              />
            </div>
          </div>

          {/* Pivot Data Grid Table */}
          <div className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[700px] scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 scroll-smooth">
              <table className="w-full text-sm text-right border-separate border-spacing-0" dir={isRtl ? 'rtl' : 'ltr'}>
                <thead className="text-[10px] uppercase bg-zinc-50/95 dark:bg-zinc-900/95 border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 font-black sticky top-0 z-30 backdrop-blur-md shadow-sm">
                  <tr>
                    <th 
                      scope="col" 
                      className={`px-4 py-3 whitespace-nowrap w-[100px] min-w-[100px] border-b dark:border-zinc-800 transition-all ${pinnedColumns.includes('material_code') ? 'sticky right-0 z-40 bg-zinc-50/95 dark:bg-zinc-900/95 border-l' : ''}`}
                      style={pinnedColumns.includes('material_code') ? { right: 0 } : {}}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{isRtl ? 'كود الخام' : 'Material Code'}</span>
                        <button onClick={() => togglePin('material_code')} className={`p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors ${pinnedColumns.includes('material_code') ? 'text-blue-500' : 'text-zinc-300'}`}>
                          <Pin size={10} className={pinnedColumns.includes('material_code') ? 'fill-current' : ''} />
                        </button>
                      </div>
                    </th>
                    
                    <th 
                      scope="col" 
                      className={`px-4 py-3 whitespace-nowrap min-w-[250px] w-[250px] border-b dark:border-zinc-800 transition-all ${pinnedColumns.includes('material_desc') ? 'sticky z-40 bg-zinc-50/95 dark:bg-zinc-900/95 border-l' : ''}`}
                      style={pinnedColumns.includes('material_desc') ? { right: getPinnedOffset('material_desc', []) } : {}}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{isRtl ? 'وصف الصنف' : 'Material Description'}</span>
                        <button onClick={() => togglePin('material_desc')} className={`p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors ${pinnedColumns.includes('material_desc') ? 'text-blue-500' : 'text-zinc-300'}`}>
                          <Pin size={10} className={pinnedColumns.includes('material_desc') ? 'fill-current' : ''} />
                        </button>
                      </div>
                    </th>

                    <th 
                      scope="col" 
                      className={`px-4 py-3 whitespace-nowrap min-w-[200px] w-[200px] border-b dark:border-zinc-800 transition-all ${pinnedColumns.includes('details') ? 'sticky z-40 bg-zinc-50/95 dark:bg-zinc-900/95 border-l' : ''}`}
                      style={pinnedColumns.includes('details') ? { right: getPinnedOffset('details', []) } : {}}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{isRtl ? 'التفاصيل' : 'Details'}</span>
                        <button onClick={() => togglePin('details')} className={`p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors ${pinnedColumns.includes('details') ? 'text-blue-500' : 'text-zinc-300'}`}>
                          <Pin size={10} className={pinnedColumns.includes('details') ? 'fill-current' : ''} />
                        </button>
                      </div>
                    </th>

                    <th 
                      scope="col" 
                      className={`px-4 py-3 whitespace-nowrap w-[100px] font-black border-b dark:border-zinc-800 transition-all ${pinnedColumns.includes('total_qty') ? 'sticky z-40 bg-zinc-50/95 dark:bg-zinc-900/95 border-l' : 'bg-emerald-50/70 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-x border-zinc-200 dark:border-zinc-700'}`}
                      style={pinnedColumns.includes('total_qty') ? { right: getPinnedOffset('total_qty', []) } : {}}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{isRtl ? 'إجمالي' : 'Total'}</span>
                        <button onClick={() => togglePin('total_qty')} className={`p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors ${pinnedColumns.includes('total_qty') ? 'text-blue-500' : 'text-zinc-300'}`}>
                          <Pin size={10} className={pinnedColumns.includes('total_qty') ? 'fill-current' : ''} />
                        </button>
                      </div>
                    </th>
                    
                    {/* Dynamic Location Columns */}
                    {visibleLocations.map(loc => {
                      const isPinned = pinnedColumns.includes(loc);
                      const offset = getPinnedOffset(loc, visibleLocations);
                      return (
                        <th 
                          key={loc} 
                          scope="col" 
                          className={`px-4 py-3 whitespace-nowrap text-center border-l border-b border-zinc-100 dark:border-zinc-800/50 min-w-[120px] w-[120px] transition-all ${isPinned ? 'sticky z-40 bg-zinc-50/95 dark:bg-zinc-900/95 font-black text-blue-600 dark:text-blue-400' : ''}`}
                          style={isPinned ? { right: offset } : {}}
                        >
                          <div className="flex flex-col items-center gap-0.5 group">
                            <div className="flex items-center justify-between w-full">
                              <MapPin size={10} className={loc.includes('Olive') ? 'text-fuchsia-500' : 'text-blue-500'} />
                              <button onClick={() => togglePin(loc)} className={`p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-opacity ${isPinned ? 'opacity-100 text-blue-500' : 'opacity-20 group-hover:opacity-100 text-zinc-400'}`}>
                                <Pin size={10} className={isPinned ? 'fill-current' : ''} />
                              </button>
                            </div>
                            <span className="truncate max-w-[100px] inline-block">{getLocationName(loc)}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                  {filteredDataset.length === 0 ? (
                    <tr>
                      <td colSpan={visibleLocations.length + 4} className="text-center py-20 bg-zinc-50/10">
                        <div className="flex flex-col items-center gap-3">
                          <Search size={40} className="text-zinc-200 dark:text-zinc-800" />
                          <p className="text-zinc-400 dark:text-zinc-500 font-bold">
                            {isRtl ? 'لا توجد نتائج مطابقة لبحثك الحالي' : 'No stocks match your search variables'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDataset.map((row) => (
                      <tr 
                        key={row.materialCode} 
                        className="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/20 transition-all duration-150 even:bg-zinc-50/20 dark:even:bg-zinc-800/5"
                      >
                        <td 
                          className={`px-4 py-3 font-mono font-black text-[12px] text-zinc-500 dark:text-zinc-400 transition-all ${pinnedColumns.includes('material_code') ? 'sticky right-0 z-20 bg-white group-hover:bg-zinc-50 dark:bg-zinc-950 dark:group-hover:bg-zinc-900 border-l dark:border-zinc-800 shadow-[2px_0_10px_-2px_rgba(0,0,0,0.05)]' : ''}`}
                          style={pinnedColumns.includes('material_code') ? { right: 0 } : {}}
                        >
                          {row.materialCode}
                        </td>
                        <td 
                          className={`px-4 py-3 font-bold text-zinc-800 dark:text-zinc-200 text-[13px] tracking-tight transition-all ${pinnedColumns.includes('material_desc') ? 'sticky z-20 bg-white group-hover:bg-zinc-50 dark:bg-zinc-950 dark:group-hover:bg-zinc-900 border-l dark:border-zinc-800 shadow-[2px_0_10px_-2px_rgba(0,0,0,0.05)]' : ''}`}
                          style={pinnedColumns.includes('material_desc') ? { right: getPinnedOffset('material_desc', []) } : {}}
                        >
                          {row.description || '—'}
                        </td>
                        <td 
                          className={`px-4 py-3 whitespace-nowrap transition-all ${pinnedColumns.includes('details') ? 'sticky z-20 bg-white group-hover:bg-zinc-50 dark:bg-zinc-950 dark:group-hover:bg-zinc-900 border-l dark:border-zinc-800 shadow-[2px_0_10px_-2px_rgba(0,0,0,0.05)]' : ''}`}
                          style={pinnedColumns.includes('details') ? { right: getPinnedOffset('details', []) } : {}}
                        >
                          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 max-w-[200px]">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border w-fit whitespace-nowrap ${getVarietyColor(row.variety)}`}>
                              {getVarietyName(row.variety)}
                            </span>
                            {row.size && (
                              <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[9px] px-1.5 py-0.5 rounded-lg font-black border border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                                {row.size}
                              </span>
                            )}
                            {row.processType && (
                              <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[9px] px-1.5 py-0.5 rounded-lg font-black border border-indigo-100 dark:border-indigo-900/30 whitespace-nowrap">
                                {getAttributeLabel(row.processType, 'process')}
                              </span>
                            )}
                            {row.treatment && (
                              <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] px-1.5 py-0.5 rounded-lg font-black border border-emerald-100 dark:border-emerald-900/30 whitespace-nowrap">
                                {getAttributeLabel(row.treatment, 'direction')}
                              </span>
                            )}
                            {row.analyses && row.analyses.map(analysis => (
                              <span 
                                key={analysis} 
                                className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black border whitespace-nowrap ${getAnalysisColor(analysis)}`}
                              >
                                {getAnalysisLabel(analysis)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td 
                          className={`px-4 py-3 font-black font-mono text-center transition-all ${pinnedColumns.includes('total_qty') ? 'sticky z-20 bg-white group-hover:bg-emerald-50 dark:bg-emerald-950 dark:group-hover:bg-emerald-900 border-l dark:border-zinc-800 shadow-[2px_0_10px_-2px_rgba(0,0,0,0.05)] text-emerald-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-500/5 border-x border-zinc-100 dark:border-zinc-800/60 shadow-inner'}`}
                          style={pinnedColumns.includes('total_qty') ? { right: getPinnedOffset('total_qty', []) } : {}}
                        >
                          <div className="flex flex-col items-center">
                            <span className={row.totalQuantity < 500 ? 'text-rose-500 dark:text-rose-400' : ''}>
                              {formatNumber(row.totalQuantity)}
                            </span>
                          </div>
                        </td>
                        
                        {/* Values for each location */}
                        {visibleLocations.map(loc => {
                          const val = row.locationQuantities[loc] || 0;
                          const isPinned = pinnedColumns.includes(loc);
                          return (
                            <td 
                              key={loc} 
                              className={`px-4 py-3 text-center border-l border-zinc-50 dark:border-zinc-800/30 transition-all ${val > 0 ? 'bg-zinc-50/10' : ''} ${isPinned ? 'sticky z-20 bg-white group-hover:bg-zinc-50 dark:bg-zinc-950 dark:group-hover:bg-zinc-900 shadow-[2px_0_10px_-2px_rgba(0,0,0,0.05)] font-bold' : ''}`}
                              style={isPinned ? { right: getPinnedOffset(loc, visibleLocations) } : {}}
                            >
                              <div className="flex flex-col items-center">
                                <span className={`font-mono text-xs ${val > 0 ? 'text-zinc-900 dark:text-zinc-100 font-bold' : 'text-zinc-200 dark:text-zinc-800'}`}>
                                  {val > 0 ? formatNumber(val) : '—'}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredDataset.length > 0 && (
                  <tfoot className="border-t-2 border-zinc-100 dark:border-zinc-800 font-black bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-900 dark:text-white sticky bottom-0 z-30 backdrop-blur-md">
                    <tr>
                      <td 
                        className={`px-4 py-4 border-l dark:border-zinc-800 transition-all ${pinnedColumns.includes('material_code') ? 'sticky right-0 z-40 bg-zinc-50 dark:bg-zinc-950' : ''}`}
                        style={pinnedColumns.includes('material_code') ? { right: 0 } : {}}
                      >
                        <span className="text-[10px] font-black uppercase text-zinc-400">{isRtl ? 'الإجمالي' : 'Total'}</span>
                      </td>
                      
                      <td 
                        className={`px-4 py-4 transition-all ${pinnedColumns.includes('material_desc') ? 'sticky z-40 bg-zinc-50 dark:bg-zinc-950 border-l dark:border-zinc-800' : ''}`}
                        style={pinnedColumns.includes('material_desc') ? { right: getPinnedOffset('material_desc', []) } : {}}
                      >
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest">{isRtl ? 'الأرصدة المعروضة' : 'Displayed Stocks'}</span>
                      </td>

                      <td 
                        className={`px-4 py-4 transition-all ${pinnedColumns.includes('details') ? 'sticky z-40 bg-zinc-50 dark:bg-zinc-950 border-l dark:border-zinc-800' : ''}`}
                        style={pinnedColumns.includes('details') ? { right: getPinnedOffset('details', []) } : {}}
                      />

                      <td 
                        className={`px-4 py-4 font-mono text-center text-sm font-black text-emerald-600 dark:text-emerald-400 transition-all ${pinnedColumns.includes('total_qty') ? 'sticky z-40 bg-emerald-100 dark:bg-emerald-900/40 border-l dark:border-zinc-800' : 'border-x border-zinc-200 dark:border-zinc-700 bg-emerald-50/50 dark:bg-emerald-500/10'}`}
                        style={pinnedColumns.includes('total_qty') ? { right: getPinnedOffset('total_qty', []) } : {}}
                      >
                        {formatNumber(filteredDataset.reduce((sum, row) => sum + row.totalQuantity, 0))}
                      </td>

                      {visibleLocations.map(loc => {
                        const colSum = filteredDataset.reduce((sum, row) => sum + (row.locationQuantities[loc] || 0), 0);
                        const isPinned = pinnedColumns.includes(loc);
                        return (
                          <td 
                            key={loc} 
                            className={`px-4 py-4 text-center font-mono font-black text-xs text-zinc-600 dark:text-zinc-300 border-l border-zinc-100 dark:border-zinc-800/50 transition-all ${isPinned ? 'sticky z-40 bg-zinc-50 dark:bg-zinc-950' : ''}`}
                            style={isPinned ? { right: getPinnedOffset(loc, visibleLocations) } : {}}
                          >
                            {colSum > 0 ? formatNumber(colSum) : '0'}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Table Footer Stats */}
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-50/60 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Layers size={12} className="text-emerald-500" />
                  ({filteredDataset.length}) {isRtl ? 'صنف متاح في العرض' : 'total items displayed'}
                </span>
                <button 
                  onClick={handleExportToExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 font-black text-[9px] transition-all border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                >
                  <Download size={12} className="text-emerald-500" />
                  <span>{isRtl ? 'تحميل إكسيل بالفلتر' : 'Download Excel (Filtered)'}</span>
                </button>
              </div>
              <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-tighter">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-zinc-500">Richland Assets</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" />
                  <span className="text-zinc-500">Olive Land Assets</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Comparison Details Modal */}
      <AnimatePresence>
        {isComparisonModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" id="comparison-details-modal">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsComparisonModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 overflow-hidden text-right z-10"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <span className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl">
                    <TrendingUp size={22} className={comparison.totalDiff > 0 ? "rotate-0" : "rotate-180"} />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-white">
                      {isRtl ? 'تفاصيل مقارنة أرصدة المخزون' : 'Stock Balance Comparison Details'}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {isRtl 
                        ? 'مقارنة بين الرصيد الجديد المحدث والرصيد المرجعي السابق' 
                        : 'Comparison details between newly fetched sheets and standard reference state'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsComparisonModalOpen(false)}
                  className="p-1.5 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quick Summary Bar */}
              <div className="grid grid-cols-3 gap-3 my-4 bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-800">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">
                    {isRtl ? 'إجمالي الفرق' : 'Net Difference'}
                  </p>
                  <p className={`text-md font-black mt-1 ${comparison.totalDiff > 0 ? 'text-emerald-500' : comparison.totalDiff < 0 ? 'text-rose-500' : 'text-zinc-400'}`}>
                    {comparison.totalDiff > 0 ? '+' : ''}{formatNumber(comparison.totalDiff)} <span className="text-[9px] font-bold">kg</span>
                  </p>
                </div>
                <div className="text-center border-x border-zinc-800/80">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">
                    {isRtl ? 'أصناف زادت' : 'Increased Items'}
                  </p>
                  <p className="text-md font-black text-emerald-500 mt-1">
                    {comparison.details.filter(d => d.diff > 0).length}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">
                    {isRtl ? 'أصناف نقصت' : 'Decreased Items'}
                  </p>
                  <p className="text-md font-black text-rose-500 mt-1">
                    {comparison.details.filter(d => d.diff < 0).length}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[40vh] my-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {comparison.details.map(item => (
                  <div 
                    key={item.materialCode}
                    className="p-3 bg-zinc-950/20 hover:bg-zinc-950/30 rounded-2xl border border-zinc-800/60 flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-black border border-zinc-700/50">
                          {item.materialCode}
                        </span>
                        <span className="text-xs font-bold text-zinc-150 truncate max-w-[280px]">
                          {item.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold">
                        <span>
                          {isRtl ? 'الرصيد السابق:' : 'Previous:'} {formatNumber(item.oldQty)}
                        </span>
                        <span className="text-zinc-800">•</span>
                        <span>
                          {isRtl ? 'الرصيد الحالي:' : 'Current:'} {formatNumber(item.newQty)}
                        </span>
                      </div>
                    </div>

                    <div className="text-left font-sans">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black font-mono border ${
                        item.diff > 0 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        {item.diff > 0 ? '+' : ''}{formatNumber(item.diff)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-zinc-800 mt-4 flex items-center justify-between gap-4">
                <button
                  onClick={() => setIsComparisonModalOpen(false)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white rounded-2xl text-xs font-black cursor-pointer transition-colors"
                >
                  {isRtl ? 'إغلاق' : 'Close'}
                </button>
                <button
                  onClick={handleAcceptNewBalance}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-lg transition-all cursor-pointer"
                >
                  <Check size={14} />
                  {isRtl ? 'اعتماد الرصيد كمرجع للمقارنة' : 'Accept Current Balance as Reference'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

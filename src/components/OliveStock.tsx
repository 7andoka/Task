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
  variety: 'Picual' | 'Azizi' | 'Akas' | 'Manzanilla' | 'Other';
  size: string;
  treatment: string;
  processType: string;
  locationQuantities: Record<string, number>;
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

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedVarieties, setSelectedVarieties] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);

  const isRtl = lang === 'ar';

  const formatNumber = (num: number) => {
    if (num === 0) return '—';
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
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
  const detectVariety = (descr: string): 'Picual' | 'Azizi' | 'Akas' | 'Manzanilla' | 'Other' => {
    const dLower = descr.toLowerCase();
    if (dLower.includes('picual')) return 'Picual';
    if (dLower.includes('azizi')) return 'Azizi';
    if (dLower.includes('akas') || dLower.includes('akass') || dLower.includes('akisi')) return 'Akas';
    if (dLower.includes('manzanilla') || dLower.includes('manzanila')) return 'Manzanilla';
    return 'Other';
  };

  const getVarietyName = (v: string) => {
    switch (v) {
      case 'Picual': return isRtl ? 'بيكال' : 'Picual';
      case 'Azizi': return isRtl ? 'عزيزي' : 'Azizi';
      case 'Akas': return isRtl ? 'عجيزي/أكاس' : 'Akas/Aqezi';
      case 'Manzanilla': return isRtl ? 'منزانيللا' : 'Manzanilla';
      default: return isRtl ? 'آخر / مشكل' : 'Other / mixed';
    }
  };

  const getVarietyColor = (v: string) => {
    switch (v) {
      case 'Picual':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'Azizi':
        return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/50';
      case 'Akas':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50';
      case 'Manzanilla':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-700/50';
    }
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

  const loadData = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const toastId = isManual ? toast.loading(isRtl ? 'جاري تحديث البيانات من شيت جوجل...' : 'Refreshing from Google Sheet...') : null;

    try {
      // Use internal proxy to get access to Last-Modified header which is blocked by CORS in direct fetch
      const response = await fetch('/api/stock-data');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      const { data: text, lastModified: lastModHeader } = result;

      if (!text) {
        throw new Error('Data is empty');
      }

      const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }).format(date);
      };

      if (lastModHeader) {
        try {
          const date = new Date(lastModHeader);
          setLastModified(formatTime(date));
          console.log('Timestamp set:', formatTime(date));
        } catch (e) {
          console.error('Error parsing Last-Modified header:', e);
          setLastModified(null);
        }
      } else {
        console.warn('No Last-Modified or Date header found in response');
        setLastModified(null);
      }

      const parsed = parseCSV(text);
      
      if (parsed.length === 0) {
        throw new Error('Retrieved CSV is empty');
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
  const dataset = useMemo<PivotedStockRow[]>(() => {
    if (rawData.length <= 1) return [];
    
    const headers = rawData[0].map(h => h.trim());
    const materialIdx = headers.indexOf('Material');
    const descrIdx = headers.indexOf('Material Description');
    const unrestrictedIdx = headers.indexOf('Unrestricted');
    const locDescrIdx = headers.indexOf('Descr. of Storage Loc.');

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
      
      // Grouping logic: Richland & Olive Land
      const normalizedLoc = locDescr.toLowerCase().trim();
      const richlandTargets = [
        'raw material', 'wip production', 'qualtiy storage', 'quality storage', 'wip r2e', '10000 m'
      ];

      if (normalizedLoc.startsWith('ol tank')) {
        locDescr = 'Olive Land';
      } else if (
        normalizedLoc.startsWith('tank') || 
        normalizedLoc.startsWith('wip tank') || 
        richlandTargets.includes(normalizedLoc)
      ) {
        locDescr = 'Richland';
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
          locationQuantities: {}
        });
      }

      const entry = pivotMap.get(code)!;
      entry.totalQuantity += quantity;
      entry.locationQuantities[locDescr] = (entry.locationQuantities[locDescr] || 0) + quantity;
    }

    return Array.from(pivotMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [rawData, isRtl]);

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
    return ['Picual', 'Azizi', 'Akas', 'Manzanilla', 'Other'];
  }, []);

  // Filtered dataset
  const filteredDataset = useMemo(() => {
    return dataset.filter(row => {
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
  }, [dataset, searchTerm, selectedLocations, selectedVarieties, selectedSizes, selectedTreatments, selectedProcesses]);

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

  const VARIETY_COLORS: Record<string, string> = {
    Picual: '#10b981',    // Emerald
    Azizi: '#06b6d4',     // Cyan
    Akas: '#8b5cf6',      // Violet
    Manzanilla: '#f59e0b', // Amber
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
        [isRtl ? 'إجمالي الكمية' : 'Total Qty']: item.totalQuantity,
      };
      
      // Add location columns
      storageLocations.forEach(loc => {
        row[loc] = item.locationQuantities[loc] || 0;
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
              {lastModified ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full border border-emerald-500/20 dark:border-emerald-500/10">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    {isRtl ? `تحديث الشيت الأصلي: ${lastModified}` : `Original Sheet Update: ${lastModified}`}
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
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportToExcel}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-emerald-500/10"
          >
            <Download size={16} />
            {isRtl ? 'تصدير إكسل' : 'Export Excel'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-12 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-850 rounded-3xl">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400 font-bold animate-pulse text-sm">
            {isRtl ? 'جاري الاتصال والتحميل من Google Sheet...' : 'Connecting & pulling from Google Sheet...'}
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
          {/* Statistics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
             {/* Stats Cards - Keeping the same style for consistency */}
             <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  {isRtl ? 'إجمالي رصيد الزيتون' : 'Total Olive Stock'}
                </p>
                <h3 className="text-xl font-black font-sans text-zinc-900 dark:text-white">
                  {formatNumber(stats.totalQty)} <span className="text-xs text-zinc-400 font-medium">kg</span>
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-500/5 text-emerald-500 rounded-xl">
                <TrendingUp size={20} />
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  {isRtl ? 'عدد الأصناف المتاحة' : 'Distinct Olive Varieties'}
                </p>
                <h3 className="text-xl font-black font-sans text-zinc-900 dark:text-white">
                  {stats.uniqueItems}
                </h3>
              </div>
              <div className="p-2.5 bg-teal-500/5 text-teal-500 rounded-xl">
                <Layers size={20} />
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  {isRtl ? 'نطاقات التخزين المفعلة' : 'Active Storage Stages'}
                </p>
                <h3 className="text-xl font-black font-sans text-zinc-900 dark:text-white">
                  {stats.uniqueLocs}
                </h3>
              </div>
              <div className="p-2.5 bg-indigo-500/5 text-indigo-500 rounded-xl">
                <MapPin size={20} />
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  {isRtl ? 'الصنف الأكثر توفراً' : 'Most Abundant Variety'}
                </p>
                <h3 className="text-lg font-black font-sans text-zinc-900 dark:text-white truncate">
                  {getVarietyName(stats.topVariety)}
                </h3>
              </div>
              <div className="p-2.5 bg-amber-500/5 text-amber-500 rounded-xl">
                <Percent size={20} />
              </div>
            </div>
          </div>

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

              {(searchTerm !== '' || selectedLocations.length > 0 || selectedVarieties.length > 0 || selectedSizes.length > 0 || selectedTreatments.length > 0 || selectedProcesses.length > 0) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedLocations([]);
                    setSelectedVarieties([]);
                    setSelectedSizes([]);
                    setSelectedTreatments([]);
                    setSelectedProcesses([]);
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right" dir={isRtl ? 'rtl' : 'ltr'}>
                <thead className="text-[10px] uppercase bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th scope="col" className="px-5 py-4 whitespace-nowrap min-w-[100px]">{isRtl ? 'كود الخام' : 'Material Code'}</th>
                    <th scope="col" className="px-5 py-4 whitespace-nowrap min-w-[200px]">{isRtl ? 'وصف الصنف' : 'Material Description'}</th>
                    <th scope="col" className="px-5 py-4 whitespace-nowrap">{isRtl ? 'صنف/حجم/تشغيل' : 'Details'}</th>
                    <th scope="col" className="px-5 py-4 whitespace-nowrap bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white border-x border-zinc-200 dark:border-zinc-700">{isRtl ? 'الإجمالي (كجم)' : 'Total Qty (Kg)'}</th>
                    
                    {/* Dynamic Location Columns */}
                    {storageLocations.map(loc => (
                      <th key={loc} scope="col" className="px-5 py-4 whitespace-nowrap text-center border-l border-zinc-100 dark:border-zinc-800/50">
                        {loc}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {filteredDataset.length === 0 ? (
                    <tr>
                      <td colSpan={storageLocations.length + 4} className="text-center py-12 text-zinc-400 dark:text-zinc-500 font-bold bg-zinc-50/10">
                        {isRtl ? 'لا توجد نتائج مطابقة لبحثك الحالي' : 'No stocks match your search variables'}
                      </td>
                    </tr>
                  ) : (
                    filteredDataset.map((row) => (
                      <tr 
                        key={row.materialCode} 
                        className="hover:bg-zinc-50/40 dark:hover:bg-zinc-800/10 transition-colors"
                      >
                        <td className="px-5 py-4 font-mono font-bold text-[11px] text-zinc-400 dark:text-zinc-500">
                          {row.materialCode}
                        </td>
                        <td className="px-5 py-4 font-bold text-zinc-800 dark:text-zinc-200 text-[13px]">
                          {row.description || '—'}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border w-fit ${getVarietyColor(row.variety)}`}>
                              {getVarietyName(row.variety)}
                            </span>
                            <div className="flex gap-1">
                              {row.size && (
                                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[9px] px-1.5 rounded font-bold border border-zinc-200 dark:border-zinc-700">
                                  {row.size}
                                </span>
                              )}
                              {row.processType && (
                                <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[9px] px-1.5 rounded font-bold border border-indigo-100 dark:border-indigo-900/30">
                                  {getAttributeLabel(row.processType, 'process')}
                                </span>
                              )}
                              {row.treatment && (
                                <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] px-1.5 rounded font-bold border border-emerald-100 dark:border-emerald-900/30">
                                  {getAttributeLabel(row.treatment, 'direction')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-black font-sans text-right text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50/20 dark:bg-emerald-900/10 border-x border-zinc-100 dark:border-zinc-800">
                          {formatNumber(row.totalQuantity)}
                        </td>
                        
                        {/* Values for each location */}
                        {storageLocations.map(loc => {
                          const val = row.locationQuantities[loc] || 0;
                          return (
                            <td 
                              key={loc} 
                              className={`px-5 py-4 text-center font-mono text-xs border-l border-zinc-50 dark:border-zinc-800/40 ${val > 0 ? 'text-zinc-900 dark:text-zinc-100 font-bold' : 'text-zinc-300 dark:text-zinc-700'}`}
                            >
                              {formatNumber(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Stats */}
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-50/40 dark:bg-zinc-800/10 border-t border-zinc-100 dark:border-zinc-800/80">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                ({filteredDataset.length}) {isRtl ? 'صنف متاح في العرض' : 'total items displayed'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

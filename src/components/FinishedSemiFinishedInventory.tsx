import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  Package, 
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
  Link2,
  ExternalLink,
  Settings2,
  RotateCcw,
  CheckCircle2,
  Boxes,
  Info
} from 'lucide-react';
import { DateRangeFilter, DateFilterValue } from './DateRangeFilter';
import { Language, UserProfile } from '../types';
import { toast } from 'sonner';

interface FinishedSemiFinishedInventoryProps {
  lang: Language;
  user?: UserProfile | null;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  icon: any;
  isRtl: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder, 
  icon: Icon,
  isRtl
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedList = useMemo(() => {
    if (!value) return [];
    return value.split(',').map(v => v.trim()).filter(Boolean);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = filter.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(term));
  }, [options, filter]);

  const toggleOption = (opt: string) => {
    let updated: string[];
    if (selectedList.includes(opt)) {
      updated = selectedList.filter(s => s !== opt);
    } else {
      updated = [...selectedList, opt];
    }
    onChange(updated.join(', '));
  };

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
        <Icon size={14} className="text-emerald-500" />
        <span>{label}</span>
      </label>
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="min-h-[42px] px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-1.5 cursor-pointer shadow-xs"
        >
          {selectedList.length === 0 ? (
            <span className="text-zinc-400 font-normal py-1">{placeholder}</span>
          ) : (
            selectedList.map(item => (
              <span 
                key={item} 
                className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[11px]"
              >
                <span>{item}</span>
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(item);
                  }}
                  className="hover:text-red-500 cursor-pointer"
                >
                  <X size={12} />
                </span>
              </span>
            ))
          )}
        </div>

        {isOpen && (
          <div className="absolute top-full mt-1.5 left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl z-50 p-2 space-y-2 max-h-60 flex flex-col">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
              <input 
                type="text" 
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder={isRtl ? 'بحث داخل القائمة...' : 'Search in list...'}
                className="w-full pr-8 pl-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium focus:outline-none"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto space-y-0.5 flex-1 pr-1">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-zinc-400 text-xs">
                  {isRtl ? 'لا توجد خيارات مطابقة' : 'No matching options'}
                </div>
              ) : (
                filteredOptions.map(opt => {
                  const isChecked = selectedList.includes(opt);
                  return (
                    <div 
                      key={opt}
                      onClick={() => toggleOption(opt)}
                      className={`px-3 py-1.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold' 
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span className="truncate">{opt}</span>
                      {isChecked && <Check size={14} className="text-emerald-600" />}
                    </div>
                  );
                })
              )}
            </div>

            {selectedList.length > 0 && (
              <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-[10px]">
                <span className="text-zinc-400">
                  {isRtl ? `تم اختيار ${selectedList.length}` : `Selected: ${selectedList.length}`}
                </span>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange('');
                  }}
                  className="text-red-500 hover:underline font-bold cursor-pointer"
                >
                  {isRtl ? 'إلغاء التحديد' : 'Clear all'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Default Google Sheet CSV Link for Finished & Semi-Finished Products
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOGkYpf6hSa20PDIE2BxZ0ClH7vXd9aA7yrAOxO4nN-afVgi8RdqY8EDbzD_hRHR9A8kYr34RRndv3/pub?gid=527869852&single=true&output=csv';
const STORAGE_KEY = 'richland_finished_semi_finished_sheet_url';

/**
 * Helper to convert any standard Google Sheets URL to a public CSV export URL
 */
function convertToCsvExportUrl(inputUrl: string): string {
  const trimmed = inputUrl.trim();
  if (!trimmed) return '';

  // Already a pub?output=csv or export?format=csv
  if (trimmed.includes('output=csv') || trimmed.includes('format=csv')) {
    return trimmed;
  }

  // Check if it's a standard Google Sheets URL
  // e.g. https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=123456
  // or https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit?gid=123456#gid=123456
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1]) {
    const sheetId = idMatch[1];
    
    // Extract gid if available
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  }

  return trimmed;
}

export default function FinishedSemiFinishedInventory({ lang, user }: FinishedSemiFinishedInventoryProps) {
  const isRtl = lang === 'ar';

  // Check if current user is an Admin
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isAdmin = userRoles.includes('Admin') || user?.role === 'Admin';

  // Sheet URL State (Persisted in localStorage)
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? saved.trim() : DEFAULT_SHEET_URL;
    } catch {
      return DEFAULT_SHEET_URL;
    }
  });

  // Modal State for Link Configuration
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [inputUrl, setInputUrl] = useState(sheetUrl);

  const [data, setData] = useState<any[]>([]);
  const [rawColumns, setRawColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Active Tab: 'movements' | 'balances'
  const [activeTab, setActiveTab] = useState<'movements' | 'balances'>('movements');

  // Search & Filter for Movements
  const [searchTerm, setSearchTerm] = useState('');
  const [movementsDateFilter, setMovementsDateFilter] = useState<DateFilterValue>({ mode: 'all' });
  const [movementsSearchStore, setMovementsSearchStore] = useState('');
  const [movementsTransactionType, setMovementsTransactionType] = useState('all');
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  // Filters for Balances Screen
  const [balanceSearchItem, setBalanceSearchItem] = useState('');
  const [balanceSearchGroup, setBalanceSearchGroup] = useState('');
  const [balanceSearchStore, setBalanceSearchStore] = useState('');

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Load Data from Google Sheet
  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      if (!sheetUrl.trim()) {
        setError(isRtl ? 'لم يتم تحديد رابط Google Sheet بعد' : 'No Google Sheet link specified yet');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const fetchUrl = sheetUrl.includes('?') 
          ? `${sheetUrl}&_t=${Date.now()}` 
          : `${sheetUrl}?_t=${Date.now()}`;

        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const csvText = await response.text();

        // Parse first as raw arrays to intelligently locate headers if the sheet has title or blank top lines
        const rawResults = Papa.parse<string[]>(csvText, {
          header: false,
          skipEmptyLines: true
        });

        if (!rawResults.data || rawResults.data.length === 0) {
          throw new Error(isRtl ? 'الملف فارغ أو لا يحتوي على بيانات' : 'File is empty');
        }

        const rows = rawResults.data;

        // Intelligent Header Row Detection:
        // Look for the first row that has multiple non-empty meaningful column labels
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rows.length, 6); i++) {
          const row = rows[i];
          const nonEmptyCount = row.filter(c => c && String(c).trim() !== '' && String(c).trim() !== 'Values').length;
          // If this row contains keywords like "اسم", "كود", "صنف", "رصيد", "مجموعة", or has >= 3 columns
          const hasKnownKeyword = row.some(c => {
            const lower = String(c).toLowerCase();
            return lower.includes('صنف') || lower.includes('اسم') || lower.includes('كود') || 
                   lower.includes('رصيد') || lower.includes('مجموع') || lower.includes('item') || lower.includes('code');
          });

          if (hasKnownKeyword || nonEmptyCount >= 3) {
            headerRowIndex = i;
            break;
          }
        }

        const headerRow = rows[headerRowIndex].map((h, idx) => {
          const str = String(h || '').trim();
          return str || `_col_${idx + 1}`;
        });

        // Filter valid columns (exclude purely empty headers)
        const validHeaders = headerRow.filter((h, idx) => {
          return h && !h.startsWith('_col_') || rows.some(r => r[idx] && String(r[idx]).trim() !== '');
        });

        const dataRows = rows.slice(headerRowIndex + 1);
        const parsedObjects: any[] = [];

        dataRows.forEach((rowVals, rIdx) => {
          // Check if row is non-empty
          const hasValue = rowVals.some(v => v !== null && v !== undefined && String(v).trim() !== '');
          if (!hasValue) return;

          const obj: any = {};
          headerRow.forEach((colName, cIdx) => {
            if (colName && !colName.startsWith('_col_')) {
              obj[colName] = rowVals[cIdx] !== undefined ? String(rowVals[cIdx]).trim() : '';
            }
          });
          parsedObjects.push(obj);
        });

        if (isCancelled) return;

        setData(parsedObjects);
        const discoveredCols = validHeaders.filter(h => !h.startsWith('_col_'));
        setRawColumns(discoveredCols);
        setLastUpdated(new Date());
        setLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Fetch error:', err);
        setError(
          isRtl 
            ? `تعذر جلب البيانات من الرابط: ${err.message || ''}. يرجى التأكد من نشر ملف Google Sheet إلى الويب بتنسيق CSV أو التحقق من الرابط.`
            : `Failed to fetch data from link: ${err.message || ''}. Please ensure the sheet is published to web as CSV.`
        );
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [sheetUrl, refreshKey, isRtl]);

  // Save new Google Sheet link
  const handleSaveLink = () => {
    const converted = convertToCsvExportUrl(inputUrl);
    if (!converted) {
      toast.error(isRtl ? 'يرجى إدخال رابط صالح' : 'Please enter a valid URL');
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, converted);
      setSheetUrl(converted);
      setShowLinkModal(false);
      setRefreshKey(prev => prev + 1);
      toast.success(isRtl ? 'تم حفظ وتحديث رابط Google Sheet بنجاح' : 'Google Sheet link saved and updated successfully');
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? 'حدث خطأ أثناء حفظ الرابط' : 'Error saving link');
    }
  };

  // Reset to default link
  const handleResetLink = () => {
    setInputUrl(DEFAULT_SHEET_URL);
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSheetUrl(DEFAULT_SHEET_URL);
      setShowLinkModal(false);
      setRefreshKey(prev => prev + 1);
      toast.success(isRtl ? 'تمت استعادة الرابط الافتراضي' : 'Reset to default link');
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to find column matching keywords with priority
  const findColumnKey = (keywords: string[]) => {
    if (rawColumns.length === 0) return null;
    
    // Pass 1: exact matches
    for (const kw of keywords) {
      const cleanKw = kw.toLowerCase().replace(/[\s\-_]/g, '');
      for (const col of rawColumns) {
        const cleanCol = col.toLowerCase().replace(/[\s\-_]/g, '');
        if (cleanCol === cleanKw) return col;
      }
    }

    // Pass 2: partial matches
    for (const kw of keywords) {
      const cleanKw = kw.toLowerCase().replace(/[\s\-_]/g, '');
      for (const col of rawColumns) {
        const cleanCol = col.toLowerCase().replace(/[\s\-_]/g, '');
        if (cleanCol.includes(cleanKw)) {
          if ((cleanKw === 'مخزن' || cleanKw === 'المخزن') && cleanCol.includes('أمين')) continue;
          return col;
        }
      }
    }
    return null;
  };

  // Identified column keys with priority for finished / semi-finished products
  const colCode = findColumnKey(['كود ساب', 'كود قديم', 'رقم الساب', 'كود الصنف', 'sap', 'code', 'كود', 'itemcode', 'رقم الصنف']);
  const colName = findColumnKey(['اسم عربى', 'اسم الصنف', 'اسم المنتج', 'الصنف', 'المنتج', 'name', 'item', 'itemname', 'product']);
  const colGroup = findColumnKey(['المجموعة الثانوية', 'المجموعة', 'مجموعة', 'مجموعه', 'القسم', 'قسم', 'group', 'category']);
  const colStore = findColumnKey(['اسم المخزن', 'المخزن', 'مخزن', 'store', 'warehouse', 'location']);
  const colBatch = findColumnKey(['باتش', 'رقم التشغيلة', 'batch', 'lot']);
  const colDate = findColumnKey(['تاريخ الانتاج', 'تاريخ الصلاحية', 'تاريخ المستند', 'تاريخ الحركة', 'التاريخ', 'تاريخ', 'date', 'production date']);
  // Specified exact user columns with fallback
  const colOpening = findColumnKey(['رصيد اول', 'رصيد أول', 'اول المدة', 'opening', 'begin']);
  const colAddition = findColumnKey(['اضافه', 'اضافة', 'إضافة', 'addition', 'add', 'وارد', 'انتاج', 'إنتاج']);
  const colDispatch = findColumnKey(['صرف2', 'صرف 2', 'صرف', 'dispatch', 'issue', 'out', 'منصرف', 'مبيعات']);
  const colReturn = findColumnKey(['ارتجاع', 'مرتجع', 'return']);
  const colAdjustment = findColumnKey(['تسوية', 'تسويه', 'adjustment', 'هولد', 'hold']);
  const colPreBalance = findColumnKey(['Sum of صافى الرصيد', 'صافى الرصيد', 'Sum of اجمالى الرصيد', 'اجمالى الرصيد', 'رصيد', 'الرصيد', 'balance', 'total balance', 'net balance']);

  // Process data with calculated or pre-existing Current Balance
  const processedData = useMemo(() => {
    return data.map((row, index) => {
      const parseNum = (val: any) => {
        if (val === undefined || val === null || val === '') return 0;
        const num = parseFloat(String(val).replace(/,/g, '').trim());
        return isNaN(num) ? 0 : num;
      };

      const opening = colOpening ? parseNum(row[colOpening]) : 0;
      const addition = colAddition ? parseNum(row[colAddition]) : 0;
      const dispatch = colDispatch ? parseNum(row[colDispatch]) : 0;
      const ret = colReturn ? parseNum(row[colReturn]) : 0;
      const adjustment = colAdjustment ? parseNum(row[colAdjustment]) : 0;

      let currentBalance = 0;
      if (colOpening || colAddition || colDispatch) {
        // Full formula: Opening + Addition + Return + Adjustment - Dispatch
        currentBalance = opening + addition + ret + adjustment - dispatch;
      } else if (colPreBalance && row[colPreBalance] !== undefined && row[colPreBalance] !== '') {
        // Fallback to pre-calculated balance from sheet
        currentBalance = parseNum(row[colPreBalance]);
      }

      return {
        ...row,
        _rowIndex: index + 1,
        _opening: opening,
        _addition: addition,
        _dispatch: dispatch,
        _return: ret,
        _adjustment: adjustment,
        _currentBalance: currentBalance
      };
    });
  }, [data, colOpening, colAddition, colDispatch, colReturn, colAdjustment, colPreBalance]);

  // Helper for multi-query matching
  const matchesMultiQuery = (target: string, query: string) => {
    if (!query.trim()) return true;
    const terms = query.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    if (terms.length === 0) return true;
    const targetLower = target.toLowerCase();
    return terms.some(term => targetLower.includes(term));
  };

  // Helper for normalizing dates to YYYY-MM-DD
  const normalizeToIsoDate = (val: any): string => {
    if (!val) return '';
    const str = String(val).trim();
    if (!str) return '';

    const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  };

  // Filtered data based on search terms for Movements Tab
  const filteredData = useMemo(() => {
    let result = processedData;

    // Filter by store
    if (movementsSearchStore.trim()) {
      result = result.filter(row => {
        const storeVal = colStore ? String(row[colStore] || '') : '';
        return matchesMultiQuery(storeVal, movementsSearchStore);
      });
    }

    // Filter by transaction type
    if (movementsTransactionType !== 'all') {
      result = result.filter(row => {
        if (movementsTransactionType === 'opening') return row._opening > 0;
        if (movementsTransactionType === 'addition') return row._addition > 0;
        if (movementsTransactionType === 'dispatch') return row._dispatch > 0;
        if (movementsTransactionType === 'return') return row._return > 0;
        if (movementsTransactionType === 'adjustment') return row._adjustment !== 0;
        return true;
      });
    }

    // Filter by Date Range
    if (movementsDateFilter.mode !== 'all') {
      result = result.filter(row => {
        let rowDateRaw = '';
        let rowDateIso = '';
        if (colDate && row[colDate]) {
          rowDateRaw = String(row[colDate]).trim();
          rowDateIso = normalizeToIsoDate(rowDateRaw);
        }
        
        if (!rowDateIso && !rowDateRaw) {
          for (const [k, v] of Object.entries(row)) {
            if (k.startsWith('_')) continue;
            const norm = normalizeToIsoDate(v);
            if (norm) {
              rowDateRaw = String(v).trim();
              rowDateIso = norm;
              break;
            }
          }
        }

        if (movementsDateFilter.mode === 'single' && movementsDateFilter.singleDate) {
          if (rowDateIso && rowDateIso === movementsDateFilter.singleDate) return true;
          if (rowDateRaw && rowDateRaw.includes(movementsDateFilter.singleDate)) return true;
          return false;
        }

        const dateToTest = rowDateIso || rowDateRaw;
        if (!dateToTest) return false;

        if (movementsDateFilter.startDate && dateToTest < movementsDateFilter.startDate) return false;
        if (movementsDateFilter.endDate && dateToTest > movementsDateFilter.endDate) return false;
        return true;
      });
    }

    // Free text global search
    if (!searchTerm.trim()) return result;
    const term = searchTerm.toLowerCase();
    const searchParts = term.split(/\s+/).filter(p => p.length > 0);

    return result.filter(row => {
      const rowText = Object.entries(row)
        .filter(([key]) => !key.startsWith('_'))
        .map(([, val]) => String(val ?? '').toLowerCase())
        .join(' ');
      return searchParts.every(part => rowText.includes(part));
    });
  }, [processedData, searchTerm, movementsDateFilter, movementsSearchStore, movementsTransactionType, colStore, colDate]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'currentBalance') {
        aVal = a._currentBalance;
        bVal = b._currentBalance;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal ?? '').toLowerCase();
      const strB = String(bVal ?? '').toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
    return sorted;
  }, [filteredData, sortColumn, sortDirection]);

  // Paginated data
  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  // Aggregated Balance Summary by Item & Group for Balances Tab
  const balanceSummaryData = useMemo(() => {
    let baseData = processedData;

    // Filter by store if user selects a store filter
    if (balanceSearchStore.trim()) {
      baseData = baseData.filter(row => {
        const storeVal = colStore ? String(row[colStore] || '') : '';
        return matchesMultiQuery(storeVal, balanceSearchStore);
      });
    }

    const map = new Map<string, {
      itemCode: string;
      itemName: string;
      groupName: string;
      storeNames: Set<string>;
      unit: string;
      batch: string;
      opening: number;
      addition: number;
      dispatch: number;
      ret: number;
      adjustment: number;
      currentBalance: number;
    }>();

    baseData.forEach(row => {
      const code = colCode ? String(row[colCode] || '').trim() : '-';
      const name = colName ? String(row[colName] || '').trim() : (row['الصنف'] || row['Item'] || 'غير محدد');
      const group = colGroup ? String(row[colGroup] || '').trim() : (isRtl ? 'منتج تام' : 'Finished Goods');
      const store = colStore ? String(row[colStore] || '').trim() : '-';
      const batch = colBatch ? String(row[colBatch] || '').trim() : '-';
      const unitKey = findColumnKey(['وحدة', 'unit']) || '';
      const unit = unitKey ? String(row[unitKey] || 'قطعة') : 'قطعة';

      // Group aggregated balance by item code, name, and group (NOT by individual store)
      const key = `${code}_${name}_${group}`;

      if (!map.has(key)) {
        map.set(key, {
          itemCode: code,
          itemName: name,
          groupName: group,
          storeNames: new Set(store && store !== '-' ? [store] : []),
          unit,
          batch,
          opening: row._opening,
          addition: row._addition,
          dispatch: row._dispatch,
          ret: row._return,
          adjustment: row._adjustment,
          currentBalance: row._currentBalance
        });
      } else {
        const entry = map.get(key)!;
        if (store && store !== '-') {
          entry.storeNames.add(store);
        }
        entry.opening += row._opening;
        entry.addition += row._addition;
        entry.dispatch += row._dispatch;
        entry.ret += row._return;
        entry.adjustment += row._adjustment;
        entry.currentBalance += row._currentBalance;
      }
    });

    let list = Array.from(map.values()).map(item => ({
      ...item,
      storeName: balanceSearchStore.trim() 
        ? balanceSearchStore.trim() 
        : (item.storeNames.size === 0 
            ? (isRtl ? 'كافة المخازن' : 'All Stores') 
            : (item.storeNames.size === 1 
                ? Array.from(item.storeNames)[0] 
                : `${isRtl ? 'مجمع (' : 'Consolidated ('}${item.storeNames.size}${isRtl ? ' مخازن)' : ' stores)'}`))
    }));

    if (balanceSearchItem.trim()) {
      list = list.filter(item => {
        const combined = `${item.itemCode} ${item.itemName}`;
        return matchesMultiQuery(combined, balanceSearchItem) || 
               matchesMultiQuery(item.itemName, balanceSearchItem) ||
               matchesMultiQuery(item.itemCode, balanceSearchItem);
      });
    }

    if (balanceSearchGroup.trim()) {
      list = list.filter(item => 
        matchesMultiQuery(item.groupName, balanceSearchGroup)
      );
    }

    return list;
  }, [processedData, colCode, colName, colGroup, colStore, colBatch, balanceSearchItem, balanceSearchGroup, balanceSearchStore, isRtl]);

  // Overall statistics
  const totalBalanceSum = useMemo(() => {
    return balanceSummaryData.reduce((acc, curr) => acc + curr.currentBalance, 0);
  }, [balanceSummaryData]);

  // Unique lists for Select components
  const uniqueItemsList = useMemo(() => {
    const set = new Set<string>();
    processedData.forEach(row => {
      const code = colCode ? String(row[colCode] || '').trim() : '';
      const name = colName ? String(row[colName] || '').trim() : '';
      if (name) set.add(name);
      if (code) set.add(code);
    });
    return Array.from(set).sort();
  }, [processedData, colCode, colName]);

  const uniqueGroupsList = useMemo(() => {
    const set = new Set<string>();
    processedData.forEach(row => {
      const g = colGroup ? String(row[colGroup] || '').trim() : '';
      if (g) set.add(g);
    });
    return Array.from(set).sort();
  }, [processedData, colGroup]);

  const uniqueStoresList = useMemo(() => {
    const set = new Set<string>();
    processedData.forEach(row => {
      const s = colStore ? String(row[colStore] || '').trim() : '';
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [processedData, colStore]);

  const uniqueDatesList = useMemo(() => {
    const set = new Set<string>();
    processedData.forEach(row => {
      let dateVal = '';
      if (colDate && row[colDate]) {
        dateVal = String(row[colDate]).trim();
      }
      if (!dateVal) {
        for (const [k, v] of Object.entries(row)) {
          if (k.startsWith('_')) continue;
          const norm = normalizeToIsoDate(v);
          if (norm) {
            dateVal = String(v).trim();
            break;
          }
        }
      }
      if (dateVal && dateVal !== '-' && dateVal !== 'null' && dateVal !== 'undefined') {
        set.add(dateVal);
      }
    });

    return Array.from(set).sort((a, b) => {
      const isoA = normalizeToIsoDate(a) || a;
      const isoB = normalizeToIsoDate(b) || b;
      return isoB.localeCompare(isoA);
    });
  }, [processedData, colDate]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCell(text);
    toast.success(isRtl ? `تم نسخ (${label}) بنجاح` : `Copied (${label}) successfully`);
    setTimeout(() => setCopiedCell(null), 2000);
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportRows = sortedData.map((row, idx) => {
      const clean: any = { '#': idx + 1 };
      rawColumns.forEach(col => {
        clean[col] = row[col];
      });
      clean[isRtl ? 'الرصيد الحالي' : 'Current Balance'] = row._currentBalance;
      return clean;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Finished_SemiFinished');
    XLSX.writeFile(workbook, `Finished_Semi_Finished_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(isRtl ? 'تم تصدير ملف Excel بنجاح' : 'Excel exported successfully');
  };

  // Export to CSV
  const exportToCSV = () => {
    const exportRows = sortedData.map((row, idx) => {
      const clean: any = { '#': idx + 1 };
      rawColumns.forEach(col => {
        clean[col] = row[col];
      });
      clean['Current Balance'] = row._currentBalance;
      return clean;
    });

    const csv = Papa.unparse(exportRows);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Finished_Semi_Finished_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(isRtl ? 'تم تصدير ملف CSV بنجاح' : 'CSV exported successfully');
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Finished & Semi-Finished Products Inventory Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableHeaders = ['#', ...rawColumns.slice(0, 6), 'Current Balance'];
    const tableRows = sortedData.map((row, idx) => [
      idx + 1,
      ...rawColumns.slice(0, 6).map(c => row[c] ?? ''),
      row._currentBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })
    ]);

    (doc as any).autoTable({
      head: [tableHeaders],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [13, 148, 136] }
    });

    doc.save(`Finished_Semi_Finished_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(isRtl ? 'تم تصدير ملف PDF بنجاح' : 'PDF exported successfully');
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-cyan-800 rounded-3xl p-4 md:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/30 shrink-0">
            <Boxes size={28} className="text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black tracking-tight">
                {isRtl ? 'إدارة أرصدة منتج تام ونصف مصنع' : 'Finished & Semi-Finished Products Inventory'}
              </h1>
              <span className="px-2.5 py-0.5 bg-emerald-400/30 border border-emerald-300/40 rounded-full text-[11px] font-bold tracking-wide">
                {isRtl ? 'متزامن مع Google Sheet' : 'Google Sheet Synced'}
              </span>
            </div>
            <p className="text-emerald-100 text-xs mt-1 font-medium max-w-2xl">
              {isRtl 
                ? 'متابعة حركة المنتجات التامة ونصف المصنعة، رصيد أول المدة، الإضافات، المنصرف، وحساب الأرصدة لحظياً' 
                : 'Real-time tracking of finished & semi-finished stock, movements, additions, issues, and balances'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 w-full md:w-auto flex-wrap justify-end">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-2xl backdrop-blur-md border border-white/20">
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'movements' ? 'bg-white text-teal-900 shadow-sm' : 'text-white hover:bg-white/20'
              }`}
            >
              <LayoutList size={15} />
              <span>{isRtl ? 'حركات المنتجات' : 'Movements'}</span>
            </button>
            <button
              onClick={() => setActiveTab('balances')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'balances' ? 'bg-white text-amber-900 shadow-sm' : 'text-white hover:bg-white/20'
              }`}
            >
              <Layers size={15} />
              <span>{isRtl ? 'تقرير الأرصدة' : 'Balances'}</span>
            </button>
          </div>

          {/* Google Sheet Link Settings Button - Admin Only */}
          {isAdmin && (
            <button
              onClick={() => {
                setInputUrl(sheetUrl);
                setShowLinkModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold transition-all backdrop-blur-md border border-white/30 shadow-sm cursor-pointer text-xs group"
              title={isRtl ? 'إعداد رابط Google Sheet (للأدمن فقط)' : 'Configure Google Sheet Link (Admin Only)'}
            >
              <Link2 size={15} className="group-hover:rotate-12 transition-transform" />
              <span>{isRtl ? 'رابط Google Sheet' : 'Sheet Link'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold transition-all backdrop-blur-md border border-white/30 shadow-sm cursor-pointer disabled:opacity-50 text-xs"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isRtl ? 'تحديث' : 'Refresh'}</span>
          </button>

          {/* Export Buttons */}
          <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-2xl backdrop-blur-md border border-white/20">
            <button
              onClick={exportToExcel}
              className="px-2.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              title="Excel"
            >
              <FileSpreadsheet size={14} />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={exportToCSV}
              className="px-2.5 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              title="CSV"
            >
              <FileText size={14} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={exportToPDF}
              className="px-2.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              title="PDF"
            >
              <Download size={14} />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
            <Boxes size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-zinc-500">{isRtl ? 'إجمالي الأصناف' : 'Total Items'}</div>
            <div className="text-lg font-black text-zinc-900 dark:text-zinc-100">{uniqueItemsList.length}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-zinc-500">{isRtl ? 'المجموعات' : 'Categories'}</div>
            <div className="text-lg font-black text-zinc-900 dark:text-zinc-100">{uniqueGroupsList.length || 1}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <Database size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-zinc-500">{isRtl ? 'المخازن' : 'Stores'}</div>
            <div className="text-lg font-black text-zinc-900 dark:text-zinc-100">{uniqueStoresList.length || 1}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-zinc-500">{isRtl ? 'إجمالي الرصيد الحالي' : 'Total Stock Balance'}</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {totalBalanceSum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: MOVEMENTS VIEW */}
      {activeTab === 'movements' && (
        <div className="space-y-6 animate-fade-in">
          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-end gap-3 w-full md:w-auto flex-1">
              {/* Global Search Input */}
              <div className="w-full sm:w-80 space-y-1.5">
                <label className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Search size={14} className="text-emerald-500" />
                  <span>{isRtl ? 'بحث عام (PO-no، باتش، رقم الحاوية، كود، صنف...)' : 'Global Search (PO-no, Batch, Container, Code...)'}</span>
                </label>
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={isRtl ? 'ابحث بـ PO-no، باتش، رقم الحاوية، الصنف...' : 'Search by PO-no, Batch, Container, Item...'}
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Transaction Type Filter */}
              <div className="w-full sm:w-48 space-y-1.5">
                <label className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-emerald-500" />
                  <span>{isRtl ? 'نوع الحركة' : 'Movement Type'}</span>
                </label>
                <select
                  value={movementsTransactionType}
                  onChange={(e) => {
                    setMovementsTransactionType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs cursor-pointer"
                >
                  <option value="all">{isRtl ? 'جميع الحركات (الكل)' : 'All Movements'}</option>
                  <option value="opening">{isRtl ? 'رصيد أول المدة' : 'Opening'}</option>
                  <option value="addition">{isRtl ? 'إضافة / وارد' : 'Addition / In'}</option>
                  <option value="dispatch">{isRtl ? 'صرف / منصرف' : 'Dispatch / Out'}</option>
                  <option value="return">{isRtl ? 'مرتجع' : 'Return'}</option>
                  <option value="adjustment">{isRtl ? 'تسوية' : 'Adjustment'}</option>
                </select>
              </div>

              {/* Store Filter */}
              {uniqueStoresList.length > 0 && (
                <div className="w-full sm:w-56">
                  <SearchableSelect
                    label={isRtl ? 'تصفية بالمخزن' : 'Filter by Store'}
                    value={movementsSearchStore}
                    onChange={(val) => {
                      setMovementsSearchStore(val);
                      setCurrentPage(1);
                    }}
                    options={uniqueStoresList}
                    placeholder={isRtl ? 'تصفية بالمخزن...' : 'Filter by Store...'}
                    icon={Database}
                    isRtl={isRtl}
                  />
                </div>
              )}

              {/* Smart Date Range Filter */}
              <div className="w-full sm:w-72">
                <DateRangeFilter
                  value={movementsDateFilter}
                  onChange={(val) => {
                    setMovementsDateFilter(val);
                    setCurrentPage(1);
                  }}
                  availableDates={uniqueDatesList}
                  isRtl={isRtl}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pb-1.5">
              <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                {isRtl ? `عرض ${sortedData.length} سجل` : `Showing ${sortedData.length} records`}
              </div>

              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value={10}>10 {isRtl ? 'صفوف' : 'rows'}</option>
                <option value={15}>15 {isRtl ? 'صفوف' : 'rows'}</option>
                <option value={25}>25 {isRtl ? 'صفوف' : 'rows'}</option>
                <option value={50}>50 {isRtl ? 'صفوف' : 'rows'}</option>
                <option value={100}>100 {isRtl ? 'صفوف' : 'rows'}</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-zinc-500">
                  {isRtl ? 'جاري جلب بيانات المنتج التام ونصف المصنع من Google Sheet...' : 'Loading data from Google Sheet...'}
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-16 gap-4 text-center max-w-lg mx-auto">
                <AlertCircle size={44} className="text-red-500" />
                <p className="text-sm font-bold text-red-600">{error}</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-all cursor-pointer shadow-sm"
                  >
                    {isRtl ? 'إعادة المحاولة' : 'Try Again'}
                  </button>
                  <button
                    onClick={() => {
                      setInputUrl(sheetUrl);
                      setShowLinkModal(true);
                    }}
                    className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {isRtl ? 'تعديل الرابط' : 'Edit Link'}
                  </button>
                </div>
              </div>
            ) : sortedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 gap-3 text-center">
                <Package size={40} className="text-zinc-300" />
                <p className="text-sm font-bold text-zinc-500">{isRtl ? 'لا توجد بيانات مطابقة للبحث' : 'No matching records found'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[65vh] relative">
                <table className="w-full border-collapse text-xs text-zinc-700 dark:text-zinc-300 text-right">
                  <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800/90 backdrop-blur-md z-20 text-zinc-900 dark:text-white uppercase font-black tracking-wider border-b border-zinc-200 dark:border-zinc-700 shadow-xs">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">#</th>
                      {rawColumns.map((col, idx) => (
                        <th 
                          key={idx} 
                          onClick={() => handleSort(col)}
                          className="py-3 px-4 cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1.5 justify-between">
                            <span>{col}</span>
                            <div className="flex flex-col text-[9px] text-zinc-400">
                              <ChevronUp size={10} className={sortColumn === col && sortDirection === 'asc' ? 'text-teal-600' : ''} />
                              <ChevronDown size={10} className={sortColumn === col && sortDirection === 'desc' ? 'text-teal-600' : ''} />
                            </div>
                          </div>
                        </th>
                      ))}
                      {/* Calculated Current Balance Column */}
                      <th 
                        onClick={() => handleSort('currentBalance')}
                        className="py-3 px-4 cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors whitespace-nowrap bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                      >
                        <div className="flex items-center gap-1.5 justify-between">
                          <span>{isRtl ? 'الرصيد المحسوب' : 'Net Balance'}</span>
                          <div className="flex flex-col text-[9px] text-emerald-600">
                            <ChevronUp size={10} className={sortColumn === 'currentBalance' && sortDirection === 'asc' ? 'text-emerald-700' : ''} />
                            <ChevronDown size={10} className={sortColumn === 'currentBalance' && sortDirection === 'desc' ? 'text-emerald-700' : ''} />
                          </div>
                        </div>
                      </th>
                      <th className="py-3 px-3 text-center w-16">{isRtl ? 'إجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {paginatedData.map((row, idx) => {
                      const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                      const cb = row._currentBalance;
                      
                      let balanceBadgeClass = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                      if (cb < 0) {
                        balanceBadgeClass = 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 animate-pulse';
                      } else if (cb === 0) {
                        balanceBadgeClass = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                      }

                      return (
                        <tr 
                          key={idx}
                          onClick={() => setSelectedRow(row)}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer even:bg-zinc-50/50 dark:even:bg-zinc-900/30"
                        >
                          <td className="py-2.5 px-3 text-center font-bold text-zinc-400">{globalIdx}</td>
                          {rawColumns.map((col, cIdx) => (
                            <td key={cIdx} className="py-2.5 px-4 whitespace-nowrap font-medium text-zinc-800 dark:text-zinc-200 max-w-[220px] truncate">
                              {row[col] !== undefined && row[col] !== null ? String(row[col]) : '-'}
                            </td>
                          ))}
                          <td className="py-2.5 px-4 whitespace-nowrap font-extrabold">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-xl border text-xs font-black shadow-xs ${balanceBadgeClass}`}>
                              {cb.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedRow(row)}
                              className="p-1.5 bg-zinc-100 hover:bg-teal-100 dark:bg-zinc-800 dark:hover:bg-teal-950/50 text-zinc-600 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-xl transition-all cursor-pointer shadow-xs"
                              title={isRtl ? 'عرض التفاصيل' : 'View Details'}
                            >
                              <Eye size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Bar */}
            {!loading && !error && sortedData.length > 0 && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  {isRtl 
                    ? `صفحة ${currentPage} من ${totalPages} (${sortedData.length} سجل إجمالي)` 
                    : `Page ${currentPage} of ${totalPages} (${sortedData.length} total records)`
                  }
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer shadow-xs text-zinc-700 dark:text-zinc-300"
                  >
                    <ChevronRight size={16} />
                  </button>

                  <span className="px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-extrabold text-zinc-800 dark:text-zinc-200 shadow-xs">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer shadow-xs text-zinc-700 dark:text-zinc-300"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BALANCES REPORT VIEW */}
      {activeTab === 'balances' && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col animate-fade-in">
          
          {/* Searchable Input Toolbars */}
          <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Item Name / Code */}
            <SearchableSelect
              label={isRtl ? 'البحث أو الاختيار بالصنف' : 'Search or Select Item'}
              value={balanceSearchItem}
              onChange={setBalanceSearchItem}
              options={uniqueItemsList}
              placeholder={isRtl ? 'اكتب أو اختر اسم المنتج/الصنف...' : 'Type or select item name...'}
              icon={Package}
              isRtl={isRtl}
            />

            {/* Store */}
            <SearchableSelect
              label={isRtl ? 'البحث أو الاختيار بالمخزن' : 'Search or Select Store'}
              value={balanceSearchStore}
              onChange={setBalanceSearchStore}
              options={uniqueStoresList}
              placeholder={isRtl ? 'اكتب أو اختر اسم المخزن...' : 'Type or select store name...'}
              icon={Database}
              isRtl={isRtl}
            />

            {/* Group / Category */}
            <SearchableSelect
              label={isRtl ? 'البحث أو الاختيار بالمجموعة' : 'Search or Select Group'}
              value={balanceSearchGroup}
              onChange={setBalanceSearchGroup}
              options={uniqueGroupsList}
              placeholder={isRtl ? 'اكتب أو اختر المجموعة...' : 'Type or select group...'}
              icon={Layers}
              isRtl={isRtl}
            />
          </div>

          {/* Balances Table */}
          <div className="overflow-x-auto p-6 max-h-[65vh]">
            <table className="w-full border-collapse text-xs text-zinc-700 dark:text-zinc-300 text-right">
              <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800 z-10 text-zinc-900 dark:text-white uppercase font-black tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-4">{isRtl ? 'كود الصنف / ساب' : 'Item / SAP Code'}</th>
                  <th className="py-3 px-4">{isRtl ? 'اسم المنتج / الصنف' : 'Item Name'}</th>
                  <th className="py-3 px-4">{isRtl ? 'المخزن' : 'Store'}</th>
                  <th className="py-3 px-4">{isRtl ? 'المجموعة' : 'Group / Category'}</th>
                  <th className="py-3 px-4">{isRtl ? 'الوحدة' : 'Unit'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'رصيد أول المدة' : 'Opening'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'الوارد / الإضافة' : 'Addition'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'المنصرف / الصرف' : 'Dispatch'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'المرتجع' : 'Return'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'التسوية' : 'Adjustment'}</th>
                  <th className="py-3 px-4 text-center bg-teal-500/10 text-teal-800 dark:text-teal-300">{isRtl ? 'الرصيد الحالي' : 'Current Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {balanceSummaryData.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-20 text-zinc-400 font-bold">
                      {isRtl ? 'لا توجد أصناف مطابقة للبحث المحدد' : 'No matching items found'}
                    </td>
                  </tr>
                ) : (
                  balanceSummaryData.map((item, idx) => {
                    const cb = item.currentBalance;
                    let badgeColor = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                    if (cb < 0) {
                      badgeColor = 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 animate-pulse';
                    } else if (cb === 0) {
                      badgeColor = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                    }

                    return (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors even:bg-zinc-50/50 dark:even:bg-zinc-900/30">
                        <td className="py-3 px-3 text-center font-bold text-zinc-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-600 dark:text-zinc-400">{item.itemCode}</td>
                        <td className="py-3 px-4 font-extrabold text-zinc-900 dark:text-white">{item.itemName}</td>
                        <td className="py-3 px-4 font-medium text-teal-600 dark:text-teal-400 italic">{item.storeName}</td>
                        <td className="py-3 px-4 font-medium text-zinc-600 dark:text-zinc-400">{item.groupName}</td>
                        <td className="py-3 px-4 font-medium text-zinc-500">{item.unit}</td>
                        <td className="py-3 px-4 text-center font-bold text-blue-600 dark:text-blue-400">{item.opening.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{item.addition.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center font-bold text-red-600 dark:text-red-400">{item.dispatch.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center font-bold text-amber-600 dark:text-amber-400">{item.ret.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center font-bold text-purple-600 dark:text-purple-400">{item.adjustment.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center font-black">
                          <span className={`inline-flex items-center px-3 py-1 rounded-xl border text-xs font-black shadow-xs ${badgeColor}`}>
                            {cb.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
            <div className="text-xs font-bold text-zinc-500">
              {isRtl ? 'يتم احتساب الرصيد تلقائياً أو وفق صافي الرصيد المتاح من Google Sheet' : 'Balances calculated automatically from Google Sheet movements'}
            </div>
            <button
              onClick={() => {
                setBalanceSearchItem('');
                setBalanceSearchGroup('');
                setBalanceSearchStore('');
              }}
              className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {isRtl ? 'إعادة ضبط الفلتر' : 'Reset Filter'}
            </button>
          </div>
        </div>
      )}

      {/* Row Details Modal */}
      {selectedRow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-gradient-to-r from-teal-700 to-emerald-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Boxes size={22} className="text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {isRtl ? 'تفاصيل سجل المنتج التام ونصف المصنع' : 'Record Details'}
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    {isRtl ? 'كافة بيانات العمود والسجل بدقة' : 'All attributes and calculated balances'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-2 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Highlight Current Balance Box */}
              <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-teal-800 dark:text-teal-300">
                    {isRtl ? 'الرصيد المحسوب للسجل' : 'Calculated Balance for Record'}
                  </span>
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5">
                    {isRtl ? 'حسب حركة أو صافي رصيد الصنف' : 'Based on net movement or sheet balance'}
                  </p>
                </div>
                <span className="text-xl font-black px-4 py-1.5 bg-white dark:bg-zinc-900 rounded-xl border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 shadow-sm">
                  {selectedRow._currentBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Grid of all attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rawColumns.map((col, idx) => {
                  const val = selectedRow[col];
                  const strVal = val !== undefined && val !== null ? String(val) : '-';
                  return (
                    <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <span className="text-[10px] font-bold text-zinc-400 block">{col}</span>
                        <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 truncate">{strVal}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(strVal, col)}
                        className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 rounded-xl transition-all cursor-pointer shrink-0"
                        title={isRtl ? 'نسخ' : 'Copy'}
                      >
                        {copiedCell === strVal ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedRow(null)}
                className="px-6 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheet Link Settings Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 bg-gradient-to-r from-teal-700 to-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Link2 size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {isRtl ? 'إعداد رابط Google Sheet للمنتج التام ونصف المصنع' : 'Google Sheet Link Settings'}
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    {isRtl ? 'ربط وتحديث مصدر بيانات الأصناف التامة ونصف المصنعة' : 'Connect & update finished goods data source'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                  {isRtl ? 'رابط ملف Google Sheet (رابط عادي أو منشور كـ CSV):' : 'Google Sheet URL (Standard or Published CSV):'}
                </label>
                <textarea
                  rows={3}
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-zinc-500">
                  {isRtl 
                    ? '💡 يمكنك لصق رابط المشاركة العادي للشيت وسيقوم النظام تلقائياً بتحويله إلى تنسيق CSV التصديري.' 
                    : '💡 You can paste a regular share link and the system will automatically convert it to CSV format.'}
                </p>
              </div>

              {/* Status Info Box */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700/70 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-zinc-500">{isRtl ? 'الحالة الحالية:' : 'Current Status:'}</span>
                  <span className={error ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1'}>
                    {!error && <CheckCircle2 size={13} />}
                    {error ? (isRtl ? 'يوجد خطأ بالاتصال' : 'Connection Error') : (isRtl ? `متصل (${data.length} سجل)` : `Connected (${data.length} records)`)}
                  </span>
                </div>
                {lastUpdated && (
                  <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                    <span>{isRtl ? 'آخر تحديث ناجح:' : 'Last Updated:'}</span>
                    <span className="font-mono">{lastUpdated.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>

              {/* Instructions Guide */}
              <div className="p-3.5 bg-teal-50/50 dark:bg-teal-950/20 rounded-2xl border border-teal-200 dark:border-teal-900/40 text-xs space-y-1 text-teal-900 dark:text-teal-200">
                <div className="font-bold flex items-center gap-1.5 text-teal-800 dark:text-teal-300">
                  <Info size={14} />
                  <span>{isRtl ? 'كيفية الحصول على الرابط من Google Sheets:' : 'How to publish from Google Sheets:'}</span>
                </div>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px] leading-relaxed pr-1 text-zinc-600 dark:text-zinc-300">
                  <li>{isRtl ? 'افتح ملفك في Google Sheets.' : 'Open your sheet in Google Sheets.'}</li>
                  <li>{isRtl ? 'اضغط على ملف (File) ثم مشاركة (Share) ثم نشر على الويب (Publish to web).' : 'Go to File > Share > Publish to web.'}</li>
                  <li>{isRtl ? 'اختر الصفحة المطلوبة وحدد التنسيق: قيم مفصولة بفواصل (.csv) ثم انسخ الرابط والصقه هنا.' : 'Choose tab and format as Comma-separated values (.csv), then copy & paste link.'}</li>
                </ol>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetLink}
                  className="px-3 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>{isRtl ? 'استعادة الرابط الافتراضي' : 'Reset to Default'}</span>
                </button>

                {sheetUrl && (
                  <a
                    href={sheetUrl.replace('/export?format=csv', '/edit').replace('/pub?output=csv', '/edit')}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink size={13} />
                    <span>{isRtl ? 'فتح في Google Sheets' : 'Open Sheet'}</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveLink}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{isRtl ? 'حفظ وتحديث البيانات' : 'Save & Refresh'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

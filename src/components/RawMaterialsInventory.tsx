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
  Calendar
} from 'lucide-react';
import { DateRangeFilter, DateFilterValue } from './DateRangeFilter';
import { Language } from '../types';
import { toast } from 'sonner';

interface RawMaterialsInventoryProps {
  lang: Language;
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

  const removeTag = (opt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = selectedList.filter(s => s !== opt);
    onChange(updated.join(', '));
  };

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
        <Icon size={14} className="text-emerald-500" />
        <span>{label}</span>
      </label>
      
      <div 
        onClick={() => setIsOpen(true)}
        className="w-full min-h-[42px] px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer flex flex-wrap items-center gap-1.5 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 transition-all"
      >
        {selectedList.length === 0 && !filter && (
          <span className="text-xs text-zinc-400 font-medium">{placeholder}</span>
        )}
        
        {selectedList.map((item, idx) => (
          <span 
            key={idx} 
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold"
          >
            <span className="max-w-[150px] truncate">{item}</span>
            <button
              type="button"
              onClick={(e) => removeTag(item, e)}
              className="text-emerald-500 hover:text-red-500 transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={selectedList.length === 0 ? '' : (isRtl ? 'إضافة بحث...' : 'Add search...')}
          className="flex-1 min-w-[80px] bg-transparent text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
        />

        <div className={`absolute ${isRtl ? 'left-3.5' : 'right-3.5'} top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none text-zinc-400`}>
          {isOpen ? <ChevronUp size={16} className="text-emerald-500" /> : <ChevronDown size={16} />}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-xs text-zinc-500 font-medium">
              {isRtl ? 'لا توجد نتائج' : 'No results found'}
            </div>
          ) : (
            <div className="p-1">
              {selectedList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setFilter('');
                  }}
                  className="w-full text-right px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors flex items-center justify-between mb-1 border-b border-zinc-100 dark:border-zinc-800"
                >
                  <span>{isRtl ? '-- مسح كل الاختيارات --' : '-- Clear All Selections --'}</span>
                  <X size={14} />
                </button>
              )}
              {filteredOptions.map((opt, i) => {
                const isSelected = selectedList.includes(opt);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleOption(opt)}
                    className={`w-full text-right px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-black' 
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-zinc-300 dark:border-zinc-600'
                      }`}>
                        {isSelected && <Check size={12} />}
                      </div>
                      <span className="truncate">{opt}</span>
                    </div>
                    {isSelected && <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-md">{isRtl ? 'مختار' : 'Selected'}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function RawMaterialsInventory({ lang }: RawMaterialsInventoryProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Active Tab: 'movements' | 'balances'
  const [activeTab, setActiveTab] = useState<'movements' | 'balances'>('movements');

  // Search & Filter for Movements
  const [searchTerm, setSearchTerm] = useState('');
  const [movementsDateFilter, setMovementsDateFilter] = useState<DateFilterValue>({ mode: 'all' });
  const [movementsSearchStore, setMovementsSearchStore] = useState('');
  const [movementsTransactionType, setMovementsTransactionType] = useState('all');
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  // Filters for Balances Screen (Searchable inputs with datalist)
  const [balanceSearchItem, setBalanceSearchItem] = useState('');
  const [balanceSearchGroup, setBalanceSearchGroup] = useState('');
  const [balanceSearchStore, setBalanceSearchStore] = useState('');

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const isRtl = lang === 'ar';

  const sheetUrl = 'https://docs.google.com/spreadsheets/d/172hxyV93lz_ej_ADG3uaVFO7imun-6kVl4Z2IRONXtU/export?format=csv&gid=1406823805';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(sheetUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const cleanData = results.data.filter((row: any) => {
              return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '');
            });
            setData(cleanData);
            setLoading(false);
          },
          error: (err) => {
            console.error('Papa parse error:', err);
            setError(isRtl ? 'خطأ في تحليل بيانات ملف CSV' : 'Error parsing CSV data');
            setLoading(false);
          }
        });
      } catch (err) {
        console.error('Fetch error:', err);
        setError(isRtl ? 'فشل الاتصال بملف Google Sheet (تأكد من إتاحة النشر العلني للرابط)' : 'Failed to connect to Google Sheet (Ensure public publish)');
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshKey, isRtl]);

  // Extract columns from first row
  const rawColumns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(col => col.trim() !== '');
  }, [data]);

  // Helper to find column name matching keywords with priority
  const findColumnKey = (keywords: string[]) => {
    if (rawColumns.length === 0) return null;
    
    // Pass 1: Try exact matches first
    for (const kw of keywords) {
      const cleanKw = kw.toLowerCase().replace(/[\s\-_]/g, '');
      for (const col of rawColumns) {
        const cleanCol = col.toLowerCase().replace(/[\s\-_]/g, '');
        if (cleanCol === cleanKw) {
          return col;
        }
      }
    }

    // Pass 2: Try partial matches
    for (const kw of keywords) {
      const cleanKw = kw.toLowerCase().replace(/[\s\-_]/g, '');
      for (const col of rawColumns) {
        const cleanCol = col.toLowerCase().replace(/[\s\-_]/g, '');
        // Heuristic: When looking for store keywords, avoid columns mentioning "أمين" (Storekeeper)
        if (cleanCol.includes(cleanKw)) {
          if ((cleanKw === 'مخزن' || cleanKw === 'المخزن') && cleanCol.includes('أمين')) continue;
          return col;
        }
      }
    }
    return null;
  };

  // Identified column keys with strict priority
  const colCode = findColumnKey(['رقم الساب', 'كود الساب', 'ساب', 'sap', 'كود الصنف', 'itemcode', 'رقم الصنف', 'code', 'كود']);
  const colName = findColumnKey(['اسم الصنف', 'صنف', 'name', 'item', 'itemname']);
  const colGroup = findColumnKey(['مجموعة', 'مجموعه', 'group', 'category', 'قسم', 'section']);
  const colOpening = findColumnKey(['رصيد أول', 'اول المدة', 'رصيد اول', 'opening', 'begin']);
  const colAddition = findColumnKey(['إضافة', 'اضافة', 'addition', 'add', 'وارد']);
  const colDispatch = findColumnKey(['صرف', 'dispatch', 'issue', 'out', 'منصرف']);
  const colReturn = findColumnKey(['ارتجاع', 'مرتجع', 'return']);
  const colAdjustment = findColumnKey(['تسوية', 'تسويه', 'adjustment']);
  const colStore = findColumnKey(['اسم المخزن', 'المخزن', 'مخزن', 'store', 'warehouse']);
  const colDate = findColumnKey(['تاريخ المستند', 'تاريخ الحركة', 'التاريخ', 'تاريخ', 'date', 'posting date', 'doc date', 'document date', 'entry date', 'created date', 'trans date']);

  // Process data with calculated Current Balance
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

      // Formula: Opening + Addition + Return + Adjustment - Dispatch
      const currentBalance = opening + addition + ret + adjustment - dispatch;

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
  }, [data, colOpening, colAddition, colDispatch, colReturn, colAdjustment]);

  // Helper for multi-query matching (comma separated / multi-select)
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

    // Check for YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Check for DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Check if it's a parseable date string
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return '';
  };

  // Filtered data based on search term for Movements Tab
  const filteredData = useMemo(() => {
    let result = processedData;

    // Filter by store
    if (movementsSearchStore.trim()) {
      result = result.filter(row => {
        const storeVal = colStore ? String(row[row[colStore] !== undefined ? colStore : findColumnKey(['مخزن', 'المخزن', 'store'])] || '') : '';
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

    // Filter by movementsDateFilter (Smart Date & Range Selector)
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

        // If single date filter
        if (movementsDateFilter.mode === 'single' && movementsDateFilter.singleDate) {
          if (rowDateIso && rowDateIso === movementsDateFilter.singleDate) return true;
          if (rowDateRaw && rowDateRaw.includes(movementsDateFilter.singleDate)) return true;
          return false;
        }

        // If range or preset with start / end dates
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
      // Combined text for all searchable columns
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
      storeName: string;
      unit: string;
      opening: number;
      addition: number;
      dispatch: number;
      ret: number;
      adjustment: number;
    }>();

    baseData.forEach(row => {
      const code = colCode ? String(row[colCode] || '').trim() : '-';
      const name = colName ? String(row[colName] || '').trim() : (row['الصنف'] || row['Item'] || 'غير محدد');
      const group = colGroup ? String(row[colGroup] || '').trim() : (isRtl ? 'عام' : 'General');
      const store = colStore ? String(row[colStore] || '').trim() : '-';
      const unitKey = findColumnKey(['وحدة', 'unit']) || '';
      const unit = unitKey ? String(row[unitKey] || 'كجم') : 'كجم';

      const key = `${code}_${name}_${group}_${store}`;

      if (!map.has(key)) {
        map.set(key, {
          itemCode: code,
          itemName: name,
          groupName: group,
          storeName: store,
          unit,
          opening: row._opening,
          addition: row._addition,
          dispatch: row._dispatch,
          ret: row._return,
          adjustment: row._adjustment
        });
      } else {
        const entry = map.get(key)!;
        entry.opening += row._opening;
        entry.addition += row._addition;
        entry.dispatch += row._dispatch;
        entry.ret += row._return;
        entry.adjustment += row._adjustment;
      }
    });

    let list = Array.from(map.values()).map(item => ({
      ...item,
      currentBalance: item.opening + item.addition + item.ret + item.adjustment - item.dispatch
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
  }, [processedData, colCode, colName, colGroup, colStore, balanceSearchItem, balanceSearchGroup, balanceSearchStore, isRtl]);

  // Unique lists for Select components in Balances Tab
  const uniqueItemsList = useMemo(() => {
    const set = new Set<string>();
    processedData.forEach(row => {
      const code = colCode ? String(row[colCode] || '').trim() : '';
      const name = colName ? String(row[colName] || '').trim() : '';
      if (name) {
        set.add(code ? `${code} ${name}` : name);
      }
    });
    return Array.from(set).sort();
  }, [processedData, colName, colCode]);

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

  // Unique list of dates present in Movements data (for date search selection)
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'RawMaterials');
    XLSX.writeFile(workbook, `Raw_Materials_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
    link.setAttribute('download', `Raw_Materials_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
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
    doc.text('Raw Materials Inventory Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableHeaders = ['#', ...rawColumns.slice(0, 6), 'Current Balance'];
    const tableRows = sortedData.map((row, idx) => [
      idx + 1,
      ...rawColumns.slice(0, 6).map(c => row[c] ?? ''),
      row._currentBalance.toFixed(2)
    ]);

    (doc as any).autoTable({
      head: [tableHeaders],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [16, 185, 129] }
    });

    doc.save(`Raw_Materials_Inventory_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(isRtl ? 'تم تصدير ملف PDF بنجاح' : 'PDF exported successfully');
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-3 md:p-4 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/30">
            <Package size={24} className="text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-extrabold tracking-tight">
              {isRtl ? 'إدارة أرصدة الخامات الزراعية' : 'Raw Materials Inventory & Balances'}
            </h1>
            <p className="text-emerald-100 text-xs mt-0.5 font-medium">
              {isRtl 
                ? 'متابعة حركة الخامات، رصيد أول المدة، الإضافات، المنصرف، وحساب الرصيد الحالي لحظياً' 
                : 'Real-time tracking of raw materials, opening balances, additions, dispatches and current stock'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto flex-wrap">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-2xl backdrop-blur-md border border-white/20">
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'movements' ? 'bg-white text-emerald-800 shadow-sm' : 'text-white hover:bg-white/20'
              }`}
            >
              <LayoutList size={16} />
              <span>{isRtl ? 'حركات الخامات' : 'Movements'}</span>
            </button>
            <button
              onClick={() => setActiveTab('balances')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'balances' ? 'bg-white text-amber-800 shadow-sm' : 'text-white hover:bg-white/20'
              }`}
            >
              <Layers size={16} />
              <span>{isRtl ? 'أرصدة الأصناف' : 'Balances Report'}</span>
            </button>
          </div>

          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold transition-all backdrop-blur-md border border-white/30 shadow-sm cursor-pointer disabled:opacity-50 text-xs"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>{isRtl ? 'تحديث' : 'Refresh'}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-2xl backdrop-blur-md border border-white/20">
            <button
              onClick={exportToExcel}
              className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Excel"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={exportToCSV}
              className="px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="CSV"
            >
              <FileText size={15} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={exportToPDF}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="PDF"
            >
              <Download size={15} />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: MOVEMENTS VIEW */}
      {activeTab === 'movements' && (
        <div className="space-y-6 animate-fade-in">
          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-end gap-4 w-full md:w-auto flex-1">
              {/* Global Search Input (Smooth & Free Typing) */}
              <div className="w-full sm:w-72 space-y-1.5">
                <label className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Search size={14} className="text-emerald-500" />
                  <span>{isRtl ? 'بحث عام (كود، صنف...)' : 'Global Search (Code, Item...)'}</span>
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
                    placeholder={isRtl ? 'اكتب للبحث بحرية...' : 'Type for free search...'}
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
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
              <div className="w-full sm:w-52 space-y-1.5">
                <label className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-emerald-500" />
                  <span>{isRtl ? 'نوع الحركة' : 'Transaction Type'}</span>
                </label>
                <select
                  value={movementsTransactionType}
                  onChange={(e) => {
                    setMovementsTransactionType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm cursor-pointer"
                >
                  <option value="all">{isRtl ? 'جميع الحركات (الكل)' : 'All Movements'}</option>
                  <option value="opening">{isRtl ? 'رصيد أول المدة' : 'Opening Balance'}</option>
                  <option value="addition">{isRtl ? 'إضافة / وارد' : 'Addition / In'}</option>
                  <option value="dispatch">{isRtl ? 'صرف / منصرف' : 'Dispatch / Out'}</option>
                  <option value="return">{isRtl ? 'مرتجع' : 'Return'}</option>
                  <option value="adjustment">{isRtl ? 'تسوية' : 'Adjustment'}</option>
                </select>
              </div>

              {/* Store Filter for Movements with SearchableSelect */}
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

              {/* Smart Date Range & Day Filter (طريقة اختيار التاريخ والفترة الذكية) */}
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
                <p className="text-xs font-bold text-zinc-500">{isRtl ? 'جاري جلب البيانات من Google Sheet...' : 'Loading data from Google Sheet...'}</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
                <AlertCircle size={40} className="text-red-500" />
                <p className="text-sm font-bold text-red-600">{error}</p>
                <button
                  onClick={() => setRefreshKey(prev => prev + 1)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer"
                >
                  {isRtl ? 'إعادة المحاولة' : 'Try Again'}
                </button>
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
                              <ChevronUp size={10} className={sortColumn === col && sortDirection === 'asc' ? 'text-emerald-500' : ''} />
                              <ChevronDown size={10} className={sortColumn === col && sortDirection === 'desc' ? 'text-emerald-500' : ''} />
                            </div>
                          </div>
                        </th>
                      ))}
                      {/* Calculated Current Balance Column */}
                      <th 
                        onClick={() => handleSort('currentBalance')}
                        className="py-3 px-4 cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors whitespace-nowrap bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      >
                        <div className="flex items-center gap-1.5 justify-between">
                          <span>{isRtl ? 'الرصيد الحالي' : 'Current Balance'}</span>
                          <div className="flex flex-col text-[9px] text-emerald-500">
                            <ChevronUp size={10} className={sortColumn === 'currentBalance' && sortDirection === 'asc' ? 'text-emerald-600' : ''} />
                            <ChevronDown size={10} className={sortColumn === 'currentBalance' && sortDirection === 'desc' ? 'text-emerald-600' : ''} />
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
                            <td key={cIdx} className="py-2.5 px-4 whitespace-nowrap font-medium text-zinc-800 dark:text-zinc-200 max-w-[200px] truncate">
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
                              className="p-1.5 bg-zinc-100 hover:bg-emerald-100 dark:bg-zinc-800 dark:hover:bg-emerald-950/50 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-all cursor-pointer shadow-xs"
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

      {/* TAB 2: FULL-SCREEN BALANCES REPORT VIEW WITH SEARCHABLE INPUTS */}
      {activeTab === 'balances' && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col animate-fade-in">


          {/* Searchable Input Toolbars with SearchableSelect */}
          <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Item Name / Code SearchableSelect */}
            <SearchableSelect
              label={isRtl ? 'البحث أو الاختيار بالصنف' : 'Search or Select Item'}
              value={balanceSearchItem}
              onChange={setBalanceSearchItem}
              options={uniqueItemsList}
              placeholder={isRtl ? 'اكتب أو اختر اسم الصنف...' : 'Type or select item name...'}
              icon={Package}
              isRtl={isRtl}
            />

            {/* Store SearchableSelect */}
            <SearchableSelect
              label={isRtl ? 'البحث أو الاختيار بالمخزن' : 'Search or Select Store'}
              value={balanceSearchStore}
              onChange={setBalanceSearchStore}
              options={uniqueStoresList}
              placeholder={isRtl ? 'اكتب أو اختر اسم المخزن...' : 'Type or select store name...'}
              icon={Database}
              isRtl={isRtl}
            />

            {/* Group / Category SearchableSelect */}
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

          {/* Full Screen Balances Table */}
          <div className="overflow-x-auto p-6 max-h-[65vh]">
            <table className="w-full border-collapse text-xs text-zinc-700 dark:text-zinc-300 text-right">
              <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800 z-10 text-zinc-900 dark:text-white uppercase font-black tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-4">{isRtl ? 'كود الساب (SAP Code)' : 'SAP Code'}</th>
                  <th className="py-3 px-4">{isRtl ? 'اسم الصنف' : 'Item Name'}</th>
                  <th className="py-3 px-4">{isRtl ? 'المخزن' : 'Store'}</th>
                  <th className="py-3 px-4">{isRtl ? 'المجموعة / القسم' : 'Group / Category'}</th>
                  <th className="py-3 px-4">{isRtl ? 'الوحدة' : 'Unit'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'رصيد أول المدة' : 'Opening'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'الإضافة' : 'Addition'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'الصرف' : 'Dispatch'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'المرتجع' : 'Return'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'التسوية' : 'Adjustment'}</th>
                  <th className="py-3 px-4 text-center bg-amber-500/10 text-amber-700 dark:text-amber-300">{isRtl ? 'الرصيد الحالي' : 'Current Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {balanceSummaryData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-20 text-zinc-400 font-bold">
                      {isRtl ? 'لا توجد أصناف مطابقة للبحث المحدد' : 'No matching items found for selected filter'}
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
                        <td className="py-3 px-4 font-medium text-emerald-600 dark:text-emerald-400 italic">{item.storeName}</td>
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
              {isRtl ? 'يتم احتساب الرصيد تلقائياً (أول المدة + الإضافة + المرتجع + التسوية - الصرف)' : 'Calculated automatically: Opening + Addition + Return + Adjustment - Dispatch'}
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
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Package size={22} className="text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {isRtl ? 'تفاصيل سجل الخامات الزراعية' : 'Raw Material Record Details'}
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
              {/* Calculated Current Balance Highlight Box */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{isRtl ? 'الرصيد الحالي المحسوب' : 'Calculated Current Balance'}</span>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {isRtl ? 'أول المدة + الإضافة + المرتجع + التسوية - الصرف' : 'Opening + Addition + Return + Adjustment - Dispatch'}
                  </p>
                </div>
                <span className="text-xl font-black px-4 py-1.5 bg-white dark:bg-zinc-900 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shadow-sm">
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

    </div>
  );
}

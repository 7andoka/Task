import React, { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  X, 
  Scale, 
  RefreshCw, 
  FileSpreadsheet,
  Calendar,
  Truck,
  Hash,
  User,
  RotateCcw,
  CheckCircle2,
  Package,
  ArrowDownUp
} from 'lucide-react';
import { Language, UserProfile } from '../types';
import { PrintTicketModal } from './PrintTicketModal';

interface ScaleReportsProps {
  lang: Language;
  user?: UserProfile;
}

// Robust number parser that handles Arabic-Indic digits, thousand separator commas, spaces, currency symbols
export const parseCleanNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  if (!str) return 0;
  // Convert Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) to standard ASCII
  str = str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  // Remove commas, spaces, quotes, and units
  str = str.replace(/[,_'\s\u00A0a-zA-Zججمكغم]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

// Robust time formatter that handles Excel serial fractions (e.g. 0.793379) and Arabic digits
export const formatCleanTime = (val: any): string => {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  if (!str) return '';
  
  // If it's a decimal number between 0 and 1 (Excel time serial)
  const num = parseFloat(str);
  if (!isNaN(num) && num > 0 && num < 1 && !str.includes(':')) {
    const totalSeconds = Math.round(num * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  // Convert Arabic digits to standard ASCII for consistent display
  str = str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  return str;
};

// Sort key helper for Kartah / Ticket Numbers (from largest/newest to smallest)
export const getTicketSortKey = (row: any): number => {
  const opStr = String(row['رقم العملية'] || row['رقم التذكرة'] || row['operationNo'] || row['ticket'] || '').trim();
  if (/^\d+$/.test(opStr)) {
    return parseInt(opStr, 10);
  }
  const match = opStr.match(/OP-\d+-(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  const digits = opStr.replace(/\D/g, '');
  if (digits) return parseInt(digits, 10);
  return 0;
};

export default function ScaleReports({ lang, user }: ScaleReportsProps) {
  const isRtl = lang === 'ar';
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Dropdown Filter States
  const [searchOperationNo, setSearchOperationNo] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchVehicle, setSearchVehicle] = useState('');
  const [searchDriver, setSearchDriver] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(true);

  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [globalSearch, setGlobalSearch] = useState('');

  // Fetch CSV data from Google Sheet & sort by Kartah number descending
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTudO1jPShZwV1rSVZOnEyyprKync8FfdfV5V-vrqlfThhA0M5XsK3Z_8LPmFtqa9-7TFeHP5Us-7dA/pub?gid=257364122&single=true&output=csv';
        const response = await fetch(url);
        const csvText = await response.text();

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const cleanData = results.data.filter((row: any) => {
              return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '');
            });

            // Sort by ticket / Kartah number descending (from largest to smallest - newest first)
            cleanData.sort((a: any, b: any) => getTicketSortKey(b) - getTicketSortKey(a));

            setData(cleanData);
            setLoading(false);
          },
          error: () => {
            setError(isRtl ? 'حدث خطأ أثناء جلب بيانات الميزان' : 'Error fetching scale data');
            setLoading(false);
          }
        });
      } catch {
        setError(isRtl ? 'فشل الاتصال بالميزان' : 'Failed to connect to scale');
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshKey, isRtl]);

  // Helper to find specific column value in a row dynamically
  const getRowFieldValue = (row: any, candidates: string[]): string => {
    const foundKey = Object.keys(row).find(k => candidates.some(c => k.toLowerCase().includes(c.toLowerCase())));
    return foundKey ? String(row[foundKey] || '').trim() : '';
  };

  // Extract all unique columns across all rows so no data is ever missed
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    const colSet = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        const trimmed = key.trim();
        if (trimmed) colSet.add(trimmed);
      });
    });
    return Array.from(colSet);
  }, [data]);

  // Dynamic Unique Filter Options derived from the actual table data
  const uniqueOperationNos = useMemo(() => {
    const set = new Set<string>();
    data.forEach(row => {
      const val = getRowFieldValue(row, ['رقم العملية', 'رقم التذكرة', 'تذكرة', 'ticket', 'id', 'no', 'operation']);
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => getTicketSortKey({ 'رقم العملية': b }) - getTicketSortKey({ 'رقم العملية': a }));
  }, [data]);

  const uniqueSuppliers = useMemo(() => {
    const set = new Set<string>();
    data.forEach(row => {
      const val = getRowFieldValue(row, ['المورد', 'supplier']);
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [data]);

  const uniqueCustomers = useMemo(() => {
    const set = new Set<string>();
    data.forEach(row => {
      const val = getRowFieldValue(row, ['العميل', 'customer']);
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [data]);

  const uniqueProducts = useMemo(() => {
    const set = new Set<string>();
    data.forEach(row => {
      const val = getRowFieldValue(row, ['الصنف', 'item', 'material', 'خام']);
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [data]);

  const uniqueVehicles = useMemo(() => {
    const set = new Set<string>();
    data.forEach(row => {
      const val = getRowFieldValue(row, ['رقم السيارة', 'السيارة', 'vehicle', 'car', 'plate']);
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [data]);

  const uniqueDrivers = useMemo(() => {
    const set = new Set<string>();
    data.forEach(row => {
      const val = getRowFieldValue(row, ['السائق', 'driver']);
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [data]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    data.forEach(row => {
      const val = getRowFieldValue(row, ['الحالة', 'حالة', 'status']);
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [data]);

  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    data.forEach(row => {
      const val = getRowFieldValue(row, ['المستخدم', 'user', 'محرر']);
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [data]);

  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    data.forEach(row => {
      const val = getRowFieldValue(row, ['تاريخ', 'date']);
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [data]);

  // Filter data based on dropdown criteria and global search
  const filteredData = useMemo(() => {
    return data.filter(row => {
      // Global search across all columns
      if (globalSearch.trim()) {
        const query = globalSearch.toLowerCase().trim();
        const matchesAny = Object.values(row).some(val => 
          val !== null && val !== undefined && String(val).toLowerCase().includes(query)
        );
        if (!matchesAny) return false;
      }

      const opNo = getRowFieldValue(row, ['رقم العملية', 'رقم التذكرة', 'تذكرة', 'ticket', 'id', 'no', 'operation']);
      const dateVal = getRowFieldValue(row, ['تاريخ', 'date']);
      const supplierVal = getRowFieldValue(row, ['المورد', 'supplier']);
      const customerVal = getRowFieldValue(row, ['العميل', 'customer']);
      const productVal = getRowFieldValue(row, ['الصنف', 'item', 'material', 'خام']);
      const vehicleVal = getRowFieldValue(row, ['رقم السيارة', 'السيارة', 'vehicle', 'car', 'plate']);
      const driverVal = getRowFieldValue(row, ['السائق', 'driver']);
      const statusVal = getRowFieldValue(row, ['الحالة', 'حالة', 'status']);
      const userVal = getRowFieldValue(row, ['المستخدم', 'user', 'محرر']);

      // Dropdown filters (Exact matching on non-empty selection)
      if (searchOperationNo && opNo !== searchOperationNo) return false;
      if (searchSupplier && supplierVal !== searchSupplier) return false;
      if (searchCustomer && customerVal !== searchCustomer) return false;
      if (searchProduct && productVal !== searchProduct) return false;
      if (searchVehicle && vehicleVal !== searchVehicle) return false;
      if (searchDriver && driverVal !== searchDriver) return false;
      if (searchStatus && statusVal !== searchStatus) return false;
      if (searchUser && userVal !== searchUser) return false;
      if (searchDate && dateVal !== searchDate) return false;

      // Optional date range
      if (searchDateFrom && dateVal && dateVal < searchDateFrom) return false;
      if (searchDateTo && dateVal && dateVal > searchDateTo) return false;

      return true;
    });
  }, [data, globalSearch, searchOperationNo, searchSupplier, searchCustomer, searchProduct, searchVehicle, searchDriver, searchStatus, searchUser, searchDate, searchDateFrom, searchDateTo]);

  // Active filters count
  const activeFiltersCount = [
    searchOperationNo,
    searchSupplier,
    searchCustomer,
    searchProduct,
    searchVehicle,
    searchDriver,
    searchStatus,
    searchUser,
    searchDate,
    searchDateFrom,
    searchDateTo,
    globalSearch
  ].filter(Boolean).length;

  // Reset filters
  const resetFilters = () => {
    setGlobalSearch('');
    setSearchOperationNo('');
    setSearchSupplier('');
    setSearchCustomer('');
    setSearchProduct('');
    setSearchVehicle('');
    setSearchDriver('');
    setSearchStatus('');
    setSearchUser('');
    setSearchDate('');
    setSearchDateFrom('');
    setSearchDateTo('');
    setCurrentPage(1);
  };

  // Paginated data
  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  // Export to Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ScaleReports");
    XLSX.writeFile(wb, "scale_reports.xlsx");
  };

  // Map a row to operation details for printing with accurate robust weight resolution
  const mapRowToOperation = (row: any) => {
    const w1 = parseCleanNumber(row['وزن 1'] || row['الوزنة الأولى'] || getRowFieldValue(row, ['وزن 1', 'أول', 'first']));
    const w2 = parseCleanNumber(row['وزن 2'] || row['الوزنة الثانية'] || getRowFieldValue(row, ['وزن 2', 'ثاني', 'second']));
    const gross = parseCleanNumber(row['قائم'] || getRowFieldValue(row, ['قائم', 'gross']));
    const tare = parseCleanNumber(row['فارغ'] || getRowFieldValue(row, ['فارغ', 'tare']));
    const rawNet = parseCleanNumber(row['صافي'] || getRowFieldValue(row, ['صافي', 'net']));

    // Accurate calculation and resolution of first, second, gross, tare, and net weights
    const firstWeight = w1 || gross || 0;
    const secondWeight = w2 || tare || 0;
    
    let grossWeight = gross;
    let tareWeight = tare;
    if (!grossWeight && !tareWeight) {
      if (firstWeight > secondWeight) {
        grossWeight = firstWeight;
        tareWeight = secondWeight;
      } else {
        grossWeight = secondWeight;
        tareWeight = firstWeight;
      }
    }

    let netWeight = rawNet;
    if (!netWeight || netWeight === 0) {
      if (grossWeight && tareWeight && grossWeight > tareWeight) {
        netWeight = grossWeight - tareWeight;
      } else if (firstWeight && secondWeight) {
        netWeight = Math.abs(firstWeight - secondWeight);
      } else {
        netWeight = grossWeight || firstWeight || 0;
      }
    }

    const rawTime = getRowFieldValue(row, ['وقت', 'time']);
    const formattedTime = formatCleanTime(rawTime) || new Date().toLocaleTimeString();

    return {
      operationNo: getRowFieldValue(row, ['رقم العملية', 'رقم التذكرة', 'تذكرة', 'ticket', 'id', 'no', 'operation']) || '10000000',
      vehicleNo: getRowFieldValue(row, ['رقم السيارة', 'السيارة', 'vehicle', 'car', 'plate']) || '---',
      driver: getRowFieldValue(row, ['السائق', 'driver']) || '---',
      supplier: getRowFieldValue(row, ['المورد', 'supplier']) || '---',
      customer: getRowFieldValue(row, ['العميل', 'customer']) || '---',
      item: getRowFieldValue(row, ['الصنف', 'item', 'material', 'خام']) || '---',
      poNumber: getRowFieldValue(row, ['أمر الشراء', 'أمر البيع', 'أمر', 'po', 'so', 'permit']) || '---',
      direction: getRowFieldValue(row, ['اتجاه', 'direction', 'حركة', 'نوع']) || 'وارد',
      quantity: parseCleanNumber(getRowFieldValue(row, ['كمية', 'quantity', 'count'])) || 1,
      firstWeight: firstWeight,
      secondWeight: secondWeight,
      grossWeight: grossWeight,
      tareWeight: tareWeight,
      netWeight: netWeight,
      date: getRowFieldValue(row, ['تاريخ', 'date']) || new Date().toISOString().split('T')[0],
      time: formattedTime,
      firstWeightDate: getRowFieldValue(row, ['تاريخ', 'date']),
      firstWeightTime: formattedTime,
      remarks: getRowFieldValue(row, ['ملاحظات', 'remarks', 'notes']) || '',
      userName: getRowFieldValue(row, ['المستخدم', 'user', 'محرر']) || user?.displayName || 'مسؤول الميزان'
    };
  };

  // Helper to format table cell contents nicely
  const formatTableCell = (col: string, val: any) => {
    if (val === null || val === undefined || val === '') return '-';
    const colLower = col.toLowerCase();
    
    // Format Time column if it contains Excel decimal fraction
    if (colLower.includes('وقت') || colLower.includes('time')) {
      return formatCleanTime(val);
    }

    // Format weight columns with thousand separators
    if (
      colLower.includes('وزن') || 
      colLower.includes('قائم') || 
      colLower.includes('فارغ') || 
      colLower.includes('صافي') || 
      colLower.includes('gross') || 
      colLower.includes('tare') || 
      colLower.includes('net')
    ) {
      const num = parseCleanNumber(val);
      return num > 0 ? num.toLocaleString('en-US') : (val === '0' || val === 0 ? '0' : String(val));
    }

    return String(val);
  };

  return (
    <div className="space-y-3 pb-8 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header Banner - Compact & Modern */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 rounded-2xl p-3.5 sm:p-4 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl shadow-inner border border-white/30 shrink-0">
            <Scale size={22} className="text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <span>{isRtl ? 'تقارير الميزان البسكول' : 'Weighbridge Scale Reports'}</span>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-xs">
                {data.length} {isRtl ? 'سجل (مرتب بالأحدث أولاً)' : 'Records (Newest first)'}
              </span>
            </h1>
            <p className="text-emerald-100 text-[11px] font-medium hidden sm:block">
              {isRtl 
                ? 'متابعة أوزان الشاحنات مرتبة برقم الكارتة من الأكبر إلى الأصغر مع فلاتر القوائم المنسدلة الذكية' 
                : 'Live weighbridge truck weight tracking sorted by ticket descending with smart dropdown filters'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              showAdvancedSearch 
                ? "bg-white text-emerald-800 shadow-sm" 
                : "bg-white/15 hover:bg-white/25 text-white border border-white/25"
            }`}
          >
            <Filter size={13} />
            <span>{isRtl ? (showAdvancedSearch ? 'إخفاء الفلاتر' : 'فلاتر القوائم') : (showAdvancedSearch ? 'Hide Filters' : 'Dropdown Filters')}</span>
            {activeFiltersCount > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-mono">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            disabled={loading}
            className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 border border-white/25 transition-all cursor-pointer active:scale-95"
            title={isRtl ? 'تحديث البيانات' : 'Refresh'}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isRtl ? 'تحديث' : 'Refresh'}</span>
          </button>
          <button
            onClick={exportToExcel}
            className="px-3 py-1.5 bg-[#F59E0B] hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
          >
            <FileSpreadsheet size={13} />
            <span>{isRtl ? 'تصدير إكسل' : 'Excel'}</span>
          </button>
        </div>
      </div>

      {/* Smart Dropdown Filters Panel */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-2.5">
        
        {/* Quick Search & Summary Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={isRtl ? 'بحث سريع عام (سيارة، سائق، عميل، صنف، رقم كارتة)...' : 'Quick search across all fields...'}
                className="w-full pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch('')}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title={isRtl ? 'مسح البحث' : 'Clear search'}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <span>{isRtl ? 'المطابق:' : 'Results:'}</span>
              <span className="font-black font-mono">{filteredData.length}</span>
              <span className="text-slate-400">/</span>
              <span className="font-mono">{data.length}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-bold">{isRtl ? 'الصفوف:' : 'Rows:'}</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={filteredData.length || 1000}>{isRtl ? 'الكل' : 'All'}</option>
              </select>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-rose-200 dark:border-rose-900"
              >
                <RotateCcw size={11} />
                <span>{isRtl ? 'تصفير الفلاتر' : 'Reset'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Dropdown Filters Based on Table Data */}
        {showAdvancedSearch && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2 text-[11px] font-bold">
              
              {/* 1. رقم الكارتة / التذكرة */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block flex items-center gap-1">
                  <Hash size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'رقم الكارتة / التذكرة' : 'Ticket No'}</span>
                </label>
                <select
                  value={searchOperationNo}
                  onChange={(e) => {
                    setSearchOperationNo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-2 py-1 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                    searchOperationNo 
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-600 dark:text-emerald-200' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <option value="">{isRtl ? 'الكل (جميع الكارتات)' : 'All Tickets'}</option>
                  {uniqueOperationNos.map((op, idx) => (
                    <option key={idx} value={op}>{op}</option>
                  ))}
                </select>
              </div>

              {/* 2. فلتر الحالة (مطلوب جديد) */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'الحالة' : 'Status'}</span>
                </label>
                <select
                  value={searchStatus}
                  onChange={(e) => {
                    setSearchStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    searchStatus 
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-600 dark:text-emerald-200' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <option value="">{isRtl ? 'الكل (جميع الحالات)' : 'All Statuses'}</option>
                  {uniqueStatuses.map((st, idx) => (
                    <option key={idx} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* 3. المورد */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block">
                  {isRtl ? 'المورد' : 'Supplier'}
                </label>
                <select
                  value={searchSupplier}
                  onChange={(e) => {
                    setSearchSupplier(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer truncate ${
                    searchSupplier 
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-600 dark:text-emerald-200' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <option value="">{isRtl ? 'الكل (جميع الموردين)' : 'All Suppliers'}</option>
                  {uniqueSuppliers.map((sup, idx) => (
                    <option key={idx} value={sup}>{sup}</option>
                  ))}
                </select>
              </div>

              {/* 4. العميل */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block">
                  {isRtl ? 'العميل' : 'Customer'}
                </label>
                <select
                  value={searchCustomer}
                  onChange={(e) => {
                    setSearchCustomer(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer truncate ${
                    searchCustomer 
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-600 dark:text-emerald-200' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <option value="">{isRtl ? 'الكل (جميع العملاء)' : 'All Customers'}</option>
                  {uniqueCustomers.map((cust, idx) => (
                    <option key={idx} value={cust}>{cust}</option>
                  ))}
                </select>
              </div>

              {/* 5. الصنف / الخام */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block flex items-center gap-1">
                  <Package size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'الصنف / الخام' : 'Item / Crop'}</span>
                </label>
                <select
                  value={searchProduct}
                  onChange={(e) => {
                    setSearchProduct(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer truncate ${
                    searchProduct 
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-600 dark:text-emerald-200' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <option value="">{isRtl ? 'الكل (جميع الأصناف)' : 'All Items'}</option>
                  {uniqueProducts.map((p, idx) => (
                    <option key={idx} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* 6. رقم السيارة */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block flex items-center gap-1">
                  <Truck size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'رقم السيارة' : 'Vehicle'}</span>
                </label>
                <select
                  value={searchVehicle}
                  onChange={(e) => {
                    setSearchVehicle(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    searchVehicle 
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-600 dark:text-emerald-200' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <option value="">{isRtl ? 'الكل (جميع السيارات)' : 'All Vehicles'}</option>
                  {uniqueVehicles.map((v, idx) => (
                    <option key={idx} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* 7. اسم السائق */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block">
                  {isRtl ? 'السائق' : 'Driver'}
                </label>
                <select
                  value={searchDriver}
                  onChange={(e) => {
                    setSearchDriver(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer truncate ${
                    searchDriver 
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-600 dark:text-emerald-200' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <option value="">{isRtl ? 'الكل (جميع السائقين)' : 'All Drivers'}</option>
                  {uniqueDrivers.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* 8. التاريخ */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block flex items-center gap-1">
                  <Calendar size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'التاريخ' : 'Date'}</span>
                </label>
                <select
                  value={searchDate}
                  onChange={(e) => {
                    setSearchDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-2 py-1 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                    searchDate 
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-600 dark:text-emerald-200' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <option value="">{isRtl ? 'الكل (جميع التواريخ)' : 'All Dates'}</option>
                  {uniqueDates.map((dt, idx) => (
                    <option key={idx} value={dt}>{dt}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Main Table / Content - Ultra Compact & Responsive */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2.5">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500">{isRtl ? 'جاري الاتصال بالميزان وجلب كافة البيانات مرتبة...' : 'Connecting to scale & fetching all sorted data...'}</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-500 font-bold text-xs">
            {error}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-bold text-xs space-y-2">
            <p>{isRtl ? 'لا توجد بيانات مطابقة لخيارات الفلترة المحددة' : 'No matching records found'}</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-100 cursor-pointer"
              >
                {isRtl ? 'تصفير جميع الفلاتر' : 'Clear All Filters'}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px] sm:text-xs">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black">
                  <th className="py-2.5 px-2.5 text-center w-12 sticky right-0 bg-slate-100 dark:bg-slate-800 z-10 border-l border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-center gap-1">
                      <span>#</span>
                      <ArrowDownUp size={10} className="text-slate-400" />
                    </div>
                  </th>
                  {columns.map((col, idx) => (
                    <th key={idx} className="py-2.5 px-2.5 whitespace-nowrap border-l border-slate-200 dark:border-slate-700 font-black">
                      {col}
                    </th>
                  ))}
                  <th className="py-2.5 px-2.5 text-center sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700 shadow-sm font-black">
                    {isRtl ? 'طباعة التذكرة' : 'Print Ticket'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {paginatedData.map((row, index) => {
                  const globalIndex = (currentPage - 1) * rowsPerPage + index + 1;
                  const operationObj = mapRowToOperation(row);
                  const statusVal = getRowFieldValue(row, ['الحالة', 'حالة', 'status']);

                  return (
                    <tr 
                      key={index} 
                      className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-800/30 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition-colors group"
                    >
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-400 sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-emerald-50/70 dark:group-hover:bg-emerald-950/40 z-10 border-l border-slate-100 dark:border-slate-800 text-[11px]">
                        {globalIndex}
                      </td>

                      {columns.map((col, cIdx) => {
                        const cellVal = row[col];
                        const formatted = formatTableCell(col, cellVal);
                        const isTicketCol = col.includes('عملية') || col.includes('تذكرة') || col.includes('operation') || col.includes('ticket');
                        const isStatusCol = col.includes('الحالة') || col.includes('status');
                        const isWeightCol = col.includes('وزن') || col.includes('قائم') || col.includes('فارغ') || col.includes('صافي');

                        return (
                          <td 
                            key={cIdx} 
                            className={`py-2 px-2.5 whitespace-nowrap border-l border-slate-100/70 dark:border-slate-800/60 font-medium ${
                              isTicketCol ? 'font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                            } ${
                              isWeightCol ? 'font-mono font-bold text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {isStatusCol ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-black border ${
                                statusVal === 'تمت' 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                  : statusVal.includes('أول')
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                              }`}>
                                {formatted}
                              </span>
                            ) : isTicketCol ? (
                              <span className="font-black">
                                {formatted}
                              </span>
                            ) : (
                              formatted
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2 px-2 text-center sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-emerald-50/70 dark:group-hover:bg-emerald-950/40 z-10 border-r border-slate-100 dark:border-slate-800 shadow-xs">
                        <button
                          onClick={() => setSelectedRow(operationObj)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-600 rounded-lg font-bold transition-all flex items-center justify-center gap-1 mx-auto shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap text-[11px]"
                          title={isRtl ? 'معاينة وطباعة تذكرة الميزان الرسمية' : 'Print Scale Ticket'}
                        >
                          <Printer size={12} />
                          <span>{isRtl ? 'طباعة' : 'Print'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Compact Pagination */}
        {!loading && !error && filteredData.length > 0 && (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-slate-500">
            <div>
              {isRtl 
                ? `عرض ${(currentPage - 1) * rowsPerPage + 1} إلى ${Math.min(currentPage * rowsPerPage, filteredData.length)} من إجمالي ${filteredData.length} سجل (المصدر: ${data.length} سجل)`
                : `Showing ${(currentPage - 1) * rowsPerPage + 1} - ${Math.min(currentPage * rowsPerPage, filteredData.length)} of ${filteredData.length} (Total: ${data.length})`}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-0.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md disabled:opacity-30 cursor-pointer font-bold hover:bg-slate-50"
              >
                {isRtl ? 'الأولى' : 'First'}
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md disabled:opacity-30 cursor-pointer hover:bg-slate-50"
              >
                <ChevronRight size={14} />
              </button>
              <span className="text-xs font-bold font-mono px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md disabled:opacity-30 cursor-pointer hover:bg-slate-50"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-0.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md disabled:opacity-30 cursor-pointer font-bold hover:bg-slate-50"
              >
                {isRtl ? 'الأخيرة' : 'Last'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Print Ticket Modal */}
      {selectedRow && (
        <PrintTicketModal
          operation={selectedRow}
          settings={{
            companyName: 'Rich Land Food Industries',
            companyAddress: 'المنطقة الصناعية - ميزان البسكول',
            unit: 'كجم'
          }}
          onClose={() => setSelectedRow(null)}
        />
      )}

    </div>
  );
}


import React, { useEffect, useState, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AnimatePresence, motion } from 'motion/react';
import { normalizeArabicSearch, matchesArabicSearch } from '../utils/arabic';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Check,
  Printer, 
  X, 
  Scale, 
  RefreshCw, 
  FileSpreadsheet,
  Calendar,
  Truck,
  Hash,
  User,
  Users,
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

// Option item for searchable multi-select
export interface MultiSelectSearchOption {
  id: string;
  label: string;
  count?: number;
}

interface MultiSelectSearchProps {
  label: string;
  placeholder?: string;
  options: MultiSelectSearchOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  icon?: React.ReactNode;
  lang: Language;
  align?: 'right' | 'left';
  id?: string;
}

// Reusable Searchable Multi-Select Dropdown Component
function MultiSelectSearch({
  label,
  placeholder,
  options,
  selected,
  onChange,
  icon,
  lang,
  align = 'right',
  id
}: MultiSelectSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isRtl = lang === 'ar';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input with small timeout for smooth transition
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filter options based on typed search query (using Arabic normalization & case-insensitivity)
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.trim();
    return options.filter(opt => 
      matchesArabicSearch(opt.label, q) ||
      matchesArabicSearch(opt.id, q) ||
      opt.label.toLowerCase().includes(q.toLowerCase()) ||
      opt.id.toLowerCase().includes(q.toLowerCase())
    );
  }, [options, searchQuery]);

  const toggleOption = (optId: string) => {
    if (selected.includes(optId)) {
      onChange(selected.filter(item => item !== optId));
    } else {
      onChange([...selected, optId]);
    }
  };

  const selectOnlyOption = (optId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([optId]);
  };

  const selectAllFiltered = () => {
    const allFilteredIds = filteredOptions.map(o => o.id);
    const combined = Array.from(new Set([...selected, ...allFilteredIds]));
    onChange(combined);
  };

  const clearAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredOptions.length > 0) {
      e.preventDefault();
      toggleOption(filteredOptions[0].id);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const selectedLabels = useMemo(() => {
    return selected.map(sId => {
      const opt = options.find(o => o.id === sId);
      return opt ? opt.label : sId;
    });
  }, [selected, options]);

  return (
    <div className="relative w-full" ref={containerRef} id={id}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none text-right ${
          selected.length > 0
            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 shadow-2xs ring-1 ring-emerald-500/20'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
        }`}
        title={selected.length > 0 ? selectedLabels.join(', ') : label}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          {icon && <span className="shrink-0 text-emerald-600 dark:text-emerald-400">{icon}</span>}
          {selected.length === 0 && (
            <span className="truncate text-slate-700 dark:text-slate-300">{label}</span>
          )}
          {selected.length === 1 && (
            <span className="truncate font-black text-emerald-800 dark:text-emerald-300">
              {selectedLabels[0]}
            </span>
          )}
          {selected.length > 1 && (
            <div className="flex items-center gap-1 truncate">
              <span className="truncate">{label}</span>
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0">
                {selected.length}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {selected.length > 0 && (
            <span
              onClick={clearAll}
              title={isRtl ? 'إلغاء التحديد' : 'Clear'}
              className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={`absolute top-full mt-1.5 min-w-[260px] sm:min-w-[280px] max-w-[340px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-2.5 overflow-hidden text-right ${
              align === 'left' ? 'left-0' : 'right-0'
            }`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 px-1">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                {icon}
                <span>{label}</span>
                <span className="text-[10px] text-slate-400 font-mono font-normal">
                  ({options.length})
                </span>
              </span>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[10.5px] text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  {isRtl ? 'إلغاء التحديد' : 'Clear'}
                </button>
              )}
            </div>

            {/* Search Input Box */}
            <div className="relative mb-2">
              <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || (isRtl ? 'ابحث بالكتابة هنا...' : 'Type to search...')}
                className="w-full pr-8 pl-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900 dark:text-slate-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between px-1 py-1 mb-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[10.5px] font-bold text-slate-500">
              <span className="text-slate-400">
                {isRtl ? `النتائج: ${filteredOptions.length}` : `Results: ${filteredOptions.length}`}
              </span>
              <div className="flex items-center gap-2">
                {filteredOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {isRtl ? 'تحديد الظاهر' : 'Select All'}
                  </button>
                )}
                {selected.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-rose-600 hover:underline cursor-pointer"
                  >
                    {isRtl ? 'مسح الكل' : 'Clear All'}
                  </button>
                )}
              </div>
            </div>

            {/* Selected Chips inside Dropdown */}
            {selected.length > 0 && (
              <div className="mb-2 p-1.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center justify-between">
                  <span>{isRtl ? 'المحدد حالياً:' : 'Selected:'}</span>
                  <span className="font-mono text-[9px] bg-emerald-200/60 dark:bg-emerald-800/60 px-1 rounded">
                    {selected.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto custom-scrollbar">
                  {selected.map(sId => {
                    const opt = options.find(o => o.id === sId);
                    return (
                      <span
                        key={sId}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60 shadow-2xs"
                      >
                        <span className="truncate max-w-[120px]">{opt ? opt.label : sId}</span>
                        <span
                          onClick={() => toggleOption(sId)}
                          className="hover:text-rose-600 cursor-pointer p-0.5"
                        >
                          <X size={10} />
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
              {filteredOptions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-medium">
                  {isRtl ? 'لا توجد عناصر مطابقة للبحث' : 'No matching options found'}
                </div>
              ) : (
                filteredOptions.map(option => {
                  const isChecked = selected.includes(option.id);
                  return (
                    <div
                      key={option.id}
                      onClick={() => toggleOption(option.id)}
                      className={`group w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-xs transition-colors cursor-pointer select-none ${
                        isChecked
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-emerald-400'
                          }`}
                        >
                          {isChecked && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span className="truncate" title={option.label}>
                          {option.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {option.count !== undefined && (
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                            {option.count}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => selectOnlyOption(option.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-[9.5px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-200 rounded font-bold transition-opacity"
                          title={isRtl ? 'تحديد هذا العنصر فقط' : 'Select only this'}
                        >
                          {isRtl ? 'فقط' : 'Only'}
                        </button>
                      </div>
                    </div>
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

  // Multi-Select Search Filter States
  const [selectedOperationNos, setSelectedOperationNos] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
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

  // Helper to extract unique options and record counts for multi-select dropdowns
  const getUniqueOptionsWithCount = (candidates: string[]): MultiSelectSearchOption[] => {
    const counts = new Map<string, number>();
    data.forEach(row => {
      const val = getRowFieldValue(row, candidates);
      if (val) {
        counts.set(val, (counts.get(val) || 0) + 1);
      }
    });
    return Array.from(counts.entries()).map(([val, count]) => ({
      id: val,
      label: val,
      count
    }));
  };

  // Dynamic Unique Filter Options derived from actual table data with counts
  const uniqueOperationNos = useMemo(() => {
    const list = getUniqueOptionsWithCount(['رقم العملية', 'رقم التذكرة', 'تذكرة', 'ticket', 'id', 'no', 'operation']);
    return list.sort((a, b) => getTicketSortKey({ 'رقم العملية': b.id }) - getTicketSortKey({ 'رقم العملية': a.id }));
  }, [data]);

  const uniqueSuppliers = useMemo(() => {
    const list = getUniqueOptionsWithCount(['المورد', 'supplier']);
    return list.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [data]);

  const uniqueCustomers = useMemo(() => {
    const list = getUniqueOptionsWithCount(['العميل', 'customer']);
    return list.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [data]);

  const uniqueProducts = useMemo(() => {
    const list = getUniqueOptionsWithCount(['الصنف', 'item', 'material', 'خام']);
    return list.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [data]);

  const uniqueVehicles = useMemo(() => {
    const list = getUniqueOptionsWithCount(['رقم السيارة', 'السيارة', 'vehicle', 'car', 'plate']);
    return list.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [data]);

  const uniqueDrivers = useMemo(() => {
    const list = getUniqueOptionsWithCount(['السائق', 'driver']);
    return list.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [data]);

  const uniqueStatuses = useMemo(() => {
    const list = getUniqueOptionsWithCount(['الحالة', 'حالة', 'status']);
    return list.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [data]);

  const uniqueUsers = useMemo(() => {
    const list = getUniqueOptionsWithCount(['المستخدم', 'user', 'محرر']);
    return list.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  }, [data]);

  const uniqueDates = useMemo(() => {
    const list = getUniqueOptionsWithCount(['تاريخ', 'date']);
    return list.sort((a, b) => b.label.localeCompare(a.label));
  }, [data]);

  // Filter data based on multi-select dropdown criteria, date range, and global search
  const filteredData = useMemo(() => {
    return data.filter(row => {
      // Global search across all columns with Arabic normalization
      if (globalSearch.trim()) {
        const query = globalSearch.toLowerCase().trim();
        const matchesAny = Object.values(row).some(val => 
          val !== null && val !== undefined && (
            matchesArabicSearch(String(val), query) ||
            String(val).toLowerCase().includes(query)
          )
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

      // Multi-select matching (allows choosing multiple items per category)
      if (selectedOperationNos.length > 0 && !selectedOperationNos.includes(opNo)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(statusVal)) return false;
      if (selectedSuppliers.length > 0 && !selectedSuppliers.includes(supplierVal)) return false;
      if (selectedCustomers.length > 0 && !selectedCustomers.includes(customerVal)) return false;
      if (selectedProducts.length > 0 && !selectedProducts.includes(productVal)) return false;
      if (selectedVehicles.length > 0 && !selectedVehicles.includes(vehicleVal)) return false;
      if (selectedDrivers.length > 0 && !selectedDrivers.includes(driverVal)) return false;
      if (selectedDates.length > 0 && !selectedDates.includes(dateVal)) return false;
      if (selectedUsers.length > 0 && !selectedUsers.includes(userVal)) return false;

      // Optional date range filter
      if (searchDateFrom && dateVal && dateVal < searchDateFrom) return false;
      if (searchDateTo && dateVal && dateVal > searchDateTo) return false;

      return true;
    });
  }, [
    data, 
    globalSearch, 
    selectedOperationNos, 
    selectedStatuses, 
    selectedSuppliers, 
    selectedCustomers, 
    selectedProducts, 
    selectedVehicles, 
    selectedDrivers, 
    selectedDates, 
    selectedUsers, 
    searchDateFrom, 
    searchDateTo
  ]);

  // Active filters count across all categories
  const activeFiltersCount = 
    selectedOperationNos.length +
    selectedStatuses.length +
    selectedSuppliers.length +
    selectedCustomers.length +
    selectedProducts.length +
    selectedVehicles.length +
    selectedDrivers.length +
    selectedDates.length +
    selectedUsers.length +
    (searchDateFrom ? 1 : 0) +
    (searchDateTo ? 1 : 0) +
    (globalSearch.trim() ? 1 : 0);

  // Reset all filters
  const resetFilters = () => {
    setGlobalSearch('');
    setSelectedOperationNos([]);
    setSelectedStatuses([]);
    setSelectedSuppliers([]);
    setSelectedCustomers([]);
    setSelectedProducts([]);
    setSelectedVehicles([]);
    setSelectedDrivers([]);
    setSelectedDates([]);
    setSelectedUsers([]);
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

        {/* Dynamic Multi-Select Searchable Filters Based on Table Data */}
        {showAdvancedSearch && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2 text-[11px] font-bold">
              
              {/* 1. رقم الكارتة / التذكرة */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] flex items-center gap-1">
                  <Hash size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'رقم الكارتة' : 'Ticket No'}</span>
                </label>
                <MultiSelectSearch
                  id="scale-filter-ticket"
                  label={isRtl ? 'رقم الكارتة' : 'Ticket No'}
                  placeholder={isRtl ? 'بحث برقم الكارتة...' : 'Search ticket...'}
                  icon={<Hash size={12} />}
                  options={uniqueOperationNos}
                  selected={selectedOperationNos}
                  onChange={(val) => { setSelectedOperationNos(val); setCurrentPage(1); }}
                  lang={lang}
                  align={isRtl ? 'right' : 'left'}
                />
              </div>

              {/* 2. فلتر الحالة */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'الحالة' : 'Status'}</span>
                </label>
                <MultiSelectSearch
                  id="scale-filter-status"
                  label={isRtl ? 'الحالة' : 'Status'}
                  placeholder={isRtl ? 'بحث بالحالة...' : 'Search status...'}
                  icon={<CheckCircle2 size={12} />}
                  options={uniqueStatuses}
                  selected={selectedStatuses}
                  onChange={(val) => { setSelectedStatuses(val); setCurrentPage(1); }}
                  lang={lang}
                  align={isRtl ? 'right' : 'left'}
                />
              </div>

              {/* 3. المورد */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] flex items-center gap-1">
                  <User size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'المورد' : 'Supplier'}</span>
                </label>
                <MultiSelectSearch
                  id="scale-filter-supplier"
                  label={isRtl ? 'المورد' : 'Supplier'}
                  placeholder={isRtl ? 'بحث باسم المورد...' : 'Search supplier...'}
                  icon={<User size={12} />}
                  options={uniqueSuppliers}
                  selected={selectedSuppliers}
                  onChange={(val) => { setSelectedSuppliers(val); setCurrentPage(1); }}
                  lang={lang}
                  align={isRtl ? 'right' : 'left'}
                />
              </div>

              {/* 4. العميل */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] flex items-center gap-1">
                  <Users size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'العميل' : 'Customer'}</span>
                </label>
                <MultiSelectSearch
                  id="scale-filter-customer"
                  label={isRtl ? 'العميل' : 'Customer'}
                  placeholder={isRtl ? 'بحث باسم العميل...' : 'Search customer...'}
                  icon={<Users size={12} />}
                  options={uniqueCustomers}
                  selected={selectedCustomers}
                  onChange={(val) => { setSelectedCustomers(val); setCurrentPage(1); }}
                  lang={lang}
                  align={isRtl ? 'right' : 'left'}
                />
              </div>

              {/* 5. الصنف / الخام */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] flex items-center gap-1">
                  <Package size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'الصنف / الخام' : 'Item / Crop'}</span>
                </label>
                <MultiSelectSearch
                  id="scale-filter-product"
                  label={isRtl ? 'الصنف' : 'Item'}
                  placeholder={isRtl ? 'بحث بالصنف...' : 'Search item...'}
                  icon={<Package size={12} />}
                  options={uniqueProducts}
                  selected={selectedProducts}
                  onChange={(val) => { setSelectedProducts(val); setCurrentPage(1); }}
                  lang={lang}
                  align={isRtl ? 'left' : 'right'}
                />
              </div>

              {/* 6. رقم السيارة */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] flex items-center gap-1">
                  <Truck size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'رقم السيارة' : 'Vehicle'}</span>
                </label>
                <MultiSelectSearch
                  id="scale-filter-vehicle"
                  label={isRtl ? 'السيارة' : 'Vehicle'}
                  placeholder={isRtl ? 'بحث برقم السيارة...' : 'Search vehicle...'}
                  icon={<Truck size={12} />}
                  options={uniqueVehicles}
                  selected={selectedVehicles}
                  onChange={(val) => { setSelectedVehicles(val); setCurrentPage(1); }}
                  lang={lang}
                  align={isRtl ? 'left' : 'right'}
                />
              </div>

              {/* 7. اسم السائق */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] flex items-center gap-1">
                  <User size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'السائق' : 'Driver'}</span>
                </label>
                <MultiSelectSearch
                  id="scale-filter-driver"
                  label={isRtl ? 'السائق' : 'Driver'}
                  placeholder={isRtl ? 'بحث باسم السائق...' : 'Search driver...'}
                  icon={<User size={12} />}
                  options={uniqueDrivers}
                  selected={selectedDrivers}
                  onChange={(val) => { setSelectedDrivers(val); setCurrentPage(1); }}
                  lang={lang}
                  align={isRtl ? 'left' : 'right'}
                />
              </div>

              {/* 8. التاريخ */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] flex items-center gap-1">
                  <Calendar size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'التاريخ' : 'Date'}</span>
                </label>
                <MultiSelectSearch
                  id="scale-filter-date"
                  label={isRtl ? 'التاريخ' : 'Date'}
                  placeholder={isRtl ? 'بحث بالتاريخ...' : 'Search date...'}
                  icon={<Calendar size={12} />}
                  options={uniqueDates}
                  selected={selectedDates}
                  onChange={(val) => { setSelectedDates(val); setCurrentPage(1); }}
                  lang={lang}
                  align={isRtl ? 'left' : 'right'}
                />
              </div>

            </div>

            {/* Additional Date Range & User Filter Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                  <Calendar size={12} className="text-emerald-600" />
                  <span>{isRtl ? 'نطاق التاريخ (من / إلى):' : 'Date Range (From / To):'}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={searchDateFrom}
                    onChange={(e) => { setSearchDateFrom(e.target.value); setCurrentPage(1); }}
                    className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    title={isRtl ? 'من تاريخ' : 'From Date'}
                  />
                  <span className="text-slate-400 font-bold">←</span>
                  <input
                    type="date"
                    value={searchDateTo}
                    onChange={(e) => { setSearchDateTo(e.target.value); setCurrentPage(1); }}
                    className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    title={isRtl ? 'إلى تاريخ' : 'To Date'}
                  />
                  {(searchDateFrom || searchDateTo) && (
                    <button
                      type="button"
                      onClick={() => { setSearchDateFrom(''); setSearchDateTo(''); setCurrentPage(1); }}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title={isRtl ? 'مسح نطاق التاريخ' : 'Clear range'}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {uniqueUsers.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[200px]">
                  <span className="text-[11px] text-slate-500 font-bold shrink-0">
                    {isRtl ? 'المستخدم:' : 'User:'}
                  </span>
                  <div className="flex-1">
                    <MultiSelectSearch
                      id="scale-filter-user"
                      label={isRtl ? 'المستخدم / المحرر' : 'Operator / User'}
                      placeholder={isRtl ? 'بحث بالمستخدم...' : 'Search user...'}
                      icon={<User size={12} />}
                      options={uniqueUsers}
                      selected={selectedUsers}
                      onChange={(val) => { setSelectedUsers(val); setCurrentPage(1); }}
                      lang={lang}
                      align={isRtl ? 'left' : 'right'}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Active Filters Tag Pills */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-slate-500 font-bold flex items-center gap-1">
                  <Filter size={11} className="text-emerald-600" />
                  <span>{isRtl ? 'الفلاتر النشطة:' : 'Active:'}</span>
                </span>

                {selectedOperationNos.map(id => (
                  <span key={'op-' + id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold">
                    <span>{isRtl ? 'كارتة:' : 'Ticket:'} {id}</span>
                    <button type="button" onClick={() => setSelectedOperationNos(prev => prev.filter(x => x !== id))} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {selectedStatuses.map(id => (
                  <span key={'st-' + id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold">
                    <span>{isRtl ? 'الحالة:' : 'Status:'} {id}</span>
                    <button type="button" onClick={() => setSelectedStatuses(prev => prev.filter(x => x !== id))} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {selectedSuppliers.map(id => (
                  <span key={'sup-' + id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold">
                    <span>{isRtl ? 'المورد:' : 'Supplier:'} {id}</span>
                    <button type="button" onClick={() => setSelectedSuppliers(prev => prev.filter(x => x !== id))} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {selectedCustomers.map(id => (
                  <span key={'cust-' + id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold">
                    <span>{isRtl ? 'العميل:' : 'Customer:'} {id}</span>
                    <button type="button" onClick={() => setSelectedCustomers(prev => prev.filter(x => x !== id))} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {selectedProducts.map(id => (
                  <span key={'prod-' + id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold">
                    <span>{isRtl ? 'الصنف:' : 'Item:'} {id}</span>
                    <button type="button" onClick={() => setSelectedProducts(prev => prev.filter(x => x !== id))} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {selectedVehicles.map(id => (
                  <span key={'veh-' + id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold">
                    <span>{isRtl ? 'سيارة:' : 'Vehicle:'} {id}</span>
                    <button type="button" onClick={() => setSelectedVehicles(prev => prev.filter(x => x !== id))} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {selectedDrivers.map(id => (
                  <span key={'drv-' + id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold">
                    <span>{isRtl ? 'سائق:' : 'Driver:'} {id}</span>
                    <button type="button" onClick={() => setSelectedDrivers(prev => prev.filter(x => x !== id))} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {selectedDates.map(id => (
                  <span key={'dt-' + id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold font-mono">
                    <span>{id}</span>
                    <button type="button" onClick={() => setSelectedDates(prev => prev.filter(x => x !== id))} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {selectedUsers.map(id => (
                  <span key={'usr-' + id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold">
                    <span>{isRtl ? 'مستخدم:' : 'User:'} {id}</span>
                    <button type="button" onClick={() => setSelectedUsers(prev => prev.filter(x => x !== id))} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {searchDateFrom && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold font-mono">
                    <span>{isRtl ? 'من:' : 'From:'} {searchDateFrom}</span>
                    <button type="button" onClick={() => setSearchDateFrom('')} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                )}

                {searchDateTo && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold font-mono">
                    <span>{isRtl ? 'إلى:' : 'To:'} {searchDateTo}</span>
                    <button type="button" onClick={() => setSearchDateTo('')} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-2 py-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-rose-200 dark:border-rose-900"
                >
                  <RotateCcw size={10} />
                  <span>{isRtl ? 'مسح الكل' : 'Clear All'}</span>
                </button>
              </div>
            )}
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


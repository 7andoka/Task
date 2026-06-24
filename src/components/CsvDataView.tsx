import React, { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  X, 
  BarChart3, 
  RefreshCw, 
  FileSpreadsheet, 
  Maximize2,
  TrendingUp,
  Info,
  Check,
  Package2,
  Hash
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
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Language } from '../types';

interface CsvDataViewProps {
  lang: Language;
}

export default function CsvDataView({ lang }: CsvDataViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [showColumnToggles, setShowColumnToggles] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Detail Modal state
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  // Chart configuration state
  const [chartXAxis, setChartXAxis] = useState<string>('');
  const [chartYAxis, setChartYAxis] = useState<string>('count'); // 'count' or a numeric column
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [showCharts, setShowCharts] = useState(true);

  // Fetch the data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vTOGkYpf6hSa20PDIE2BxZ0ClH7vXd9aA7yrAOxO4nN-afVgi8RdqY8EDbzD_hRHR9A8kYr34RRndv3/pub?gid=527869852&single=true&output=csv');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Clean up empty objects or rows
            const cleanData = results.data.filter((row: any) => {
              return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '');
            });
            setData(cleanData);
            
            // Set initial visible columns
            if (cleanData.length > 0) {
              const allCols = Object.keys(cleanData[0]).filter(key => key.trim() !== '');
              setVisibleColumns(allCols);
              
              // Pick an initial categorical column for X-Axis of the chart
              // Choose one with reasonable number of unique values
              const categorical = allCols.find(col => {
                const uniqueVals = new Set(cleanData.map(r => String(r[col]).trim())).size;
                return uniqueVals > 1 && uniqueVals < 15;
              });
              setChartXAxis(categorical || allCols[0]);
            }
            setLoading(false);
          },
          error: (err) => {
            setError(lang === 'ar' ? 'خطأ في تحميل البيانات' : 'Error loading data');
            setLoading(false);
          }
        });
      } catch (err) {
        setError(lang === 'ar' ? 'خطأ في الاتصال بالسيرفر' : 'Connection error');
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshKey, lang]);

  // Extract all columns
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(key => key.trim() !== '');
  }, [data]);

  // Detect numeric columns dynamically
  const numericColumns = useMemo(() => {
    if (data.length === 0) return [];
    return columns.filter(col => {
      let numericCount = 0;
      let nonNumericCount = 0;
      data.forEach(row => {
        const val = String(row[col]).trim();
        if (val === '') return; // Skip empty
        if (!isNaN(Number(val))) {
          numericCount++;
        } else {
          nonNumericCount++;
        }
      });
      // If majority of values are numeric, classify as numeric column
      return numericCount > 0 && numericCount > nonNumericCount;
    });
  }, [data, columns]);

  // Identify categorical columns for filters (cardinality between 2 and 20)
  const filterableColumns = useMemo(() => {
    return columns.filter(col => {
      const uniqueVals = new Set(data.map(row => String(row[col]).trim()).filter(v => v !== ''));
      return uniqueVals.size > 1 && uniqueVals.size <= 20;
    });
  }, [data, columns]);

  // Get unique values for each filterable column
  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    filterableColumns.forEach(col => {
      const unique = Array.from(new Set(data.map(row => String(row[col]).trim()).filter(v => v !== '')));
      options[col] = unique.sort((a, b) => a.localeCompare(b));
    });
    return options;
  }, [data, filterableColumns]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedFilters({});
  };

  // Filter and Search data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(row => {
        return columns.some(col => {
          const val = String(row[col] || '').toLowerCase();
          return val.includes(searchLower);
        });
      });
    }

    // Dropdown filters
    Object.entries(selectedFilters).forEach(([col, value]) => {
      if (value !== '') {
        result = result.filter(row => String(row[col]).trim() === value);
      }
    });

    return result;
  }, [data, searchTerm, selectedFilters, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    const result = [...filteredData];
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        // Check if numeric sort is appropriate
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        // Fallback to string sort
        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
        if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    const half = Math.floor(maxButtons / 2);
    let start = currentPage - half;
    let end = currentPage + half;

    if (start < 1) {
      start = 1;
      end = Math.min(totalPages, maxButtons);
    }

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, totalPages - maxButtons + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFilters, rowsPerPage]);

  // Sort handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const count = filteredData.length;
    
    // Pick top numeric columns to summarize
    const topNumeric = numericColumns.slice(0, 3);
    const summaries = topNumeric.map(col => {
      const sum = filteredData.reduce((acc, row) => {
        const val = Number(row[col]);
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
      const avg = count > 0 ? sum / count : 0;
      return {
        column: col,
        sum: sum.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        avg: avg.toLocaleString(undefined, { maximumFractionDigits: 2 })
      };
    });

    return {
      count,
      summaries
    };
  }, [filteredData, numericColumns]);

  // Chart data calculation
  const chartData = useMemo(() => {
    if (!chartXAxis) return [];

    const grouped: Record<string, { name: string; count: number; sum: number; values: number[] }> = {};

    filteredData.forEach(row => {
      const xVal = String(row[chartXAxis] || (lang === 'ar' ? 'غير محدد' : 'N/A')).trim();
      const name = xVal === '' ? (lang === 'ar' ? 'غير محدد' : 'N/A') : xVal;

      if (!grouped[name]) {
        grouped[name] = { name, count: 0, sum: 0, values: [] };
      }

      grouped[name].count += 1;

      if (chartYAxis !== 'count') {
        const yVal = Number(row[chartYAxis]);
        if (!isNaN(yVal)) {
          grouped[name].sum += yVal;
          grouped[name].values.push(yVal);
        }
      }
    });

    return Object.values(grouped).map(group => {
      const value = chartYAxis === 'count' ? group.count : group.sum;
      return {
        name: group.name,
        [lang === 'ar' ? 'القيمة' : 'Value']: Number(value.toFixed(2)),
        [lang === 'ar' ? 'العدد' : 'Count']: group.count
      };
    }).slice(0, 15); // Limit to top 15 categories for neatness
  }, [filteredData, chartXAxis, chartYAxis, lang]);

  // Export to Excel handler
  const handleExportExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(filteredData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Finished Product");
      XLSX.writeFile(wb, `finished_product_report_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e) {
      console.error(e);
    }
  };

  // Export to CSV handler
  const handleExportCsv = () => {
    try {
      const csvContent = Papa.unparse(filteredData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `finished_product_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  // Column visibility toggle helpers
  const handleToggleColumn = (col: string) => {
    setVisibleColumns(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const handleSelectAllColumns = () => {
    setVisibleColumns(columns);
  };

  const handleClearAllColumns = () => {
    if (columns.length > 0) {
      setVisibleColumns([columns[0]]); // Keep at least one column visible
    }
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">
          {lang === 'ar' ? 'جاري جلب وتحليل بيانات المنتج النهائي من المصدر...' : 'Fetching and analyzing finished product data from source...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full pb-10" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Title & Actions bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Package2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {lang === 'ar' ? 'لوحة بيانات المنتج التام' : 'Finished Product Dashboard'}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {lang === 'ar' 
                ? 'مزامنة مباشرة مع جدول البيانات التفاعلي للمنتجات والكميات المكتملة' 
                : 'Live synchronization with the interactive spreadsheet of finished items and stock'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl transition"
            title={lang === 'ar' ? 'تحديث البيانات' : 'Sync data'}
          >
            <RefreshCw className="w-4 h-4" />
            <span>{lang === 'ar' ? 'مزامنة' : 'Sync'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تصدير إكسل' : 'Export Excel'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white text-white rounded-xl shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Dynamic KPIs cards based on numeric data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records Card */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {lang === 'ar' ? 'إجمالي السجلات' : 'Total Records'}
            </p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {kpis.count}
            </p>
            <p className="text-[10px] text-zinc-400">
              {lang === 'ar' ? 'عدد الأسطر المفلترة' : 'Filtered row count'}
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <Hash className="w-6 h-6" />
          </div>
        </div>

        {/* Dynamic Numeric Cards */}
        {kpis.summaries.map((summary, idx) => {
          const colors = [
            { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
            { bg: 'bg-amber-500/10', text: 'text-amber-500' },
            { bg: 'bg-purple-500/10', text: 'text-purple-500' }
          ];
          const color = colors[idx % colors.length];

          return (
            <div key={summary.column} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div className="space-y-1 max-w-[70%]">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate" title={summary.column}>
                  {lang === 'ar' ? `مجموع ${summary.column}` : `Total ${summary.column}`}
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 truncate" title={summary.sum}>
                  {summary.sum}
                </p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {lang === 'ar' ? `المعدل: ${summary.avg}` : `Avg: ${summary.avg}`}
                </p>
              </div>
              <div className={`p-3 ${color.bg} ${color.text} rounded-xl`}>
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          );
        })}

        {/* Informative placeholder if there are fewer numeric columns */}
        {kpis.summaries.length < 3 && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-zinc-900 dark:to-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
            <Info className="w-8 h-8 text-emerald-600 shrink-0" />
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-bold block text-zinc-800 dark:text-zinc-200">
                {lang === 'ar' ? 'تخصيص كامل' : 'Fully Customizable'}
              </span>
              {lang === 'ar' ? 'يتم احتساب وإظهار البيانات المالية والكمية تلقائياً حسب الفلترة.' : 'Sums and averages are auto-calculated dynamically as you filter the records.'}
            </div>
          </div>
        )}
      </div>

      {/* Main Interactive Controls Panel (Search, Filter, Column Customization) */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        
        {/* Search & Main actions */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'ar' ? 'البحث عن أي قيمة في جدول المنتج التام...' : 'Search for any value in finished product list...'}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowColumnToggles(!showColumnToggles)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition ${
                showColumnToggles 
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800' 
                  : 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تخصيص الأعمدة الظاهرة' : 'Show/Hide Columns'}</span>
            </button>

            <button
              onClick={() => setShowCharts(!showCharts)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition ${
                showCharts 
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800' 
                  : 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{lang === 'ar' ? 'عرض الرسوم البيانية' : 'Show Chart Reports'}</span>
            </button>

            {(searchTerm || Object.values(selectedFilters).some(v => v !== '')) && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2.5 text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-500/10 rounded-xl transition"
              >
                {lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
              </button>
            )}
          </div>
        </div>

        {/* Expandable Column Toggles Panel */}
        {showColumnToggles && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 animate-fadeIn">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {lang === 'ar' ? 'حدد الأعمدة لعرضها في الجدول الرئيسي:' : 'Select columns to display in the main table:'}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={handleSelectAllColumns} 
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  {lang === 'ar' ? 'تحديد الكل' : 'Select All'}
                </button>
                <span className="text-zinc-300">|</span>
                <button 
                  onClick={handleClearAllColumns} 
                  className="text-[11px] text-zinc-400 dark:text-zinc-500 hover:underline font-medium"
                >
                  {lang === 'ar' ? 'إلغاء الكل' : 'Clear All'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {columns.map(col => (
                <label 
                  key={col} 
                  className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-emerald-500 select-none"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(col)}
                    onChange={() => handleToggleColumn(col)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700"
                  />
                  <span className="truncate" title={col}>{col}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Category Dropdown Filters */}
        {filterableColumns.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تصفية سريعة حسب الخيارات:' : 'Quick category filters:'}</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {filterableColumns.slice(0, 4).map(col => (
                <div key={col} className="space-y-1">
                  <label className="text-[11px] text-zinc-400 truncate block">{col}</label>
                  <select
                    value={selectedFilters[col] || ''}
                    onChange={(e) => {
                      setSelectedFilters(prev => ({
                        ...prev,
                        [col]: e.target.value
                      }));
                    }}
                    className="w-full text-xs p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="">{lang === 'ar' ? `الكل` : `All`}</option>
                    {filterOptions[col]?.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reports & Analytics Chart Section */}
      {showCharts && chartXAxis && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {lang === 'ar' ? 'التقارير التحليلية والرسوم البيانية للمنتجات التامة' : 'Analytical Reports & finished products chart'}
              </h3>
            </div>

            {/* Chart Configuration selectors */}
            <div className="flex flex-wrap items-center gap-3">
              {/* X-Axis Select */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-400 font-medium">{lang === 'ar' ? 'المحور الأفقي:' : 'X-Axis:'}</span>
                <select
                  value={chartXAxis}
                  onChange={(e) => setChartXAxis(e.target.value)}
                  className="text-xs p-1.5 bg-zinc-100 dark:bg-zinc-850 rounded-lg text-zinc-800 dark:text-zinc-200 border-none focus:ring-2 focus:ring-emerald-500"
                >
                  {columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Y-Axis Select */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-400 font-medium">{lang === 'ar' ? 'المقياس:' : 'Measure:'}</span>
                <select
                  value={chartYAxis}
                  onChange={(e) => setChartYAxis(e.target.value)}
                  className="text-xs p-1.5 bg-zinc-100 dark:bg-zinc-850 rounded-lg text-zinc-800 dark:text-zinc-200 border-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="count">{lang === 'ar' ? 'عدد السجلات' : 'Record count'}</option>
                  {numericColumns.map(col => (
                    <option key={col} value={col}>{lang === 'ar' ? `مجموع ${col}` : `Sum of ${col}`}</option>
                  ))}
                </select>
              </div>

              {/* Chart type select */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setChartType('bar')}
                  className={`p-1.5 rounded-lg text-xs font-semibold ${chartType === 'bar' ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'}`}
                >
                  {lang === 'ar' ? 'أعمدة' : 'Bar'}
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`p-1.5 rounded-lg text-xs font-semibold ${chartType === 'line' ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'}`}
                >
                  {lang === 'ar' ? 'خطي' : 'Line'}
                </button>
                <button
                  onClick={() => setChartType('area')}
                  className={`p-1.5 rounded-lg text-xs font-semibold ${chartType === 'area' ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'}`}
                >
                  {lang === 'ar' ? 'مساحي' : 'Area'}
                </button>
              </div>
            </div>
          </div>

          {/* Actual Chart render */}
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey={lang === 'ar' ? 'القيمة' : 'Value'} fill="#10b981" radius={[4, 4, 0, 0]} name={chartYAxis === 'count' ? (lang === 'ar' ? 'العدد' : 'Count') : chartYAxis} />
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey={lang === 'ar' ? 'القيمة' : 'Value'} stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name={chartYAxis === 'count' ? (lang === 'ar' ? 'العدد' : 'Count') : chartYAxis} />
                </LineChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey={lang === 'ar' ? 'القيمة' : 'Value'} stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" name={chartYAxis === 'count' ? (lang === 'ar' ? 'العدد' : 'Count') : chartYAxis} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        
        {/* Table header meta info */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {lang === 'ar' 
              ? `عرض ${paginatedData.length} من أصل ${sortedData.length} سجل` 
              : `Showing ${paginatedData.length} of ${sortedData.length} records`}
          </span>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">{lang === 'ar' ? 'العناصر لكل صفحة:' : 'Rows per page:'}</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="text-xs p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* The responsive data table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right">
            <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                {/* Index Column */}
                <th className="px-4 py-4 font-semibold text-center w-12 border-r border-zinc-200 dark:border-zinc-800">#</th>
                
                {/* Visible Data Columns Headers */}
                {visibleColumns.map((col) => {
                  const isSorted = sortColumn === col;
                  return (
                    <th 
                      key={col} 
                      onClick={() => handleSort(col)}
                      className="px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-850 transition select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>{col}</span>
                        {isSorted ? (
                          sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-500" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <span className="opacity-0 group-hover:opacity-100"><ChevronDown className="w-3.5 h-3.5 text-zinc-400" /></span>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Actions Column */}
                <th className="px-6 py-4 font-semibold text-center w-24">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, idx) => {
                  const itemIndex = (currentPage - 1) * rowsPerPage + idx + 1;
                  return (
                    <tr 
                      key={idx} 
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-850/55 transition group"
                    >
                      {/* Row number */}
                      <td className="px-4 py-3.5 text-center font-mono text-zinc-400 text-xs border-r border-zinc-200 dark:border-zinc-800">
                        {itemIndex}
                      </td>

                      {/* Cell values */}
                      {visibleColumns.map((col) => {
                        const val = String(row[col] || '');
                        return (
                          <td 
                            key={col} 
                            className="px-6 py-3.5 text-zinc-800 dark:text-zinc-200 font-medium max-w-xs truncate"
                            title={val}
                          >
                            {val}
                          </td>
                        );
                      })}

                      {/* View Details action */}
                      <td className="px-6 py-3.5 text-center">
                        <button
                          onClick={() => setSelectedRow({ ...row, _index: itemIndex })}
                          className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
                          title={lang === 'ar' ? 'عرض كامل التفاصيل' : 'View full details'}
                        >
                          <Eye className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="w-8 h-8 opacity-40 text-zinc-400" />
                      <p className="font-semibold text-sm">
                        {lang === 'ar' ? 'لم يتم العثور على أي نتائج مطابقة.' : 'No matching results found.'}
                      </p>
                      <button 
                        onClick={handleResetFilters}
                        className="text-xs text-emerald-500 hover:underline mt-1 font-medium"
                      >
                        {lang === 'ar' ? 'إعادة تعيين مرشحات البحث' : 'Clear your search/filters'}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {lang === 'ar' 
                ? `صفحة ${currentPage} من أصل ${totalPages}` 
                : `Page ${currentPage} of ${totalPages}`}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-40 transition"
              >
                <ChevronRight className={`w-5 h-5 ${lang === 'ar' ? '' : 'rotate-180'}`} />
              </button>

              {/* Individual page buttons */}
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    currentPage === pageNumber 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-40 transition"
              >
                <ChevronLeft className={`w-5 h-5 ${lang === 'ar' ? '' : 'rotate-180'}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Row Detailed view Drawer/Modal popup */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-2xl w-full border border-zinc-200 dark:border-zinc-800 max-h-[85vh] flex flex-col animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {lang === 'ar' ? `تفاصيل سجل المنتج التام #${selectedRow._index}` : `Finished Product Detail #${selectedRow._index}`}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedRow(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable Grid */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {columns.map(col => {
                  const val = selectedRow[col];
                  const isEmpty = val === undefined || val === null || String(val).trim() === '';
                  return (
                    <div 
                      key={col} 
                      className={`p-3.5 rounded-xl border transition ${
                        isEmpty 
                          ? 'bg-zinc-50/50 dark:bg-zinc-850/30 border-zinc-100 dark:border-zinc-850' 
                          : 'bg-zinc-50 dark:bg-zinc-850/80 border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        {col}
                      </span>
                      <span className={`text-sm font-semibold ${isEmpty ? 'text-zinc-400 italic font-normal' : 'text-zinc-800 dark:text-zinc-100'}`}>
                        {isEmpty ? (lang === 'ar' ? 'فارغ' : 'Empty') : String(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedRow(null)}
                className="px-5 py-2 text-sm font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white rounded-xl transition shadow-sm"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

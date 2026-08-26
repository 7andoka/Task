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
  RotateCcw
} from 'lucide-react';
import { Language, UserProfile } from '../types';
import { PrintTicketModal } from './PrintTicketModal';

interface ScaleReportsProps {
  lang: Language;
  user?: UserProfile;
}

export default function ScaleReports({ lang, user }: ScaleReportsProps) {
  const isRtl = lang === 'ar';
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Advanced Search States
  const [searchOperationNo, setSearchOperationNo] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [searchTime, setSearchTime] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchVehicle, setSearchVehicle] = useState('');
  const [searchDriver, setSearchDriver] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(true);

  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [globalSearch, setGlobalSearch] = useState('');

  // Fetch CSV data from Google Sheet
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
            setData(cleanData);
            setLoading(false);
          },
          error: (err) => {
            setError(isRtl ? 'حدث خطأ أثناء جلب بيانات الميزان' : 'Error fetching scale data');
            setLoading(false);
          }
        });
      } catch (err) {
        setError(isRtl ? 'فشل الاتصال بالميزان' : 'Failed to connect to scale');
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshKey, isRtl]);

  // Helper to find specific column value in a row dynamically
  const getRowFieldValue = (row: any, candidates: string[]) => {
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

  // Filter data based on advanced search criteria and global search
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

      const opNo = getRowFieldValue(row, ['رقم التذكرة', 'تذكرة', 'ticket', 'id', 'no', 'operation']);
      const dateVal = getRowFieldValue(row, ['تاريخ', 'date']);
      const timeVal = getRowFieldValue(row, ['وقت', 'time']);
      const supplierVal = getRowFieldValue(row, ['المورد', 'supplier']);
      const customerVal = getRowFieldValue(row, ['العميل', 'customer']);
      const vehicleVal = getRowFieldValue(row, ['رقم السيارة', 'السيارة', 'vehicle', 'car', 'plate']);
      const driverVal = getRowFieldValue(row, ['السائق', 'driver']);

      if (searchOperationNo && !opNo.toLowerCase().includes(searchOperationNo.toLowerCase())) return false;
      if (searchTime && !timeVal.toLowerCase().includes(searchTime.toLowerCase())) return false;
      if (searchSupplier && !supplierVal.toLowerCase().includes(searchSupplier.toLowerCase())) return false;
      if (searchCustomer && !customerVal.toLowerCase().includes(searchCustomer.toLowerCase())) return false;
      if (searchVehicle && !vehicleVal.toLowerCase().includes(searchVehicle.toLowerCase())) return false;
      if (searchDriver && !driverVal.toLowerCase().includes(searchDriver.toLowerCase())) return false;

      if (searchDateFrom && dateVal && dateVal < searchDateFrom) return false;
      if (searchDateTo && dateVal && dateVal > searchDateTo) return false;

      return true;
    });
  }, [data, globalSearch, searchOperationNo, searchDateFrom, searchDateTo, searchTime, searchSupplier, searchCustomer, searchVehicle, searchDriver]);

  // Reset filters
  const resetFilters = () => {
    setGlobalSearch('');
    setSearchOperationNo('');
    setSearchDateFrom('');
    setSearchDateTo('');
    setSearchTime('');
    setSearchSupplier('');
    setSearchCustomer('');
    setSearchVehicle('');
    setSearchDriver('');
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

  // Map a row to operation details for printing
  const mapRowToOperation = (row: any) => {
    return {
      operationNo: getRowFieldValue(row, ['رقم التذكرة', 'تذكرة', 'ticket', 'id', 'no', 'operation']) || 'REC-' + Math.floor(100000 + Math.random() * 900000),
      vehicleNo: getRowFieldValue(row, ['رقم السيارة', 'السيارة', 'vehicle', 'car', 'plate']) || '---',
      driver: getRowFieldValue(row, ['السائق', 'driver']) || '---',
      supplier: getRowFieldValue(row, ['المورد', 'supplier']) || '---',
      customer: getRowFieldValue(row, ['العميل', 'customer']) || '---',
      item: getRowFieldValue(row, ['الصنف', 'item', 'material']) || '---',
      poNumber: getRowFieldValue(row, ['أمر', 'po', 'so', 'permit']) || '---',
      direction: getRowFieldValue(row, ['اتجاه', 'direction', 'حركة']) || 'وارد',
      quantity: Number(getRowFieldValue(row, ['كمية', 'quantity', 'count'])) || 1,
      grossWeight: Number(getRowFieldValue(row, ['قائم', 'gross', 'أول', 'first'])) || 0,
      tareWeight: Number(getRowFieldValue(row, ['فارغ', 'tare', 'ثاني', 'second'])) || 0,
      netWeight: Number(getRowFieldValue(row, ['صافي', 'net'])) || 0,
      date: getRowFieldValue(row, ['تاريخ', 'date']) || new Date().toISOString().split('T')[0],
      time: getRowFieldValue(row, ['وقت', 'time']) || new Date().toLocaleTimeString(),
      remarks: getRowFieldValue(row, ['ملاحظات', 'remarks', 'notes']) || '',
      userName: user?.displayName || 'مسؤول الميزان'
    };
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
                {data.length} {isRtl ? 'سجل متصل' : 'Records'}
              </span>
            </h1>
            <p className="text-emerald-100 text-[11px] font-medium hidden sm:block">
              {isRtl 
                ? 'متابعة أوزان وحركات الشاحنات المباشرة وطباعة تذاكر الميزان' 
                : 'Live weighbridge truck weight tracking & ticket printing'}
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
            <span>{isRtl ? (showAdvancedSearch ? 'إخفاء الفلاتر' : 'فلاتر متقدمة') : (showAdvancedSearch ? 'Hide Filters' : 'Filters')}</span>
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

      {/* Compact Search & Filter Panel */}
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
                placeholder={isRtl ? 'بحث سريع في كافة الحقول والأعمدة (سيارة، سائق، عميل، صنف، رقم)...' : 'Quick search across all fields...'}
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
            <div className="bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              {isRtl ? 'المطابق:' : 'Results:'} <span className="font-black font-mono">{filteredData.length}</span> / {data.length}
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

            {(searchOperationNo || searchDateFrom || searchDateTo || searchTime || searchSupplier || searchCustomer || searchVehicle || searchDriver || globalSearch) && (
              <button
                onClick={resetFilters}
                className="px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw size={11} />
                <span>{isRtl ? 'تصفير' : 'Reset'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Detailed Filters */}
        {showAdvancedSearch && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-[11px] font-bold">
              {/* رقم العملية */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block">{isRtl ? 'رقم التذكرة' : 'Ticket'}</label>
                <input
                  type="text"
                  value={searchOperationNo}
                  onChange={(e) => setSearchOperationNo(e.target.value)}
                  placeholder={isRtl ? 'تذكرة...' : 'Ticket...'}
                  className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* التاريخ من */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block">{isRtl ? 'من تاريخ' : 'Date From'}</label>
                <input
                  type="date"
                  value={searchDateFrom}
                  onChange={(e) => setSearchDateFrom(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* التاريخ إلى */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block">{isRtl ? 'إلى تاريخ' : 'Date To'}</label>
                <input
                  type="date"
                  value={searchDateTo}
                  onChange={(e) => setSearchDateTo(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* الوقت */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block">{isRtl ? 'الوقت' : 'Time'}</label>
                <input
                  type="text"
                  value={searchTime}
                  onChange={(e) => setSearchTime(e.target.value)}
                  placeholder="12:00"
                  className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* المورد */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block">{isRtl ? 'المورد' : 'Supplier'}</label>
                <input
                  type="text"
                  value={searchSupplier}
                  onChange={(e) => setSearchSupplier(e.target.value)}
                  placeholder={isRtl ? 'المورد...' : 'Supplier...'}
                  className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* العميل */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block">{isRtl ? 'العميل' : 'Customer'}</label>
                <input
                  type="text"
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  placeholder={isRtl ? 'العميل...' : 'Customer...'}
                  className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* رقم السيارة */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block">{isRtl ? 'السيارة' : 'Vehicle'}</label>
                <input
                  type="text"
                  value={searchVehicle}
                  onChange={(e) => setSearchVehicle(e.target.value)}
                  placeholder={isRtl ? 'السيارة...' : 'Vehicle...'}
                  className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* اسم السائق */}
              <div className="space-y-0.5">
                <label className="text-slate-500 text-[10px] block">{isRtl ? 'السائق' : 'Driver'}</label>
                <input
                  type="text"
                  value={searchDriver}
                  onChange={(e) => setSearchDriver(e.target.value)}
                  placeholder={isRtl ? 'السائق...' : 'Driver...'}
                  className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
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
            <p className="text-xs font-bold text-slate-500">{isRtl ? 'جاري الاتصال بالميزان وجلب كافة البيانات...' : 'Connecting to scale & fetching all data...'}</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-500 font-bold text-xs">
            {error}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-bold text-xs">
            {isRtl ? 'لا توجد بيانات مطابقة لخيارات البحث' : 'No matching records found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px] sm:text-xs">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black">
                  <th className="py-2 px-2.5 text-center w-10 sticky right-0 bg-slate-100 dark:bg-slate-800 z-10 border-l border-slate-200 dark:border-slate-700">#</th>
                  {columns.map((col, idx) => (
                    <th key={idx} className="py-2 px-2.5 whitespace-nowrap border-l border-slate-200 dark:border-slate-700">{col}</th>
                  ))}
                  <th className="py-2 px-2.5 text-center sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700 shadow-sm">{isRtl ? 'طباعة التذكرة' : 'Print Ticket'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {paginatedData.map((row, index) => {
                  const globalIndex = (currentPage - 1) * rowsPerPage + index + 1;
                  const operationObj = mapRowToOperation(row);
                  return (
                    <tr 
                      key={index} 
                      className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-800/30 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition-colors group"
                    >
                      <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-400 sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-emerald-50/70 dark:group-hover:bg-emerald-950/40 z-10 border-l border-slate-100 dark:border-slate-800 text-[11px]">{globalIndex}</td>
                      {columns.map((col, cIdx) => (
                        <td key={cIdx} className="py-1.5 px-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-l border-slate-100/70 dark:border-slate-800/60 font-medium">
                          {String(row[col] !== undefined && row[col] !== null ? row[col] : '')}
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-center sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-emerald-50/70 dark:group-hover:bg-emerald-950/40 z-10 border-r border-slate-100 dark:border-slate-800 shadow-xs">
                        <button
                          onClick={() => setSelectedRow(operationObj)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-600 rounded-lg font-bold transition-all flex items-center justify-center gap-1 mx-auto shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap text-[11px]"
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

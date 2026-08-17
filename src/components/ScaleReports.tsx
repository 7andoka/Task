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
  const [rowsPerPage, setRowsPerPage] = useState(15);

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

  // Extract columns
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(key => key.trim() !== '');
  }, [data]);

  // Filter data based on advanced search criteria
  const filteredData = useMemo(() => {
    return data.filter(row => {
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
  }, [data, searchOperationNo, searchDateFrom, searchDateTo, searchTime, searchSupplier, searchCustomer, searchVehicle, searchDriver]);

  // Reset filters
  const resetFilters = () => {
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
    <div className="space-y-6 pb-12 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 rounded-3xl p-5 md:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/30">
            <Scale size={28} className="text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
              {isRtl ? 'تقارير الميزان البسكول' : 'Weighbridge Scale Reports'}
            </h1>
            <p className="text-emerald-100 text-xs mt-0.5 font-medium">
              {isRtl 
                ? 'متابعة أوزان وحركات الشاحنات المباشرة والطباعة الرسمية للتذاكر' 
                : 'Live weighbridge truck weight tracking and official ticket printing'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            disabled={loading}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center gap-2 backdrop-blur-md border border-white/25 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{isRtl ? 'تحديث البيانات' : 'Refresh'}</span>
          </button>
          <button
            onClick={exportToExcel}
            className="px-4 py-2.5 bg-[#F59E0B] hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <FileSpreadsheet size={14} />
            <span>{isRtl ? 'تصدير إكسل' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* Advanced Search Panel */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-emerald-600" />
            <h3 className="font-black text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              {isRtl ? 'لوحة البحث المتقدم في تقارير الميزان' : 'Advanced Scale Search Panel'}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>{isRtl ? 'إعادة ضبط' : 'Reset'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-bold">
          {/* رقم العملية */}
          <div className="space-y-1">
            <label className="text-slate-600 dark:text-slate-400 block">{isRtl ? 'رقم العملية / التذكرة' : 'Operation No'}</label>
            <div className="relative">
              <Hash size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchOperationNo}
                onChange={(e) => setSearchOperationNo(e.target.value)}
                placeholder={isRtl ? 'بحث برقم التذكرة...' : 'Search ticket...'}
                className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* التاريخ من */}
          <div className="space-y-1">
            <label className="text-slate-600 dark:text-slate-400 block">{isRtl ? 'التاريخ من' : 'Date From'}</label>
            <div className="relative">
              <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={searchDateFrom}
                onChange={(e) => setSearchDateFrom(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* التاريخ إلى */}
          <div className="space-y-1">
            <label className="text-slate-600 dark:text-slate-400 block">{isRtl ? 'التاريخ إلى' : 'Date To'}</label>
            <div className="relative">
              <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={searchDateTo}
                onChange={(e) => setSearchDateTo(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* الوقت */}
          <div className="space-y-1">
            <label className="text-slate-600 dark:text-slate-400 block">{isRtl ? 'الوقت' : 'Time'}</label>
            <input
              type="text"
              value={searchTime}
              onChange={(e) => setSearchTime(e.target.value)}
              placeholder={isRtl ? 'مثال: 12:30' : 'e.g. 12:30'}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* المورد */}
          <div className="space-y-1">
            <label className="text-slate-600 dark:text-slate-400 block">{isRtl ? 'المورد' : 'Supplier'}</label>
            <input
              type="text"
              value={searchSupplier}
              onChange={(e) => setSearchSupplier(e.target.value)}
              placeholder={isRtl ? 'اسم المورد...' : 'Supplier name...'}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* العميل */}
          <div className="space-y-1">
            <label className="text-slate-600 dark:text-slate-400 block">{isRtl ? 'العميل' : 'Customer'}</label>
            <input
              type="text"
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              placeholder={isRtl ? 'اسم العميل...' : 'Customer name...'}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* رقم السيارة */}
          <div className="space-y-1">
            <label className="text-slate-600 dark:text-slate-400 block">{isRtl ? 'رقم السيارة' : 'Vehicle No'}</label>
            <div className="relative">
              <Truck size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchVehicle}
                onChange={(e) => setSearchVehicle(e.target.value)}
                placeholder={isRtl ? 'رقم السيارة...' : 'Vehicle no...'}
                className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* اسم السائق */}
          <div className="space-y-1">
            <label className="text-slate-600 dark:text-slate-400 block">{isRtl ? 'اسم السائق' : 'Driver Name'}</label>
            <div className="relative">
              <User size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchDriver}
                onChange={(e) => setSearchDriver(e.target.value)}
                placeholder={isRtl ? 'اسم السائق...' : 'Driver name...'}
                className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
            {isRtl ? 'عدد النتائج المطابقة:' : 'Matching Results:'} <span className="font-black font-mono">{filteredData.length}</span> / {data.length}
          </div>
        </div>
      </div>

      {/* Main Table / Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500">{isRtl ? 'جاري الاتصال بالميزان...' : 'Connecting to scale...'}</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500 font-bold text-sm">
            {error}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-bold text-sm">
            {isRtl ? 'لا توجد بيانات مطابقة لخيارات البحث' : 'No matching records found for search filters'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black">
                  <th className="p-3 text-center w-12">#</th>
                  {columns.slice(0, 8).map((col, idx) => (
                    <th key={idx} className="p-3 whitespace-nowrap">{col}</th>
                  ))}
                  <th className="p-3 text-center">{isRtl ? 'طباعة التذكرة' : 'Print Ticket'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {paginatedData.map((row, index) => {
                  const globalIndex = (currentPage - 1) * rowsPerPage + index + 1;
                  const operationObj = mapRowToOperation(row);
                  return (
                    <tr 
                      key={index} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <td className="p-3 text-center font-mono text-slate-400">{globalIndex}</td>
                      {columns.slice(0, 8).map((col, cIdx) => (
                        <td key={cIdx} className="p-3 text-slate-800 dark:text-slate-200 truncate max-w-xs">
                          {String(row[col] || '')}
                        </td>
                      ))}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedRow(operationObj)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-600 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 mx-auto shadow-2xs cursor-pointer active:scale-95"
                        >
                          <Printer size={14} />
                          <span>{isRtl ? 'طباعة التذكرة' : 'Print'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filteredData.length > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500">
              {isRtl 
                ? `عرض ${(currentPage - 1) * rowsPerPage + 1} إلى ${Math.min(currentPage * rowsPerPage, filteredData.length)} من ${filteredData.length} سجل`
                : `Showing ${(currentPage - 1) * rowsPerPage + 1} to ${Math.min(currentPage * rowsPerPage, filteredData.length)} of ${filteredData.length} records`}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
              <span className="text-xs font-bold font-mono px-3">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={16} />
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

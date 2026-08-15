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
  Building2, 
  CheckCircle2, 
  Scissors, 
  RefreshCw, 
  FileSpreadsheet,
  Calendar,
  Truck,
  Hash,
  User,
  RotateCcw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Language, UserProfile } from '../types';

interface ScaleReportsProps {
  lang: Language;
  user?: UserProfile;
}

// 1D Barcode SVG Generator for Ticket Number
const render1DBarcodeSVG = (text: string) => {
  const bars: { width: number; isGap: boolean }[] = [];
  bars.push({ width: 3, isGap: false }, { width: 1, isGap: true }, { width: 2, isGap: false }, { width: 1, isGap: true });
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const w1 = (code % 3) + 1;
    const g1 = ((code >> 1) % 2) + 1;
    const w2 = ((code >> 2) % 3) + 1;
    const g2 = ((code >> 3) % 2) + 1;
    bars.push({ width: w1, isGap: false });
    bars.push({ width: g1, isGap: true });
    bars.push({ width: w2, isGap: false });
    bars.push({ width: g2, isGap: true });
  }
  bars.push({ width: 2, isGap: false }, { width: 1, isGap: true }, { width: 3, isGap: false });

  let currentX = 0;
  const elements = bars.map((bar, idx) => {
    const x = currentX;
    const unitWidth = bar.width * 1.3;
    currentX += unitWidth;
    if (bar.isGap) return null;
    return <rect key={idx} x={x} y="0" width={unitWidth} height="22" fill="#000000" />;
  });

  return (
    <svg viewBox={`0 0 ${currentX} 22`} className="w-28 h-5 object-contain">
      {elements}
    </svg>
  );
};

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

// Print Ticket Modal Component (Official A4 Layout with 3 Copies and Watermark)
interface PrintTicketModalProps {
  operation: any;
  settings: any;
  onClose: () => void;
}

const PrintTicketModal: React.FC<PrintTicketModalProps> = ({
  operation,
  settings,
  onClose
}) => {
  const defaultLogoFallback = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%230F766E'/><path d='M30 65 L50 35 L70 65 Z' fill='%23F59E0B'/><circle cx='50' cy='50' r='12' fill='%23FFFFFF'/></svg>";

  if (!operation) return null;

  const handlePrint = () => {
    window.print();
  };

  const qrData = JSON.stringify({
    co: settings.companyName,
    op: operation.operationNo,
    veh: operation.vehicleNo,
    item: operation.item,
    gross: operation.grossWeight,
    tare: operation.tareWeight,
    net: operation.netWeight,
    date: operation.date,
    time: operation.time
  });

  const renderSingleTicket = (copyLabel: string) => (
    <div className="ticket-page-third flex flex-col justify-between bg-white text-slate-900 font-sans p-2.5 border border-slate-300 rounded-lg relative box-border overflow-hidden" style={{ height: '88mm', minHeight: '88mm', maxHeight: '88mm' }}>
      
      {/* Watermark: نسخة للمعاينة فقط ولا تعد مستند */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 select-none">
        <div className="transform -rotate-25 text-red-500/18 text-base md:text-xl font-black tracking-widest text-center px-4 py-2 border-4 border-red-500/15 rounded-2xl uppercase">
          نسخة للمعاينة فقط ولا تعد مستند
        </div>
      </div>

      {/* Header Banner */}
      <div className="border-b-2 border-[#0F766E] pb-1.5 mb-1.5 flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <img 
            src="/rich.jpg" 
            alt="Rich Land Logo" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultLogoFallback;
            }}
            className="w-10 h-10 object-contain rounded border border-slate-200 shrink-0" 
          />
          <div>
            <h1 className="text-[12.5px] font-black text-[#0F766E] tracking-wide leading-tight uppercase">
              {settings.companyName}
            </h1>
            <p className="text-[9px] text-slate-600 flex items-center gap-1 font-bold mt-0.5">
              <Building2 className="w-2.5 h-2.5 text-[#0F766E]" /> 
              {settings.companyAddress}
            </p>
          </div>
        </div>

        <div className="text-center px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
          <span className="text-[8px] font-black text-slate-500 block leading-none mb-0.5">تاريخ ووقت التذكرة</span>
          <span className="text-[10px] font-black font-mono text-slate-900">{operation.date} | {operation.time}</span>
        </div>

        <div className="text-left border-r border-slate-200 pr-2 flex flex-col items-end">
          <div className="flex items-center gap-1 justify-end">
            <span className="text-[8.5px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold border border-slate-200">
              {copyLabel}
            </span>
            <div className="bg-transparent text-[#0F766E] border border-[#0F766E] font-black px-1.5 py-0.5 rounded text-[9.5px]">
              تذكرة ميزان
            </div>
          </div>
          <p className="text-[9.5px] font-mono font-bold text-slate-800 mt-0.5 text-left">
            رقم التذكرة: <span className="text-[#0F766E] font-black text-[11px]">{operation.operationNo}</span>
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-4 gap-x-2 gap-y-1 text-[10px] mb-1 bg-teal-50/40 p-2 rounded-lg border border-teal-100 relative z-10">
        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">رقم السيارة:</span>
          <strong className="text-[#0F766E] font-black text-[11.5px] bg-[#F59E0B]/20 px-1 py-0.2 rounded border border-[#F59E0B]/40 inline-block">
            {operation.vehicleNo}
          </strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">اسم السائق:</span>
          <strong className="text-slate-950 font-black truncate block text-[10.5px]">{operation.driver || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">المورد:</span>
          <strong className="text-slate-950 font-black truncate block text-[10.5px]">{operation.supplier || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">العميل:</span>
          <strong className="text-slate-950 font-black truncate block text-[10.5px]">{operation.customer || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">الصنف:</span>
          <strong className="text-slate-950 font-black truncate block text-[10.5px]">{operation.item || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">أمر الشراء / المبيعات:</span>
          <strong className="text-slate-950 font-black font-mono text-[10.5px]">{operation.poNumber || '-'}</strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">نوع الحركة:</span>
          <strong className="px-1.5 py-0.2 rounded text-[9.5px] font-black inline-block bg-emerald-100 text-emerald-900 border border-emerald-300">
            {operation.direction || 'وارد'}
          </strong>
        </div>

        <div>
          <span className="text-slate-600 font-black block text-[8.5px]">العدد:</span>
          <strong className="text-slate-900 font-black text-[10.5px]">{operation.quantity || 1}</strong>
        </div>
      </div>

      {/* Weights Box */}
      <div className="bg-slate-50 border-2 border-[#0F766E] rounded-lg p-1.5 mb-1 relative z-10">
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-white border border-slate-200 rounded p-1 flex flex-col justify-between">
            <div>
              <span className="text-[8.5px] font-black text-slate-600 block mb-0.2">الوزنة الأولى</span>
              <span className="font-mono font-black text-[15px] text-slate-900">
                {(operation.grossWeight || 0).toLocaleString('en-US')} <span className="text-[9.5px] font-sans text-slate-500">{settings.unit}</span>
              </span>
            </div>
            <div className="text-[8px] font-mono font-bold text-slate-500 border-t border-slate-100 mt-0.5 pt-0.5">
              {operation.date} | {operation.time}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-1 flex flex-col justify-between">
            <div>
              <span className="text-[8.5px] font-black text-slate-600 block mb-0.2">الوزنة الثانية</span>
              <span className="font-mono font-black text-[15px] text-slate-900">
                {(operation.tareWeight || 0).toLocaleString('en-US')} <span className="text-[9.5px] font-sans text-slate-500">{settings.unit}</span>
              </span>
            </div>
            <div className="text-[8px] font-mono font-bold text-slate-500 border-t border-slate-100 mt-0.5 pt-0.5">
              {operation.date} | {operation.time}
            </div>
          </div>

          <div className="net-weight-box bg-transparent text-slate-900 rounded p-1 flex flex-col justify-between border-2 border-[#0F766E]">
            <div>
              <span className="net-weight-title text-[8.5px] font-black text-[#0F766E] block mb-0.2">الوزن الصافي</span>
              <span className="net-weight-val font-mono font-black text-[20px] text-slate-950 leading-tight">
                {(operation.netWeight || 0).toLocaleString('en-US')} <span className="text-[10px] font-sans text-slate-600">{settings.unit}</span>
              </span>
            </div>
            <div className="net-weight-sub text-[9.5px] font-black text-[#0F766E] border-t border-teal-200 mt-0.5 pt-0.5">
              {((operation.netWeight || 0) / 1000).toFixed(3)} طن
            </div>
          </div>
        </div>
      </div>

      {/* Certification Text */}
      <div className="text-center py-0.5 relative z-10">
        <p className="text-[10px] font-black text-[#0F766E] flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          تمت عملية الوزن آليا بواسطة ميزان إلكتروني موثق رقم T15310056
        </p>
      </div>

      {/* Remarks */}
      <div className="text-[9px] px-2 py-0.5 bg-slate-100/90 rounded border border-slate-300 mb-1 text-slate-900 flex items-start gap-1.5 font-bold relative z-10">
        <span className="font-black text-[#0F766E] shrink-0">الملاحظات:</span>
        <span className="break-words font-medium text-slate-800 leading-tight">
          {operation.remarks && operation.remarks.trim() !== '' ? operation.remarks : 'لا توجد ملاحظات'}
        </span>
      </div>

      {/* Footer: Barcode, QR Code & Signatures */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-300 gap-2 relative z-10">
        <div className="flex items-center gap-2 shrink-0 bg-slate-50 p-1 rounded-md border border-slate-200">
          <div className="p-0.5 bg-white border border-slate-300 rounded shadow-2xs shrink-0">
            <QRCodeSVG value={qrData} size={34} />
          </div>
          <div className="flex flex-col items-center justify-center px-1">
            {render1DBarcodeSVG(operation.operationNo)}
            <span className="text-[8px] font-mono font-black text-slate-800 tracking-wider leading-tight mt-0.5">
              *{operation.operationNo}*
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-[7.5px] text-center flex-1 max-w-sm">
          <div>
            <p className="font-bold text-slate-700 leading-tight mb-1.5">توقيع مسؤول الميزان<br/><span className="text-[6px] text-slate-400 font-mono">({operation.userName})</span></p>
            <div className="border-b border-dashed border-slate-400 w-8 mx-auto"></div>
          </div>
          <div>
            <p className="font-bold text-slate-700 leading-tight mb-1.5">سائق السيارة<br/><span className="text-[6px] text-slate-400">Driver</span></p>
            <div className="border-b border-dashed border-slate-400 w-8 mx-auto"></div>
          </div>
          <div>
            <p className="font-bold text-slate-700 leading-tight mb-1.5">أمين المخزن<br/><span className="text-[6px] text-slate-400">Warehouse</span></p>
            <div className="border-b border-dashed border-slate-400 w-8 mx-auto"></div>
          </div>
          <div>
            <p className="font-bold text-slate-700 leading-tight mb-1.5">الاعتماد والختم<br/><span className="text-[6px] text-slate-400">Authorized</span></p>
            <div className="border-b border-dashed border-slate-400 w-8 mx-auto"></div>
          </div>
        </div>
      </div>

    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 overflow-y-auto print:p-0 print:bg-white print:block">
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .net-weight-box { background-color: #0d4d46 !important; color: #ffffff !important; border: 2px solid #000000 !important; }
          .net-weight-title { color: #ffb703 !important; font-weight: 900 !important; }
          .net-weight-val { color: #ffffff !important; font-weight: 900 !important; }
          .net-weight-sub { color: #fde047 !important; font-weight: 900 !important; }
          body * { visibility: hidden !important; }
          .no-print, .no-print * { display: none !important; visibility: hidden !important; }
          #printable-a4-page, #printable-a4-page * { visibility: visible !important; }
          #printable-a4-page {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 210mm !important; height: 297mm !important; margin: 0 !important;
            padding: 10mm !important; display: flex !important; flex-direction: column !important;
            justify-content: space-between !important; box-sizing: border-box !important; background: white !important;
          }
          @page { size: A4 portrait; margin: 0 !important; }
        }
        .preview-viewport {
          max-height: 80vh; overflow-y: auto; width: 100%; background: #020617;
          border-radius: 1.5rem; padding: 2rem; display: flex; justify-content: center;
        }
        .preview-a4-container {
          background: white; width: 210mm; min-width: 210mm; height: 297mm;
          padding: 10mm; display: flex; flex-direction: column; justify-content: space-between;
          transform-origin: top center; box-shadow: 0 40px 100px -20px rgba(0,0,0,0.7);
        }
        @media (max-width: 1600px) { .preview-a4-container { transform: scale(0.85); } }
        @media (max-width: 1400px) { .preview-a4-container { transform: scale(0.7); } }
        @media (max-width: 1024px) { .preview-a4-container { transform: scale(0.5); } }
        @media (max-width: 768px) { .preview-a4-container { transform: scale(0.35); } }
      `}</style>

      <div className="w-full max-w-5xl my-auto">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          
          <div className="bg-[#0F766E] text-white px-6 py-4 flex items-center justify-between border-b border-[#F59E0B]/30 no-print">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F59E0B] text-slate-950 rounded-xl flex items-center justify-center">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm">معاينة تذكرة الميزان الرسمية</h3>
                <p className="text-[10px] text-teal-100/80">صفحة A4 كاملة - 3 نسخ متطابقة في الورقة الواحدة</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-6 py-2.5 bg-[#F59E0B] hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الآن (Print)</span>
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="preview-viewport">
            <div id="printable-a4-page" className="preview-a4-container text-slate-950">
              {renderSingleTicket('نسخة الميزان / الأصل')}
              <div className="relative flex items-center justify-center my-0.5 no-print">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-slate-300"></div></div>
                <div className="relative bg-white text-slate-400 px-2 py-0.2 text-[7px] font-black border border-slate-100 rounded-sm">
                  <Scissors className="w-2.5 h-2.5 inline ml-1" /><span>خط الفصل 1</span>
                </div>
              </div>
              {renderSingleTicket('نسخة العميل - المورد')}
              <div className="relative flex items-center justify-center my-0.5 no-print">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-slate-300"></div></div>
                <div className="relative bg-white text-slate-400 px-2 py-0.2 text-[7px] font-black border border-slate-100 rounded-sm">
                  <Scissors className="w-2.5 h-2.5 inline ml-1" /><span>خط الفصل 2</span>
                </div>
              </div>
              {renderSingleTicket('نسخة الأمن / البوابة')}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between no-print">
            <p className="text-xs text-slate-500 font-medium">سيتم طباعة ثلاث نسخ متطابقة على صفحة A4 واحدة (الميزان - العميل والمورد - أمن البوابة).</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-12 py-3.5 bg-gradient-to-r from-[#0F766E] to-teal-800 hover:from-teal-600 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-xl transition-all flex items-center gap-2 cursor-pointer border border-teal-500/20"
              >
                <Printer className="w-5 h-5" />
                <span>تأكيد الطباعة النهائية</span>
              </button>
              <button
                onClick={onClose}
                className="px-8 py-3.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-2xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

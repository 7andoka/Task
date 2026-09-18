import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  RefreshCw, 
  SlidersHorizontal, 
  FileText, 
  Clipboard, 
  ArrowUpDown, 
  Database,
  Scale,
  Check,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';
import { toast } from 'sonner';

export interface SystemItemForReconciliation {
  itemCode: string;
  itemName: string;
  groupName?: string;
  unit?: string;
  storeName?: string;
  currentBalance: number;
}

interface SapReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  systemItems: SystemItemForReconciliation[];
  lang: Language;
}

type FilterTab = 'all' | 'variances' | 'surplus' | 'deficit' | 'matched' | 'missing_sap' | 'missing_system';

export default function SapReconciliationModal({
  isOpen,
  onClose,
  title,
  subtitle,
  systemItems,
  lang
}: SapReconciliationModalProps) {
  const isRtl = lang === 'ar';

  // State for uploaded SAP raw data
  const [sapFileRows, setSapFileRows] = useState<any[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [showPasteArea, setShowPasteArea] = useState<boolean>(false);

  // Column Mapping
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [selectedCodeCol, setSelectedCodeCol] = useState<string>('');
  const [selectedNameCol, setSelectedNameCol] = useState<string>('');
  const [selectedQtyCol, setSelectedQtyCol] = useState<string>('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // ---------------------------------------------------------------------------
  // 1. Export System Items Template (Excel)
  // ---------------------------------------------------------------------------
  const handleExportSystemTemplate = () => {
    try {
      const exportRows = systemItems.map((item, idx) => ({
        'م': idx + 1,
        'كود الصنف': item.itemCode || '-',
        'اسم الصنف': item.itemName || '-',
        'المجموعة': item.groupName || '-',
        'الوحدة': item.unit || 'كجم',
        'رصيد السيستم': Number(item.currentBalance || 0),
        'رصيد الساب (SAP Balance)': '' // Blank column for user input
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      
      // Auto width columns
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 40 },
        { wch: 20 },
        { wch: 10 },
        { wch: 18 },
        { wch: 24 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'أكواد السيستم للمطابقة');
      
      const fileName = `أكواد_الأصناف_لمطابقة_الساب_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success(isRtl ? 'تم تصدير ملف أكواد الأصناف بنجاح' : 'System item codes exported successfully');
    } catch (err: any) {
      toast.error(isRtl ? `خطأ أثناء تصدير الملف: ${err.message}` : `Export error: ${err.message}`);
    }
  };

  // Helper to auto-detect columns from raw data headers
  const autoDetectColumns = (columns: string[], rows: any[]) => {
    setDetectedColumns(columns);

    // Auto-detect Code column
    const codeCandidates = ['كود الصنف', 'كود', 'كود المواد', 'item code', 'code', 'material', 'material no', 'material number', 'item_code', 'item_no'];
    const foundCode = columns.find(col => codeCandidates.some(c => col.toLowerCase().trim().includes(c)));
    
    // Auto-detect Name column
    const nameCandidates = ['اسم الصنف', 'الصنف', 'المادة', 'وصف الصنف', 'item name', 'description', 'material description', 'name', 'item_name'];
    const foundName = columns.find(col => nameCandidates.some(c => col.toLowerCase().trim().includes(c)));

    // Auto-detect Qty column
    const qtyCandidates = ['رصيد الساب', 'رصيد ساب', 'الرصيد', 'كمية الساب', 'كمية', 'sap balance', 'sap qty', 'quantity', 'balance', 'stock', 'unrestricted', 'المخزون', 'رصيد السيستم'];
    const foundQty = columns.find(col => qtyCandidates.some(c => col.toLowerCase().trim().includes(c)));

    if (foundCode) setSelectedCodeCol(foundCode);
    else if (columns.length > 0) setSelectedCodeCol(columns[0]);

    if (foundName) setSelectedNameCol(foundName);
    else if (columns.length > 1) setSelectedNameCol(columns[1]);

    if (foundQty) setSelectedQtyCol(foundQty);
    else if (columns.length > 2) setSelectedQtyCol(columns[2]);
  };

  // ---------------------------------------------------------------------------
  // 2. Parse Uploaded File (Excel / CSV)
  // ---------------------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const cols = Object.keys(results.data[0] as object);
            setSapFileRows(results.data);
            autoDetectColumns(cols, results.data);
            toast.success(isRtl ? `تم قراءة ${results.data.length} صنف من ملف الساب` : `Loaded ${results.data.length} rows from file`);
          }
        },
        error: (err) => {
          toast.error(isRtl ? `خطأ في قراءة ملف CSV: ${err.message}` : err.message);
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          
          if (data && data.length > 0) {
            const cols = Object.keys(data[0] as object);
            setSapFileRows(data);
            autoDetectColumns(cols, data);
            toast.success(isRtl ? `تم قراءة ${data.length} صنف من ملف الساب` : `Loaded ${data.length} rows from Excel`);
          } else {
            toast.error(isRtl ? 'الملف فارغ أو لا يحتوي على بيانات صحيحة' : 'File is empty');
          }
        } catch (err: any) {
          toast.error(isRtl ? `خطأ في معالجة ملف الإكسل: ${err.message}` : err.message);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. Parse Pasted Data
  // ---------------------------------------------------------------------------
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      toast.error(isRtl ? 'يرجى لصق البيانات أولاً' : 'Please paste text first');
      return;
    }

    Papa.parse(pastedText.trim(), {
      header: true,
      delimiter: '\t', // Tab separated from Excel copies
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const cols = Object.keys(results.data[0] as object);
          setSapFileRows(results.data);
          setUploadedFileName(isRtl ? 'بيانات مسبقة اللصق' : 'Pasted Text');
          autoDetectColumns(cols, results.data);
          setShowPasteArea(false);
          toast.success(isRtl ? `تم قراءة ${results.data.length} صنف مصلوق بنجاح` : `Parsed ${results.data.length} rows`);
        } else {
          // Fallback comma delimiter
          Papa.parse(pastedText.trim(), {
            header: true,
            skipEmptyLines: true,
            complete: (res) => {
              if (res.data && res.data.length > 0) {
                const cols = Object.keys(res.data[0] as object);
                setSapFileRows(res.data);
                setUploadedFileName(isRtl ? 'بيانات مسبقة اللصق' : 'Pasted Text');
                autoDetectColumns(cols, res.data);
                setShowPasteArea(false);
                toast.success(isRtl ? `تم قراءة ${res.data.length} صنف مصلوق بنجاح` : `Parsed ${res.data.length} rows`);
              }
            }
          });
        }
      }
    });
  };

  // Helper to normalize keys (code/name)
  const normKey = (val: any) => {
    if (val === null || val === undefined) return '';
    return String(val)
      .trim()
      .toLowerCase()
      .replace(/[\s\u200B-\u200D\uFEFF]/g, '')
      .replace(/^0+/, ''); // strip leading zeros for flexible matching
  };

  // ---------------------------------------------------------------------------
  // 4. Reconciliation Engine: Combine System Items + SAP Uploaded Items
  // ---------------------------------------------------------------------------
  const reconciliationData = useMemo(() => {
    if (sapFileRows.length === 0) return [];

    // Build map from Uploaded SAP File
    const sapMap = new Map<string, { code: string; name: string; qty: number; rawRow: any }>();
    
    sapFileRows.forEach(row => {
      const rawCode = selectedCodeCol ? String(row[selectedCodeCol] || '').trim() : '';
      const rawName = selectedNameCol ? String(row[selectedNameCol] || '').trim() : '';
      
      const qtyVal = selectedQtyCol ? parseFloat(String(row[selectedQtyCol]).replace(/,/g, '')) : 0;
      const parsedQty = isNaN(qtyVal) ? 0 : qtyVal;

      const codeKey = normKey(rawCode);
      const nameKey = normKey(rawName);

      const mapKey = codeKey || nameKey;
      if (mapKey) {
        if (!sapMap.has(mapKey)) {
          sapMap.set(mapKey, { code: rawCode, name: rawName, qty: parsedQty, rawRow: row });
        } else {
          // Accumulate duplicate rows in SAP file
          const existing = sapMap.get(mapKey)!;
          existing.qty += parsedQty;
        }
      }
    });

    const processedSystemKeys = new Set<string>();

    const comparisonList: Array<{
      itemCode: string;
      itemName: string;
      groupName: string;
      unit: string;
      systemQty: number;
      sapQty: number;
      variance: number; // systemQty - sapQty
      status: 'MATCHED' | 'SURPLUS' | 'DEFICIT' | 'MISSING_IN_SAP' | 'MISSING_IN_SYSTEM';
      statusLabelAr: string;
      statusLabelEn: string;
      statusColor: string;
    }> = [];

    // Compare System Items against SAP Map
    systemItems.forEach(sysItem => {
      const sysCodeKey = normKey(sysItem.itemCode);
      const sysNameKey = normKey(sysItem.itemName);

      // Find in SAP Map by code first, then by name
      let sapEntry = sysCodeKey ? sapMap.get(sysCodeKey) : undefined;
      let matchedKey = sysCodeKey;

      if (!sapEntry && sysNameKey) {
        sapEntry = sapMap.get(sysNameKey);
        matchedKey = sysNameKey;
      }

      const systemQty = Number(sysItem.currentBalance || 0);

      if (sapEntry) {
        if (matchedKey) processedSystemKeys.add(matchedKey);
        const sapQty = sapEntry.qty;
        const variance = systemQty - sapQty;

        let status: 'MATCHED' | 'SURPLUS' | 'DEFICIT' = 'MATCHED';
        let statusLabelAr = 'مطابق 100%';
        let statusLabelEn = 'Matched';
        let statusColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';

        if (Math.abs(variance) > 0.001) {
          if (variance > 0) {
            status = 'SURPLUS';
            statusLabelAr = `زيادة بالسيستم (+${variance.toLocaleString()})`;
            statusLabelEn = `System Surplus (+${variance})`;
            statusColor = 'bg-blue-500/10 text-blue-600 border-blue-500/30';
          } else {
            status = 'DEFICIT';
            statusLabelAr = `عجز بالسيستم (${variance.toLocaleString()})`;
            statusLabelEn = `System Deficit (${variance})`;
            statusColor = 'bg-rose-500/10 text-rose-600 border-rose-500/30';
          }
        }

        comparisonList.push({
          itemCode: sysItem.itemCode || sapEntry.code || '-',
          itemName: sysItem.itemName || sapEntry.name || '-',
          groupName: sysItem.groupName || 'عام',
          unit: sysItem.unit || 'كجم',
          systemQty,
          sapQty,
          variance,
          status,
          statusLabelAr,
          statusLabelEn,
          statusColor
        });
      } else {
        // Item exists in System but missing in SAP uploaded file
        comparisonList.push({
          itemCode: sysItem.itemCode || '-',
          itemName: sysItem.itemName || '-',
          groupName: sysItem.groupName || 'عام',
          unit: sysItem.unit || 'كجم',
          systemQty,
          sapQty: 0,
          variance: systemQty,
          status: 'MISSING_IN_SAP',
          statusLabelAr: 'غير موجود بملف الساب',
          statusLabelEn: 'Missing in SAP file',
          statusColor: 'bg-amber-500/10 text-amber-600 border-amber-500/30'
        });
      }
    });

    // Add items present in SAP file but NOT in System
    sapMap.forEach((sapEntry, key) => {
      if (!processedSystemKeys.has(key)) {
        comparisonList.push({
          itemCode: sapEntry.code || '-',
          itemName: sapEntry.name || '-',
          groupName: 'غير معرّف بالسيستم',
          unit: 'كجم',
          systemQty: 0,
          sapQty: sapEntry.qty,
          variance: -sapEntry.qty,
          status: 'MISSING_IN_SYSTEM',
          statusLabelAr: 'صنف جديد (موجود بالساب فقط)',
          statusLabelEn: 'New in SAP only',
          statusColor: 'bg-purple-500/10 text-purple-600 border-purple-500/30'
        });
      }
    });

    return comparisonList;
  }, [sapFileRows, selectedCodeCol, selectedNameCol, selectedQtyCol, systemItems]);

  // Statistics
  const stats = useMemo(() => {
    const total = reconciliationData.length;
    const matched = reconciliationData.filter(i => i.status === 'MATCHED').length;
    const surplus = reconciliationData.filter(i => i.status === 'SURPLUS').length;
    const deficit = reconciliationData.filter(i => i.status === 'DEFICIT').length;
    const missingSap = reconciliationData.filter(i => i.status === 'MISSING_IN_SAP').length;
    const missingSystem = reconciliationData.filter(i => i.status === 'MISSING_IN_SYSTEM').length;
    const totalVariances = total - matched;

    const totalSystemVal = reconciliationData.reduce((acc, curr) => acc + curr.systemQty, 0);
    const totalSapVal = reconciliationData.reduce((acc, curr) => acc + curr.sapQty, 0);
    const netVariance = totalSystemVal - totalSapVal;

    return {
      total,
      matched,
      surplus,
      deficit,
      missingSap,
      missingSystem,
      totalVariances,
      totalSystemVal,
      totalSapVal,
      netVariance
    };
  }, [reconciliationData]);

  // Filtered Comparison Items
  const filteredItems = useMemo(() => {
    return reconciliationData.filter(item => {
      // Tab filter
      if (activeTab === 'variances' && item.status === 'MATCHED') return false;
      if (activeTab === 'surplus' && item.status !== 'SURPLUS') return false;
      if (activeTab === 'deficit' && item.status !== 'DEFICIT') return false;
      if (activeTab === 'matched' && item.status !== 'MATCHED') return false;
      if (activeTab === 'missing_sap' && item.status !== 'MISSING_IN_SAP') return false;
      if (activeTab === 'missing_system' && item.status !== 'MISSING_IN_SYSTEM') return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          item.itemCode.toLowerCase().includes(q) ||
          item.itemName.toLowerCase().includes(q) ||
          item.groupName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [reconciliationData, activeTab, searchQuery]);

  // ---------------------------------------------------------------------------
  // Export Comparison Results to Excel
  // ---------------------------------------------------------------------------
  const handleExportReconciliationReport = () => {
    if (reconciliationData.length === 0) {
      toast.error(isRtl ? 'لا توجد نتائج مطابقة لتصديرها' : 'No data to export');
      return;
    }

    try {
      const exportRows = filteredItems.map((item, idx) => ({
        'م': idx + 1,
        'كود الصنف': item.itemCode,
        'اسم الصنف': item.itemName,
        'المجموعة': item.groupName,
        'الوحدة': item.unit,
        'رصيد السيستم': item.systemQty,
        'رصيد الساب (SAP)': item.sapQty,
        'الانحراف / الفرق': item.variance,
        'حالة المطابقة': isRtl ? item.statusLabelAr : item.statusLabelEn
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 40 },
        { wch: 20 },
        { wch: 10 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 30 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير مطابقة الساب');

      const fileName = `تقرير_مطابقة_رصيد_الساب_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success(isRtl ? 'تم تصدير تقرير مقارنة الساب بنجاح' : 'Reconciliation report exported successfully');
    } catch (err: any) {
      toast.error(isRtl ? `خطأ التصدير: ${err.message}` : err.message);
    }
  };

  // Export PDF Report
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('SAP vs System Stock Reconciliation Report', 14, 15);
      doc.setFontSize(10);
      doc.text(`Title: ${title} | Date: ${new Date().toLocaleDateString()}`, 14, 22);

      const tableHeaders = ['#', 'Item Code', 'Item Name', 'Group', 'System Qty', 'SAP Qty', 'Variance', 'Status'];
      const tableRows = filteredItems.map((item, idx) => [
        idx + 1,
        item.itemCode,
        item.itemName.slice(0, 35),
        item.groupName,
        item.systemQty.toLocaleString(),
        item.sapQty.toLocaleString(),
        item.variance.toLocaleString(),
        item.statusLabelEn
      ]);

      (doc as any).autoTable({
        head: [tableHeaders],
        body: tableRows,
        startY: 28,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [13, 148, 136] }
      });

      doc.save(`SAP_Reconciliation_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(isRtl ? 'تم تصدير ملف PDF بنجاح' : 'PDF exported successfully');
    } catch (err: any) {
      toast.error(isRtl ? `خطأ PDF: ${err.message}` : err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-zinc-900 p-4 sm:p-6 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 z-10">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-emerald-300">
              <Scale size={26} />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight">{title}</h2>
              <p className="text-xs text-emerald-200 mt-0.5 font-medium">
                {subtitle || (isRtl ? 'مطابقة ومقارنة أرصدة أصناف السيستم الحالية مع رصيد نظام الساب (SAP)' : 'Reconcile System Balances with SAP Stock')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer z-10"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-zinc-50/50 dark:bg-zinc-900/50">
          
          {/* Action Step Bar: 1. Export System Codes | 2. Upload/Paste SAP File */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Step 1: Export System Item Codes Template */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-[11px] font-black">
                    1
                  </span>
                  <span>{isRtl ? 'الخطوة 1: تصدير اكواد أصناف السيستم' : 'Step 1: Export System Item Codes'}</span>
                </div>
                <span className="text-[11px] text-zinc-400 font-semibold">{systemItems.length} {isRtl ? 'صنف بالسيستم' : 'items'}</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {isRtl 
                  ? 'قم بتصدير ملف شيت يحتوي على أكواد وأسماء الأصناف ورصيد السيستم للبدء بمطابقتها.' 
                  : 'Export Excel template containing all system codes and balances.'}
              </p>
              <button
                onClick={handleExportSystemTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <FileSpreadsheet size={16} />
                <span>{isRtl ? 'تحميل قالب أكواد الأصناف (Excel)' : 'Download System Item Codes (Excel)'}</span>
              </button>
            </div>

            {/* Step 2: Upload SAP Stock File or Paste */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-400">
                  <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 flex items-center justify-center text-[11px] font-black">
                    2
                  </span>
                  <span>{isRtl ? 'الخطوة 2: رفع ملف رصيد الساب (SAP)' : 'Step 2: Upload SAP Stock File'}</span>
                </div>
                {uploadedFileName && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold truncate max-w-[150px]">
                    {uploadedFileName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all cursor-pointer">
                  <Upload size={16} />
                  <span>{uploadedFileName ? (isRtl ? 'تغيير الملف' : 'Change File') : (isRtl ? 'اختر ملف الساب (Excel/CSV)' : 'Upload SAP File')}</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowPasteArea(!showPasteArea)}
                  className="px-3 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  title={isRtl ? 'لصق نص مباشر' : 'Paste Direct'}
                >
                  <Clipboard size={15} />
                  <span className="hidden sm:inline">{isRtl ? 'لصق مسبق' : 'Paste'}</span>
                </button>
              </div>

              {showPasteArea && (
                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-700">
                  <textarea
                    rows={3}
                    placeholder={isRtl ? 'انسخ جدول بيانات الساب من الإكسل والجقه هنا...' : 'Paste SAP Excel rows here...'}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={handleParsePastedText}
                    className="px-4 py-1.5 rounded-lg bg-teal-600 text-white font-bold text-xs hover:bg-teal-500"
                  >
                    {isRtl ? 'قراءة البيانات الملصوقة' : 'Parse Pasted Text'}
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Column Selector mapping if headers detected */}
          {detectedColumns.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                <SlidersHorizontal size={15} className="text-amber-600" />
                <span>{isRtl ? 'ربط أعمدة ملف الساب المرفوع:' : 'Map Uploaded Columns:'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-600 dark:text-zinc-400 font-bold block mb-1">
                    {isRtl ? 'عمود كود الصنف' : 'Item Code Column'}
                  </label>
                  <select
                    value={selectedCodeCol}
                    onChange={(e) => setSelectedCodeCol(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-800 text-xs font-bold outline-none"
                  >
                    {detectedColumns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-600 dark:text-zinc-400 font-bold block mb-1">
                    {isRtl ? 'عمود اسم الصنف' : 'Item Name Column'}
                  </label>
                  <select
                    value={selectedNameCol}
                    onChange={(e) => setSelectedNameCol(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-800 text-xs font-bold outline-none"
                  >
                    <option value="">-- {isRtl ? 'بدون' : 'None'} --</option>
                    {detectedColumns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-600 dark:text-zinc-400 font-bold block mb-1">
                    {isRtl ? 'عمود رصيد الساب (الكمية)' : 'SAP Quantity Column'}
                  </label>
                  <select
                    value={selectedQtyCol}
                    onChange={(e) => setSelectedQtyCol(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-800 text-xs font-bold outline-none text-emerald-700 dark:text-emerald-400"
                  >
                    {detectedColumns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Results Analysis Panel (Only when file uploaded/parsed) */}
          {sapFileRows.length > 0 ? (
            <div className="space-y-4">
              
              {/* Summary KPIs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div 
                  onClick={() => setActiveTab('all')}
                  className={`p-3 rounded-2xl bg-white dark:bg-zinc-800 border cursor-pointer transition-all ${activeTab === 'all' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-zinc-200 dark:border-zinc-700'}`}
                >
                  <span className="text-[10px] text-zinc-400 font-bold block">{isRtl ? 'إجمالي الأصناف' : 'Total Items'}</span>
                  <strong className="text-base font-black text-zinc-900 dark:text-white">{stats.total}</strong>
                </div>

                <div 
                  onClick={() => setActiveTab('matched')}
                  className={`p-3 rounded-2xl bg-white dark:bg-zinc-800 border cursor-pointer transition-all ${activeTab === 'matched' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-zinc-200 dark:border-zinc-700'}`}
                >
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">{isRtl ? 'مطابقة 100%' : 'Matched'}</span>
                  <strong className="text-base font-black text-emerald-600 dark:text-emerald-400">{stats.matched}</strong>
                </div>

                <div 
                  onClick={() => setActiveTab('surplus')}
                  className={`p-3 rounded-2xl bg-white dark:bg-zinc-800 border cursor-pointer transition-all ${activeTab === 'surplus' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-zinc-200 dark:border-zinc-700'}`}
                >
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block">{isRtl ? 'زيادة بالسيستم' : 'System Surplus'}</span>
                  <strong className="text-base font-black text-blue-600 dark:text-blue-400">{stats.surplus}</strong>
                </div>

                <div 
                  onClick={() => setActiveTab('deficit')}
                  className={`p-3 rounded-2xl bg-white dark:bg-zinc-800 border cursor-pointer transition-all ${activeTab === 'deficit' ? 'ring-2 ring-rose-500 border-rose-500' : 'border-zinc-200 dark:border-zinc-700'}`}
                >
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">{isRtl ? 'عجز بالسيستم' : 'System Deficit'}</span>
                  <strong className="text-base font-black text-rose-600 dark:text-rose-400">{stats.deficit}</strong>
                </div>

                <div 
                  onClick={() => setActiveTab('missing_sap')}
                  className={`p-3 rounded-2xl bg-white dark:bg-zinc-800 border cursor-pointer transition-all ${activeTab === 'missing_sap' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-zinc-200 dark:border-zinc-700'}`}
                >
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">{isRtl ? 'غير موجود بملف الساب' : 'Missing in SAP'}</span>
                  <strong className="text-base font-black text-amber-600 dark:text-amber-400">{stats.missingSap}</strong>
                </div>

                <div 
                  onClick={() => setActiveTab('missing_system')}
                  className={`p-3 rounded-2xl bg-white dark:bg-zinc-800 border cursor-pointer transition-all ${activeTab === 'missing_system' ? 'ring-2 ring-purple-500 border-purple-500' : 'border-zinc-200 dark:border-zinc-700'}`}
                >
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold block">{isRtl ? 'جديد بالساب فقط' : 'New in SAP'}</span>
                  <strong className="text-base font-black text-purple-600 dark:text-purple-400">{stats.missingSystem}</strong>
                </div>
              </div>

              {/* Toolbar & Filter Tabs */}
              <div className="bg-white dark:bg-zinc-800 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                {/* Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto p-1 bg-zinc-100 dark:bg-zinc-900/60 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'all' ? 'bg-white dark:bg-zinc-800 shadow-xs text-zinc-900 dark:text-white' : 'text-zinc-500'}`}
                  >
                    {isRtl ? 'جميع الأصناف' : 'All'} ({stats.total})
                  </button>
                  <button
                    onClick={() => setActiveTab('variances')}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-rose-600 dark:text-rose-400 ${activeTab === 'variances' ? 'bg-rose-500 text-white shadow-xs' : ''}`}
                  >
                    {isRtl ? 'الاختلافات فقط' : 'Variances'} ({stats.totalVariances})
                  </button>
                  <button
                    onClick={() => setActiveTab('surplus')}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-blue-600 dark:text-blue-400 ${activeTab === 'surplus' ? 'bg-blue-600 text-white shadow-xs' : ''}`}
                  >
                    {isRtl ? 'زيادة' : 'Surplus'} ({stats.surplus})
                  </button>
                  <button
                    onClick={() => setActiveTab('deficit')}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-rose-600 dark:text-rose-400 ${activeTab === 'deficit' ? 'bg-rose-600 text-white shadow-xs' : ''}`}
                  >
                    {isRtl ? 'عجز' : 'Deficit'} ({stats.deficit})
                  </button>
                  <button
                    onClick={() => setActiveTab('matched')}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-emerald-600 dark:text-emerald-400 ${activeTab === 'matched' ? 'bg-emerald-600 text-white shadow-xs' : ''}`}
                  >
                    {isRtl ? 'مطابق' : 'Matched'} ({stats.matched})
                  </button>
                </div>

                {/* Search Input & Export Actions */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                    <input
                      type="text"
                      placeholder={isRtl ? 'بحث بكود أو اسم الصنف...' : 'Search code or name...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-3 pr-9 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    onClick={handleExportReconciliationReport}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                    title={isRtl ? 'تصدير تقرير مقارنة الساب إكسل' : 'Export Excel'}
                  >
                    <FileSpreadsheet size={15} />
                    <span className="hidden sm:inline">{isRtl ? 'تصدير مقارنة (Excel)' : 'Export Excel'}</span>
                  </button>

                  <button
                    onClick={handleExportPDF}
                    className="px-2.5 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer shrink-0"
                    title="PDF"
                  >
                    <Download size={15} />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                </div>

              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xs max-h-[400px]">
                <table className="w-full text-xs text-right dir-rtl">
                  <thead className="bg-zinc-100 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-300 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">{isRtl ? 'كود الصنف' : 'Item Code'}</th>
                      <th className="p-3">{isRtl ? 'اسم الصنف' : 'Item Name'}</th>
                      <th className="p-3">{isRtl ? 'المجموعة' : 'Group'}</th>
                      <th className="p-3 text-center">{isRtl ? 'رصيد السيستم' : 'System Qty'}</th>
                      <th className="p-3 text-center">{isRtl ? 'رصيد الساب (SAP)' : 'SAP Qty'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الانحراف (الفرق)' : 'Variance'}</th>
                      <th className="p-3 text-center">{isRtl ? 'حالة المطابقة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/60 font-medium">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-zinc-400">
                          {isRtl ? 'لا توجد نتائج مطابقة للفلاتر المحددة' : 'No items match filter criteria'}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => (
                        <tr 
                          key={idx}
                          className={`hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors ${
                            item.status === 'SURPLUS' ? 'bg-blue-50/30 dark:bg-blue-950/10' :
                            item.status === 'DEFICIT' ? 'bg-rose-50/30 dark:bg-rose-950/10' :
                            item.status === 'MISSING_IN_SAP' ? 'bg-amber-50/30 dark:bg-amber-950/10' :
                            item.status === 'MISSING_IN_SYSTEM' ? 'bg-purple-50/30 dark:bg-purple-950/10' : ''
                          }`}
                        >
                          <td className="p-2.5 text-center text-zinc-400 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-bold font-mono text-zinc-900 dark:text-zinc-100">{item.itemCode}</td>
                          <td className="p-2.5 font-bold text-zinc-800 dark:text-zinc-200">{item.itemName}</td>
                          <td className="p-2.5 text-zinc-500">{item.groupName}</td>
                          <td className="p-2.5 text-center font-bold text-zinc-900 dark:text-zinc-100">
                            {item.systemQty.toLocaleString()} <span className="text-[10px] text-zinc-400">{item.unit}</span>
                          </td>
                          <td className="p-2.5 text-center font-bold text-emerald-700 dark:text-emerald-400">
                            {item.sapQty.toLocaleString()} <span className="text-[10px] text-zinc-400">{item.unit}</span>
                          </td>
                          <td className="p-2.5 text-center font-extrabold dir-ltr">
                            <span className={item.variance > 0 ? 'text-blue-600 dark:text-blue-400' : item.variance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}>
                              {item.variance > 0 ? `+${item.variance.toLocaleString()}` : item.variance.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${item.statusColor}`}>
                              {isRtl ? item.statusLabelAr : item.statusLabelEn}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          ) : (
            /* Blank state before file upload */
            <div className="p-12 text-center rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/40 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <Scale size={32} />
              </div>
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                {isRtl ? 'جاهز لبدء مطابقة أرصدة الساب' : 'Ready for SAP Reconciliation'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
                {isRtl 
                  ? 'اختر "تحميل قالب أكواد الأصناف" ثم قم برفع ملف رصيد الساب المصدّر من نظام SAP لحساب جميع الفروقات والتجاوزات تلقائياً.' 
                  : 'Download system item codes template or upload your SAP stock file to compare balances instantly.'}
              </p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <p className="text-xs text-zinc-500 font-medium">
            {sapFileRows.length > 0 
              ? (isRtl ? `تم حساب الفروقات لـ ${stats.total} صنف` : `Calculated variances for ${stats.total} items`)
              : (isRtl ? 'قم برفع ملف الساب لإظهار النتائج' : 'Upload file to see comparison')}
          </p>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs cursor-pointer"
          >
            {isRtl ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </motion.div>
    </div>
  );
}

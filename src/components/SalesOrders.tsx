import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, 
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
  Calendar,
  Truck,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  PackageCheck,
  User,
  ArrowUpDown,
  ExternalLink,
  Table as TableIcon,
  Sparkles,
  Building2,
  Hash,
  Filter,
  ArrowRight,
  Boxes,
  DollarSign,
  Plus,
  Info,
  CheckCircle2,
  Trash2,
  Edit3,
  Save,
  Link as LinkIcon,
  Users
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { Language, UserProfile, SalesOrderRecord } from '../types';
import { translations } from '../i18n';
import DateRangeFilter, { DateFilterValue, getPresetDates } from './DateRangeFilter';
import { 
  normalizeArabicSearch, 
  matchesArabicSearch, 
  normalizeSupplierKey,
  resolveCanonicalSupplierName
} from '../utils/arabic';
import { formatCleanSupplierName } from './FreshSupply';
import { soundFx } from '../utils/sound';
import { toast } from 'sonner';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { COLLECTIONS } from '../constants';

const STORAGE_CACHE_KEY = "sales_orders_data_cache";
const STORAGE_TIME_KEY = "sales_orders_last_synced";
const STORAGE_URL_KEY = "sales_orders_sheet_url";

// Default placeholder Google Sheet URL (user can edit/paste their actual sheet URL anytime via UI)
export const DEFAULT_SALES_ORDERS_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQN1nH0TPk6-NpHHIWN6xQ1RKnjut-nzUgga3-zzB1ydF9f2L3--JPiwu6qJHnCcFymfsZj3gTzKiIo/pub?output=csv";

interface SalesOrdersProps {
  lang: Language;
  user?: UserProfile | null;
}

export const detectSalesVariety = (descr: string): string => {
  const dLower = (descr || '').toLowerCase();
  if (dLower.includes('pepper') || dLower.includes('فلفل') || dLower.includes('شطة') || dLower.includes('jalapen')) return 'Pepper';
  if (dLower.includes('manzanilla') || dLower.includes('manzanila') || dLower.includes('منزان') || dLower.includes('منزن') || dLower.includes('مانزنيلا') || dLower.includes('مانزنيلو')) return 'Manzanilla';
  if (dLower.includes('picual') || dLower.includes('pical') || dLower.includes('بيكوال') || dLower.includes('بكوال')) return 'Picual';
  if (dLower.includes('akas') || dLower.includes('akass') || dLower.includes('عقص') || dLower.includes('عقيص') || dLower.includes('اقيص')) return 'Akas';
  if (dLower.includes('azizi') || dLower.includes('عزيز') || dLower.includes('عجيزي') || dLower.includes('عجيز')) return 'Azizi';
  if (dLower.includes('kobrosi') || dLower.includes('kobrosy') || dLower.includes('قبرص') || dLower.includes('قبرصي')) return 'Kobrosi';
  if (dLower.includes('kalamata') || dLower.includes('kalama') || dLower.includes('كالمات') || dLower.includes('كلامات') || dLower.includes('كلاماته') || dLower.includes('كلاماتا')) return 'Kalamata';
  if (dLower.includes('dolsy') || dLower.includes('dolcy') || dLower.includes('dolce') || dLower.includes('تفاح') || dLower.includes('tofah') || dLower.includes('دولس')) return 'Dolsy';
  if (dLower.includes('نور صباح') || dLower.includes('نور الصباح') || dLower.includes('نورالصباح') || dLower.includes('nour sabah') || dLower.includes('nour elsabah') || dLower.includes('nour al sabah') || dLower.includes('nouralsabah')) return 'Nour Sabah';
  if (dLower.includes('زيتون') || dLower.includes('olive')) return 'Azizi';
  return 'Other';
};

const VARIETY_COLORS: Record<string, string> = {
  Manzanilla: '#10b981',
  Picual: '#06b6d4',
  Kalamata: '#8b5cf6',
  Akas: '#f59e0b',
  Azizi: '#ec4899',
  Kobrosi: '#6366f1',
  Dolsy: '#14b8a6',
  'Nour Sabah': '#84cc16',
  Pepper: '#ef4444',
  Other: '#94a3b8'
};

const VARIETY_NAMES_AR: Record<string, string> = {
  Manzanilla: 'مانزنيلا',
  Picual: 'بيكوال',
  Kalamata: 'كلاماتا',
  Akas: 'عقص',
  Azizi: 'عجيزي',
  Kobrosi: 'قبرصي',
  Dolsy: 'دولسي / تفاحي',
  'Nour Sabah': 'نور الصباح',
  Pepper: 'فلفل / شطة',
  Other: 'أخرى / تشكيلة'
};

/** Convert any Google Sheet URL to direct CSV export */
function convertToCsvUrl(inputUrl: string): string {
  const trimmed = inputUrl.trim();
  if (!trimmed) return '';
  if (trimmed.includes('output=csv') || trimmed.includes('format=csv')) {
    return trimmed;
  }
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1]) {
    const sheetId = idMatch[1];
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  }
  return trimmed;
}

/** Helper to extract flexible column values */
const getRowValueFlexible = (row: Record<string, any>, ...keys: string[]): string => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  // Try case-insensitive and trimmed match
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    const normK = k.toLowerCase().trim().replace(/[\s_\-]/g, '');
    for (const rk of rowKeys) {
      const normRk = rk.toLowerCase().trim().replace(/[\s_\-]/g, '');
      if (normK === normRk && row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== '') {
        return String(row[rk]).trim();
      }
    }
  }
  return '';
};

// Flexible date parsing
const parseFlexibleDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  
  // ISO: YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }
  
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmyMatch) {
    let year = parseInt(dmyMatch[3]);
    if (year < 100) year += 2000;
    return new Date(year, parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]));
  }

  const parsed = new Date(clean);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const formatUnifiedDate = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function SalesOrders({ lang, user }: SalesOrdersProps) {
  const isRtl = lang === 'ar';
  const t = translations[lang];

  // User Roles
  const userRoles = (user?.roles || (user?.role ? [user.role] : [])) as string[];
  const isAdmin = userRoles.includes('Admin') || user?.role === 'Admin';
  const isManager = isAdmin || userRoles.includes('Warehouse Manager') || userRoles.includes('Senior Manager');

  // Google Sheet Link State
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_URL_KEY);
      return saved ? saved.trim() : DEFAULT_SALES_ORDERS_SHEET_URL;
    } catch {
      return DEFAULT_SALES_ORDERS_SHEET_URL;
    }
  });
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [inputUrl, setInputUrl] = useState(sheetUrl);

  // Data & Loading States
  const [data, setData] = useState<SalesOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_TIME_KEY) || null;
    } catch {
      return null;
    }
  });

  // Overrides map from Firestore for live modifications
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const overridesRef = useRef<Record<string, any>>({});
  const rawCsvDataRef = useRef<any[]>([]);

  // Navigation & View Mode
  const [activeView, setActiveView] = useState<'table' | 'analytics' | 'customers' | 'items'>('table');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'all' });
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedVarieties, setSelectedVarieties] = useState<string[]>([]);

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortField, setSortField] = useState<keyof SalesOrderRecord>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Quick Inline Edit State for Sales Order, Delivery, and POST DOCUMENT
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'salesOrder' | 'delivery' | 'postDocument' } | null>(null);
  const [cellValue, setCellValue] = useState('');
  const [savingCellId, setSavingCellId] = useState<string | null>(null);

  // Fast inline update function for Sales Order, Delivery, and POST DOCUMENT
  const handleInlineUpdate = async (record: SalesOrderRecord, field: 'salesOrder' | 'delivery' | 'postDocument', value: string) => {
    const trimmedVal = value.trim();
    if (record[field] === trimmedVal) {
      setEditingCell(null);
      return;
    }

    setSavingCellId(`${record.id}_${field}`);
    try {
      const docRef = doc(db, COLLECTIONS.SALES_ORDERS_OVERRIDES, record.id);
      await setDoc(docRef, {
        [field]: trimmedVal,
        ...(field === 'salesOrder' ? { orderNo: trimmedVal } : {}),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.displayName || user?.username || 'User'
      }, { merge: true });

      soundFx.playSuccess();
      toast.success(
        isRtl 
          ? `تم تحديث ${field === 'salesOrder' ? 'أمر البيع' : field === 'delivery' ? 'التسليم (Delivery)' : 'مستند الترحيل (POST DOCUMENT)'} بنجاح`
          : `${field} updated successfully`
      );
    } catch (err) {
      console.error("Inline update error:", err);
      toast.error(isRtl ? 'حدث خطأ أثناء حفظ التعديل' : 'Failed to update field');
    } finally {
      setSavingCellId(null);
      setEditingCell(null);
    }
  };

  // Modal inspection
  const [selectedRecord, setSelectedRecord] = useState<SalesOrderRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<SalesOrderRecord | null>(null);

  // Process raw CSV data into SalesOrderRecord objects
  const processSalesData = (rawData: any[], overridesMap: Record<string, any> = {}): SalesOrderRecord[] => {
    if (!Array.isArray(rawData)) return [];

    return rawData.map((row, idx) => {
      // Order Number / SO
      const orderNo = getRowValueFlexible(
        row,
        'رقم أمر البيع',
        'أمر البيع',
        'امر البيع',
        'رقم الامر',
        'رقم الأمر',
        'كود البيع',
        'Order No',
        'Order Number',
        'SO',
        'Sales Order',
        'Sales Order No',
        'SO Number',
        'SO No',
        'رقم الحركة',
        'PO'
      ) || `SO-${idx + 1}`;

      // Date
      const rawDate = getRowValueFlexible(row, 'التاريخ', 'تاريخ البيع', 'تاريخ الامر', 'تاريخ الأمر', 'Date', 'Order Date');
      const parsedDate = parseFlexibleDate(rawDate);
      const unifiedDate = parsedDate ? formatUnifiedDate(parsedDate) : (rawDate || '-');

      // Customer / Client
      const rawCustomer = getRowValueFlexible(
        row,
        'العميل',
        'اسم العميل',
        'المشتري',
        'جهة البيع',
        'مركز التكلفة',
        'Customer',
        'Client',
        'Customer Name',
        'Buyer'
      ) || 'عميل نقدي / غير محدد';
      const customer = formatCleanSupplierName(rawCustomer) || rawCustomer;
      const customerCode = getRowValueFlexible(row, 'كود العميل', 'كود المشتري', 'Customer Code', 'Client Code');

      // Item & Codes
      const sapCode = getRowValueFlexible(row, 'كود ساب', 'كود SAP', 'SAP', 'كود الصنف', 'SAP Code', 'Material Code');
      const oldCode = getRowValueFlexible(row, 'كود قديم', 'الكود', 'كود', 'Old Code', 'Code');
      const itemCode = sapCode || oldCode || getRowValueFlexible(row, 'رقم الصنف', 'Item Code') || `ITEM-${idx + 1}`;
      const itemName = getRowValueFlexible(row, 'اسم الصنف', 'الصنف', 'الوصف', 'Item Name', 'Description', 'Item') || 'صنف غير محدد';

      // Quantity & Weight
      const rawKg = getRowValueFlexible(row, 'الكمية كجم', 'الكمية (كجم)', 'الكمية', 'صرف', 'الوزن', 'اضافة', 'Quantity', 'Qty', 'Weight', 'Kg');
      const cleanKg = parseFloat(String(rawKg).replace(/,/g, '')) || 0;
      const tons = cleanKg / 1000;

      // Price & Total Amount
      const rawPrice = getRowValueFlexible(row, 'السعر', 'سعر الكيلو', 'سعر الوحدة', 'سعر البيع', 'Price', 'Unit Price');
      const unitPrice = parseFloat(String(rawPrice).replace(/,/g, '')) || 0;
      const rawTotal = getRowValueFlexible(row, 'الإجمالي', 'الاجمالي', 'القيمة', 'إجمالي القيمة', 'Total', 'Amount', 'Total Amount');
      const totalAmount = rawTotal ? (parseFloat(String(rawTotal).replace(/,/g, '')) || (cleanKg * unitPrice)) : (cleanKg * unitPrice);
      const currency = getRowValueFlexible(row, 'العملة', 'Currency') || 'ج.م';

      // Store & Status & Logistics
      const store = getRowValueFlexible(row, 'المخزن', 'مخزن الصرف', 'المستودع', 'Store', 'Warehouse', 'Location');
      const status = getRowValueFlexible(row, 'الحالة', 'حالة الأمر', 'حالة البيع', 'Status', 'Order Status') || 'معتمد';
      const truckNo = getRowValueFlexible(row, 'رقم السيارة', 'رقم سيارة', 'السيارة', 'Truck No', 'Truck');
      const driver = getRowValueFlexible(row, 'السائق', 'اسم السائق', 'Driver');
      const shippingDocNo = getRowValueFlexible(row, 'رقم إذن الصرف', 'إذن الصرف', 'مستند الترحيل', 'POST DOCUMENT', 'Doc No');
      const routing = getRowValueFlexible(row, 'التوجيه', 'جهة الشحن', 'الوجهة', 'Routing', 'Destination');
      const notes = getRowValueFlexible(row, 'ملاحظات', 'الملاحظات', 'Notes', 'Remarks');

      // Unique deterministic stable row ID
      const baseId = `so_${orderNo}_${itemCode}_${cleanKg}`.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_');
      const stableId = `${baseId}_${idx}`;

      // Apply overrides if exists
      const override = overridesMap[stableId] || overridesMap[orderNo] || {};

      const rawSalesOrder = getRowValueFlexible(
        row,
        'Sales Order',
        'Sales Order No',
        'Sales Order #',
        'SO',
        'SO Number',
        'أمر البيع',
        'امر البيع',
        'رقم أمر البيع',
        'رقم امر البيع'
      );
      const salesOrder = override.salesOrder !== undefined ? String(override.salesOrder).trim() : (rawSalesOrder || orderNo);

      const rawDelivery = getRowValueFlexible(
        row,
        'Delivery',
        'Delivery No',
        'Delivery Number',
        'التسليم',
        'إذن التسليم',
        'اذن التسليم',
        'رقم التسليم',
        'رقم إذن التسليم',
        'إذن الصرف',
        'اذن الصرف',
        'رقم إذن الصرف'
      );
      const delivery = override.delivery !== undefined ? String(override.delivery).trim() : rawDelivery;

      const rawPostDocument = getRowValueFlexible(
        row,
        'POST DOCUMENT',
        'POST_DOCUMENT',
        'POSTDOCUMENT',
        'Post Document',
        'Post Doc',
        'مستند الترحيل',
        'رقم مستند الترحيل',
        'مستند الصرف',
        'رقم مستند الصرف',
        'مستند الاستلام',
        'مستند ترحيل'
      );
      const postDocument = override.postDocument !== undefined ? String(override.postDocument).trim() : (rawPostDocument || shippingDocNo);

      return {
        id: stableId,
        orderNo: override.orderNo || orderNo,
        salesOrder: salesOrder,
        delivery: delivery,
        postDocument: postDocument,
        date: override.date || unifiedDate,
        originalDate: rawDate,
        parsedDate: parsedDate,
        customer: override.customer || customer,
        customerCode: override.customerCode || customerCode,
        itemCode: override.itemCode || itemCode,
        sapCode: override.sapCode || sapCode,
        itemName: override.itemName || itemName,
        variety: detectSalesVariety(override.itemName || itemName),
        quantityKg: override.quantityKg !== undefined ? Number(override.quantityKg) : cleanKg,
        quantityTons: override.quantityKg !== undefined ? Number(override.quantityKg) / 1000 : tons,
        unitPrice: override.unitPrice !== undefined ? Number(override.unitPrice) : unitPrice,
        totalAmount: override.totalAmount !== undefined ? Number(override.totalAmount) : totalAmount,
        currency: override.currency || currency,
        store: override.store || store,
        status: override.status || status,
        truckNo: override.truckNo || truckNo,
        driver: override.driver || driver,
        shippingDocNo: override.shippingDocNo || shippingDocNo,
        notes: override.notes !== undefined ? override.notes : notes,
        routing: override.routing || routing,
        updatedAt: override.updatedAt,
        updatedBy: override.updatedBy,
        raw: row
      };
    }).filter(r => r.quantityKg > 0 || r.orderNo);
  };

  // Fetch Live Data from Google Sheet
  const fetchData = async (isManual = false) => {
    if (!sheetUrl.trim()) return;

    try {
      if (isManual) setIsSyncing(true);
      else setLoading(true);

      // Check cache first for instant initial load
      if (!isManual && data.length === 0) {
        try {
          const cached = localStorage.getItem(STORAGE_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              rawCsvDataRef.current = parsed;
              setData(processSalesData(parsed, overridesRef.current || overrides));
              setLoading(false);
            }
          }
        } catch (e) {
          console.error("Cache read error:", e);
        }
      }

      const csvUrl = convertToCsvUrl(sheetUrl);
      const fetchUrl = `${csvUrl}${csvUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      const res = await fetch(fetchUrl, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const csvText = await res.text();
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            rawCsvDataRef.current = results.data;
            const processed = processSalesData(results.data, overridesRef.current || overrides);
            setData(processed);
            localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(results.data));
            const now = new Date().toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', {
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            setLastSynced(now);
            localStorage.setItem(STORAGE_TIME_KEY, now);

            if (isManual) {
              soundFx.playSuccess();
              toast.success(isRtl ? `تم تحديث البيانات بنجاح (${processed.length} أمر بيع)` : `Data synced (${processed.length} orders)`);
            }
          } else {
            if (isManual) toast.info(isRtl ? 'لم يتم العثور على سجلات في الشيت' : 'No records found');
          }
          setLoading(false);
          setIsSyncing(false);
        },
        error: (err) => {
          console.error("CSV parse error:", err);
          toast.error(isRtl ? 'فشل معالجة بيانات الشيت' : 'Failed to parse sheet data');
          setLoading(false);
          setIsSyncing(false);
        }
      });
    } catch (err: any) {
      console.error("Fetch error:", err);
      toast.error(isRtl ? 'تعذر الاتصال بملف جوجل شيت، تم عرض البيانات المحفوظة' : 'Failed to connect to Google Sheet, cached data shown');
      setLoading(false);
      setIsSyncing(false);
    }
  };

  // Initial load and real-time listener for overrides in Firestore
  useEffect(() => {
    fetchData(false);

    const unsub = onSnapshot(collection(db, COLLECTIONS.SALES_ORDERS_OVERRIDES), (snap) => {
      const map: Record<string, any> = {};
      snap.docs.forEach(d => {
        map[d.id] = d.data();
      });
      overridesRef.current = map;
      setOverrides(map);
      if (rawCsvDataRef.current.length > 0) {
        setData(processSalesData(rawCsvDataRef.current, map));
      }
    });

    return () => unsub();
  }, [sheetUrl]);

  // Save modified Sheet URL
  const handleSaveSheetUrl = () => {
    if (!inputUrl.trim()) {
      toast.error(isRtl ? 'يرجى إدخال الرابط' : 'Please enter URL');
      return;
    }
    const clean = inputUrl.trim();
    setSheetUrl(clean);
    localStorage.setItem(STORAGE_URL_KEY, clean);
    setShowUrlModal(false);
    toast.success(isRtl ? 'تم حفظ رابط جوجل شيت وجاري سحب البيانات' : 'Sheet URL saved, syncing data...');
    fetchData(true);
  };

  // Check if record matches date filter
  const checkDateMatch = (r: SalesOrderRecord, df: DateFilterValue): boolean => {
    if (df.mode === 'all') return true;
    if (!r.parsedDate) return true;

    const rTime = new Date(r.parsedDate.getFullYear(), r.parsedDate.getMonth(), r.parsedDate.getDate()).getTime();

    if (df.mode === 'single' && df.singleDate) {
      const target = new Date(df.singleDate).getTime();
      return rTime === target;
    }

    if (df.mode === 'preset' && df.presetKey) {
      const { startDate, endDate, singleDate } = getPresetDates(df.presetKey);
      if (singleDate) {
        return rTime === new Date(singleDate).getTime();
      }
      if (startDate && endDate) {
        return rTime >= new Date(startDate).getTime() && rTime <= new Date(endDate).getTime();
      }
    }

    if (df.mode === 'range') {
      if (df.startDate && df.endDate) {
        return rTime >= new Date(df.startDate).getTime() && rTime <= new Date(df.endDate).getTime();
      }
      if (df.startDate) return rTime >= new Date(df.startDate).getTime();
      if (df.endDate) return rTime <= new Date(df.endDate).getTime();
    }

    return true;
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter(record => {
      // 1. Text Search Query
      if (searchQuery.trim()) {
        const q = normalizeArabicSearch(searchQuery);
        const match = 
          matchesArabicSearch(record.orderNo, q) ||
          matchesArabicSearch(record.customer, q) ||
          matchesArabicSearch(record.customerCode || '', q) ||
          matchesArabicSearch(record.itemName, q) ||
          matchesArabicSearch(record.itemCode, q) ||
          matchesArabicSearch(record.sapCode || '', q) ||
          matchesArabicSearch(record.store || '', q) ||
          matchesArabicSearch(record.truckNo || '', q) ||
          matchesArabicSearch(record.driver || '', q) ||
          matchesArabicSearch(record.shippingDocNo || '', q) ||
          matchesArabicSearch(record.notes || '', q);
        if (!match) return false;
      }

      // 2. Date Filter
      if (!checkDateMatch(record, dateFilter)) return false;

      // 3. Customers Filter
      if (selectedCustomers.length > 0 && !selectedCustomers.includes(record.customer)) return false;

      // 4. Items Filter
      if (selectedItems.length > 0 && !selectedItems.includes(record.itemName)) return false;

      // 5. Stores Filter
      if (selectedStores.length > 0 && record.store && !selectedStores.includes(record.store)) return false;

      // 6. Statuses Filter
      if (selectedStatuses.length > 0 && record.status && !selectedStatuses.includes(record.status)) return false;

      // 7. Varieties Filter
      if (selectedVarieties.length > 0 && record.variety && !selectedVarieties.includes(record.variety)) return false;

      return true;
    });
  }, [data, searchQuery, dateFilter, selectedCustomers, selectedItems, selectedStores, selectedStatuses, selectedVarieties]);

  // Sorted dataset
  const sortedData = useMemo(() => {
    const list = [...filteredData];
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'date') {
        valA = a.parsedDate ? a.parsedDate.getTime() : 0;
        valB = b.parsedDate ? b.parsedDate.getTime() : 0;
      } else if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB, 'ar') : valB.localeCompare(valA, 'ar');
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredData, sortField, sortOrder]);

  // Pagination slice
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;

  // KPI Statistics Summary
  const stats = useMemo(() => {
    const totalKg = filteredData.reduce((acc, r) => acc + r.quantityKg, 0);
    const totalTons = totalKg / 1000;
    const totalRevenue = filteredData.reduce((acc, r) => acc + (r.totalAmount || 0), 0);
    const orderCount = new Set(filteredData.map(r => r.orderNo).filter(Boolean)).size;
    const movementCount = filteredData.length;
    const uniqueCustomers = new Set(filteredData.map(r => r.customer).filter(Boolean)).size;
    const uniqueItems = new Set(filteredData.map(r => r.itemName).filter(Boolean)).size;

    return {
      totalKg,
      totalTons,
      totalRevenue,
      orderCount,
      movementCount,
      uniqueCustomers,
      uniqueItems
    };
  }, [filteredData]);

  // Customers Summary Breakdown
  const customersSummary = useMemo(() => {
    const map = new Map<string, { customer: string; totalKg: number; totalTons: number; totalAmount: number; count: number }>();
    filteredData.forEach(r => {
      const c = r.customer || 'غير محدد';
      if (!map.has(c)) {
        map.set(c, { customer: c, totalKg: 0, totalTons: 0, totalAmount: 0, count: 0 });
      }
      const entry = map.get(c)!;
      entry.totalKg += r.quantityKg;
      entry.totalTons += r.quantityTons;
      entry.totalAmount += r.totalAmount || 0;
      entry.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
  }, [filteredData]);

  // Items Summary Breakdown
  const itemsSummary = useMemo(() => {
    const map = new Map<string, { itemName: string; itemCode: string; variety: string; totalKg: number; totalTons: number; totalAmount: number; count: number }>();
    filteredData.forEach(r => {
      const item = r.itemName || 'غير محدد';
      if (!map.has(item)) {
        map.set(item, { 
          itemName: item, 
          itemCode: r.sapCode || r.itemCode, 
          variety: r.variety || 'Other',
          totalKg: 0, 
          totalTons: 0, 
          totalAmount: 0, 
          count: 0 
        });
      }
      const entry = map.get(item)!;
      entry.totalKg += r.quantityKg;
      entry.totalTons += r.quantityTons;
      entry.totalAmount += r.totalAmount || 0;
      entry.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
  }, [filteredData]);

  // Chart Data: Top 7 Customers by Weight
  const topCustomersChart = useMemo(() => {
    return customersSummary.slice(0, 7).map(c => ({
      name: c.customer.length > 18 ? c.customer.substring(0, 18) + '...' : c.customer,
      fullName: c.customer,
      tons: parseFloat(c.totalTons.toFixed(2)),
      kg: c.totalKg
    }));
  }, [customersSummary]);

  // Chart Data: Variety Distribution
  const varietyChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      const v = r.variety || 'Other';
      map[v] = (map[v] || 0) + r.quantityKg;
    });
    return Object.entries(map).map(([variety, kg]) => ({
      name: isRtl ? (VARIETY_NAMES_AR[variety] || variety) : variety,
      key: variety,
      value: parseFloat((kg / 1000).toFixed(2)),
      color: VARIETY_COLORS[variety] || '#94a3b8'
    })).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
  }, [filteredData, isRtl]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const rows = sortedData.map(r => ({
        [isRtl ? 'رقم أمر البيع' : 'Order No']: r.orderNo,
        ['Sales Order']: r.salesOrder || r.orderNo,
        ['Delivery']: r.delivery || '',
        ['POST DOCUMENT']: r.postDocument || '',
        [isRtl ? 'التاريخ' : 'Date']: r.date,
        [isRtl ? 'العميل' : 'Customer']: r.customer,
        [isRtl ? 'كود العميل' : 'Customer Code']: r.customerCode || '',
        [isRtl ? 'كود ساب' : 'SAP Code']: r.sapCode || '',
        [isRtl ? 'كود الصنف' : 'Item Code']: r.itemCode,
        [isRtl ? 'اسم الصنف' : 'Item Name']: r.itemName,
        [isRtl ? 'النوع / الصنف' : 'Variety']: isRtl ? (VARIETY_NAMES_AR[r.variety || 'Other'] || r.variety) : r.variety,
        [isRtl ? 'الكمية (كجم)' : 'Qty (Kg)']: r.quantityKg,
        [isRtl ? 'الكمية (طن)' : 'Qty (Tons)']: r.quantityTons,
        [isRtl ? 'سعر الكيلو (ج.م)' : 'Unit Price']: r.unitPrice || '',
        [isRtl ? 'إجمالي القيمة' : 'Total Amount']: r.totalAmount || '',
        [isRtl ? 'المخزن' : 'Store']: r.store || '',
        [isRtl ? 'الحالة' : 'Status']: r.status || '',
        [isRtl ? 'رقم السيارة' : 'Truck No']: r.truckNo || '',
        [isRtl ? 'السائق' : 'Driver']: r.driver || '',
        [isRtl ? 'ملاحظات' : 'Notes']: r.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales_Orders');
      XLSX.writeFile(wb, `Sales_Orders_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(isRtl ? 'تم تصدير ملف الإكسيل بنجاح' : 'Excel exported successfully');
    } catch (e) {
      toast.error(isRtl ? 'فشل تصدير الإكسيل' : 'Export failed');
    }
  };

  // Save Edit in Firestore Override
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      const docRef = doc(db, COLLECTIONS.SALES_ORDERS_OVERRIDES, editingRecord.id);
      await setDoc(docRef, {
        orderNo: editingRecord.orderNo,
        salesOrder: editingRecord.salesOrder || editingRecord.orderNo,
        delivery: editingRecord.delivery || '',
        postDocument: editingRecord.postDocument || '',
        customer: editingRecord.customer,
        customerCode: editingRecord.customerCode || '',
        itemName: editingRecord.itemName,
        itemCode: editingRecord.itemCode,
        quantityKg: Number(editingRecord.quantityKg) || 0,
        unitPrice: Number(editingRecord.unitPrice) || 0,
        totalAmount: (Number(editingRecord.quantityKg) || 0) * (Number(editingRecord.unitPrice) || 0),
        store: editingRecord.store || '',
        status: editingRecord.status || '',
        notes: editingRecord.notes || '',
        updatedAt: new Date().toISOString(),
        updatedBy: user?.displayName || user?.username || 'User'
      }, { merge: true });

      soundFx.playSuccess();
      toast.success(isRtl ? 'تم حفظ التعديل بنجاح وسيتزامن لجميع المستخدمين' : 'Order saved and synced');
      setEditingRecord(null);
    } catch (e) {
      toast.error(isRtl ? 'فشل حفظ التعديل' : 'Failed to save order');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. Header Banner & Google Sheet Sync Controller */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <ShoppingCart size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {isRtl ? 'أوامر البيع والعملاء' : 'Sales Orders & Customers'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  Google Sheets Live
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>{isRtl ? 'متابعة شاملة لأوامر البيع، الصرف للعملاء، الكميات المسحوبة والإيرادات' : 'Track sales orders, dispatches, customer quantities and revenue'}</span>
                {lastSynced && (
                  <span className="text-[11px] text-zinc-400 border-r border-zinc-300 dark:border-zinc-700 pr-2 mr-2">
                    {isRtl ? `آخر مزامنة: ${lastSynced}` : `Synced: ${lastSynced}`}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Live Refresh Button */}
            <button
              onClick={() => fetchData(true)}
              disabled={isSyncing || loading}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isRtl ? 'مزامنة من جوجل شيت' : 'Sync Google Sheet'}</span>
            </button>

            {/* Google Sheet URL Config (Admin & Managers) */}
            <button
              onClick={() => {
                setInputUrl(sheetUrl);
                setShowUrlModal(true);
              }}
              className="px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title={isRtl ? 'تعديل أو فحص رابط شيت أوامر البيع' : 'Edit Google Sheet link'}
            >
              <LinkIcon size={14} />
              <span>{isRtl ? 'رابط الشيت' : 'Sheet URL'}</span>
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              disabled={sortedData.length === 0}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-40"
            >
              <FileSpreadsheet size={15} />
              <span>{isRtl ? 'تصدير إكسيل' : 'Export Excel'}</span>
            </button>
          </div>

        </div>

        {/* View Mode Switcher Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 overflow-x-auto">
          <button
            onClick={() => setActiveView('table')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeView === 'table'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>{isRtl ? 'جدول أوامر البيع' : 'Orders Table'}</span>
            <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px] font-mono">
              {filteredData.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('customers')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeView === 'customers'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isRtl ? 'ملخص العملاء' : 'Customers Summary'}</span>
            <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px] font-mono">
              {customersSummary.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('items')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeView === 'items'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>{isRtl ? 'ملخص الأصناف المباعة' : 'Items Sold'}</span>
            <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px] font-mono">
              {itemsSummary.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeView === 'analytics'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{isRtl ? 'الرسوم البيانية والتحليلات' : 'Visual Analytics'}</span>
          </button>
        </div>

      </div>

      {/* 2. Interactive KPI Statistic Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Tons */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">
            {isRtl ? 'إجمالي المنصرف (طن)' : 'Total Weight (Tons)'}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 dark:text-white">
              {stats.totalTons.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs text-zinc-400 font-bold">{isRtl ? 'طن' : 'Tons'}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            {stats.totalKg.toLocaleString()} {isRtl ? 'كجم' : 'kg'}
          </span>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
            {isRtl ? 'إجمالي المبيعات' : 'Total Revenue'}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-emerald-600/70 font-bold">{isRtl ? 'ج.م' : 'EGP'}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            {isRtl ? 'القيمة الإجمالية' : 'Net Total'}
          </span>
        </div>

        {/* Orders Count */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
            {isRtl ? 'أوامر البيع الفريدة' : 'Unique Orders'}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 dark:text-white">{stats.orderCount}</span>
            <span className="text-xs text-zinc-400 font-bold">{isRtl ? 'أمر' : 'Orders'}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            {stats.movementCount} {isRtl ? 'بند / حركة' : 'Rows'}
          </span>
        </div>

        {/* Unique Customers */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-1">
            {isRtl ? 'العملاء' : 'Active Customers'}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 dark:text-white">{stats.uniqueCustomers}</span>
            <span className="text-xs text-zinc-400 font-bold">{isRtl ? 'عميل' : 'Clients'}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            {isRtl ? 'جهة شراء' : 'Clients count'}
          </span>
        </div>

        {/* Unique Items */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
            {isRtl ? 'الأصناف المباعة' : 'Items Sold'}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-900 dark:text-white">{stats.uniqueItems}</span>
            <span className="text-xs text-zinc-400 font-bold">{isRtl ? 'صنف' : 'Items'}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            {isRtl ? 'تنوع المنتجات' : 'Unique items'}
          </span>
        </div>

        {/* Avg Price per Kg */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
            {isRtl ? 'متوسط سعر الكيلو' : 'Avg Price/Kg'}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              {stats.totalKg > 0 ? (stats.totalRevenue / stats.totalKg).toFixed(1) : '0.0'}
            </span>
            <span className="text-xs text-indigo-400 font-bold">{isRtl ? 'ج.م' : 'EGP'}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            {isRtl ? 'متوسط السعر' : 'Weighted average'}
          </span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 text-zinc-400 ${isRtl ? 'right-3.5' : 'left-3.5'}`} size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isRtl ? 'ابحث برقم أمر البيع، اسم العميل، الصنف، السائق، رقم الإذن...' : 'Search order no, customer, item, driver, doc no...'}
              className={`w-full py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${
                isRtl ? 'pr-10 pl-8' : 'pl-10 pr-8'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer ${
                  isRtl ? 'left-2.5' : 'right-2.5'
                }`}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Date Filter */}
          <div className="md:col-span-4">
            <DateRangeFilter
              value={dateFilter}
              onChange={(newVal) => {
                setDateFilter(newVal);
                setCurrentPage(1);
              }}
              isRtl={isRtl}
              placeholder={isRtl ? 'تصفية بالتاريخ / الفترة' : 'Filter by date range'}
            />
          </div>

          {/* Quick Filters Reset */}
          <div className="md:col-span-3 flex items-center justify-end gap-2">
            {(selectedCustomers.length > 0 || selectedItems.length > 0 || selectedStores.length > 0 || dateFilter.mode !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter({ mode: 'all' });
                  setSelectedCustomers([]);
                  setSelectedItems([]);
                  setSelectedStores([]);
                  setSelectedStatuses([]);
                  setSelectedVarieties([]);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
              >
                <X size={13} />
                <span>{isRtl ? 'مسح الفلاتر' : 'Clear Filters'}</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 4. Active View Content */}
      {loading ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-16 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-zinc-500">
            {isRtl ? 'جاري جلب ومعالجة أوامر البيع من جوجل شيت...' : 'Fetching & processing sales orders from Google Sheet...'}
          </p>
        </div>
      ) : (
        <>
          {/* TAB 1: Main Table View */}
          {activeView === 'table' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
              
              {/* Table Header Info */}
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500">
                  {isRtl ? `عرض ${paginatedData.length} من أصل ${filteredData.length} حركة` : `Showing ${paginatedData.length} of ${filteredData.length} records`}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">{isRtl ? 'الصفوف في الصفحة:' : 'Rows:'}</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Table Element */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 font-black">
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3 text-right bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300">
                        <div className="flex items-center gap-1">
                          <Edit3 size={12} className="text-blue-500" />
                          <span>Sales Order</span>
                        </div>
                      </th>
                      <th className="p-3 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">
                        <div className="flex items-center gap-1">
                          <Edit3 size={12} className="text-amber-500" />
                          <span>Delivery</span>
                        </div>
                      </th>
                      <th className="p-3 text-right bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">
                        <div className="flex items-center gap-1">
                          <Edit3 size={12} className="text-indigo-500" />
                          <span>POST DOCUMENT</span>
                        </div>
                      </th>
                      <th className="p-3 text-right">{isRtl ? 'التاريخ' : 'Date'}</th>
                      <th className="p-3 text-right">{isRtl ? 'العميل' : 'Customer'}</th>
                      <th className="p-3 text-right">{isRtl ? 'الصنف المباع' : 'Item Name'}</th>
                      <th className="p-3 text-right">{isRtl ? 'النوع' : 'Variety'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الكمية (كجم)' : 'Qty (Kg)'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الوزن (طن)' : 'Tons'}</th>
                      <th className="p-3 text-center">{isRtl ? 'السعر (ج.م)' : 'Price'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الإجمالي' : 'Total'}</th>
                      <th className="p-3 text-right">{isRtl ? 'المخزن' : 'Store'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                      <th className="p-3 text-center w-20">{isRtl ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={16} className="p-12 text-center text-zinc-400">
                          {isRtl ? 'لا توجد بيانات مطابقة لمعايير البحث' : 'No records matching search criteria'}
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((row, idx) => {
                        const serial = (currentPage - 1) * rowsPerPage + idx + 1;
                        return (
                          <tr 
                            key={row.id} 
                            className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors group"
                          >
                            <td className="p-3 text-center text-zinc-400 font-mono text-[11px]">{serial}</td>
                            
                            {/* 1. Editable Sales Order */}
                            <td className="p-2.5 bg-blue-50/20 dark:bg-blue-950/10 whitespace-nowrap">
                              {editingCell?.id === row.id && editingCell?.field === 'salesOrder' ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={cellValue}
                                    onChange={(e) => setCellValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleInlineUpdate(row, 'salesOrder', cellValue);
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                    autoFocus
                                    placeholder="Sales Order..."
                                    className="px-2 py-1 bg-white dark:bg-zinc-800 border-2 border-blue-500 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 outline-none w-28 shadow-sm"
                                  />
                                  <button
                                    onClick={() => handleInlineUpdate(row, 'salesOrder', cellValue)}
                                    className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer shadow-xs"
                                    title={isRtl ? 'حفظ' : 'Save'}
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={() => setEditingCell(null)}
                                    className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                    title={isRtl ? 'إلغاء' : 'Cancel'}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  onClick={() => {
                                    setEditingCell({ id: row.id, field: 'salesOrder' });
                                    setCellValue(row.salesOrder || row.orderNo || '');
                                  }}
                                  className="group/cell flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg hover:bg-blue-100/60 dark:hover:bg-blue-900/40 cursor-pointer transition-all border border-transparent hover:border-blue-300 dark:hover:border-blue-700"
                                  title={isRtl ? 'انقر للكتابة أو التعديل' : 'Click to edit Sales Order'}
                                >
                                  <span className="font-mono font-bold text-blue-700 dark:text-blue-300 text-xs">
                                    {row.salesOrder || row.orderNo || '-'}
                                  </span>
                                  <Edit3 size={11} className="text-blue-400 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                </div>
                              )}
                            </td>

                            {/* 2. Editable Delivery */}
                            <td className="p-2.5 bg-amber-50/20 dark:bg-amber-950/10 whitespace-nowrap">
                              {editingCell?.id === row.id && editingCell?.field === 'delivery' ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={cellValue}
                                    onChange={(e) => setCellValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleInlineUpdate(row, 'delivery', cellValue);
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                    autoFocus
                                    placeholder="Delivery..."
                                    className="px-2 py-1 bg-white dark:bg-zinc-800 border-2 border-amber-500 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 outline-none w-28 shadow-sm"
                                  />
                                  <button
                                    onClick={() => handleInlineUpdate(row, 'delivery', cellValue)}
                                    className="p-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 cursor-pointer shadow-xs"
                                    title={isRtl ? 'حفظ' : 'Save'}
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={() => setEditingCell(null)}
                                    className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                    title={isRtl ? 'إلغاء' : 'Cancel'}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  onClick={() => {
                                    setEditingCell({ id: row.id, field: 'delivery' });
                                    setCellValue(row.delivery || '');
                                  }}
                                  className="group/cell flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg hover:bg-amber-100/60 dark:hover:bg-amber-900/40 cursor-pointer transition-all border border-transparent hover:border-amber-300 dark:hover:border-amber-700"
                                  title={isRtl ? 'انقر للكتابة أو التعديل' : 'Click to edit Delivery'}
                                >
                                  {row.delivery ? (
                                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">
                                      {row.delivery}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-zinc-400 italic flex items-center gap-1 group-hover/cell:text-amber-600">
                                      <Plus size={11} />
                                      <span>{isRtl ? 'إضافة' : 'Add'}</span>
                                    </span>
                                  )}
                                  <Edit3 size={11} className="text-amber-400 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                </div>
                              )}
                            </td>

                            {/* 3. Editable POST DOCUMENT */}
                            <td className="p-2.5 bg-indigo-50/20 dark:bg-indigo-950/10 whitespace-nowrap">
                              {editingCell?.id === row.id && editingCell?.field === 'postDocument' ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={cellValue}
                                    onChange={(e) => setCellValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleInlineUpdate(row, 'postDocument', cellValue);
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                    autoFocus
                                    placeholder="POST DOCUMENT..."
                                    className="px-2 py-1 bg-white dark:bg-zinc-800 border-2 border-indigo-500 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 outline-none w-32 shadow-sm"
                                  />
                                  <button
                                    onClick={() => handleInlineUpdate(row, 'postDocument', cellValue)}
                                    className="p-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer shadow-xs"
                                    title={isRtl ? 'حفظ' : 'Save'}
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={() => setEditingCell(null)}
                                    className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                    title={isRtl ? 'إلغاء' : 'Cancel'}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  onClick={() => {
                                    setEditingCell({ id: row.id, field: 'postDocument' });
                                    setCellValue(row.postDocument || '');
                                  }}
                                  className="group/cell flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 cursor-pointer transition-all border border-transparent hover:border-indigo-300 dark:hover:border-indigo-700"
                                  title={isRtl ? 'انقر للكتابة أو التعديل' : 'Click to edit POST DOCUMENT'}
                                >
                                  {row.postDocument ? (
                                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-xs">
                                      {row.postDocument}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-zinc-400 italic flex items-center gap-1 group-hover/cell:text-indigo-600">
                                      <Plus size={11} />
                                      <span>{isRtl ? 'إضافة' : 'Add'}</span>
                                    </span>
                                  )}
                                  <Edit3 size={11} className="text-indigo-400 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                </div>
                              )}
                            </td>

                            {/* Date */}
                            <td className="p-3 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                              {row.date}
                            </td>

                            {/* Customer */}
                            <td className="p-3 font-bold text-zinc-900 dark:text-white max-w-[180px] truncate" title={row.customer}>
                              {row.customer}
                            </td>

                            {/* Item Name */}
                            <td className="p-3 font-medium text-zinc-800 dark:text-zinc-200 max-w-[200px] truncate" title={row.itemName}>
                              <div className="flex flex-col">
                                <span>{row.itemName}</span>
                                {row.itemCode && <span className="text-[10px] text-zinc-400 font-mono">{row.itemCode}</span>}
                              </div>
                            </td>

                            {/* Variety */}
                            <td className="p-3 whitespace-nowrap">
                              <span 
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                                style={{
                                  backgroundColor: `${VARIETY_COLORS[row.variety || 'Other']}20`,
                                  color: VARIETY_COLORS[row.variety || 'Other']
                                }}
                              >
                                {isRtl ? (VARIETY_NAMES_AR[row.variety || 'Other'] || row.variety) : row.variety}
                              </span>
                            </td>

                            {/* Quantity Kg */}
                            <td className="p-3 text-center font-bold font-mono text-zinc-900 dark:text-white">
                              {row.quantityKg.toLocaleString()}
                            </td>

                            {/* Quantity Tons */}
                            <td className="p-3 text-center font-bold font-mono text-blue-600 dark:text-blue-400">
                              {row.quantityTons.toFixed(2)}
                            </td>

                            {/* Unit Price */}
                            <td className="p-3 text-center font-mono text-zinc-600 dark:text-zinc-300">
                              {row.unitPrice ? `${row.unitPrice.toLocaleString()} ${isRtl ? 'ج.م' : 'EGP'}` : '-'}
                            </td>

                            {/* Total Amount */}
                            <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {row.totalAmount ? `${row.totalAmount.toLocaleString()} ${row.currency || 'ج.م'}` : '-'}
                            </td>

                            {/* Store */}
                            <td className="p-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                              {row.store || '-'}
                            </td>

                            {/* Status */}
                            <td className="p-3 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                {row.status || 'معتمد'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setSelectedRecord(row)}
                                  className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
                                  title={isRtl ? 'عرض التفاصيل بالكامل' : 'View full details'}
                                >
                                  <Eye size={14} />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => setEditingRecord(row)}
                                    className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors cursor-pointer"
                                    title={isRtl ? 'تعديل الأمر وحفظه' : 'Edit order'}
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">
                    {isRtl ? `الصفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold disabled:opacity-30 cursor-pointer"
                    >
                      {isRtl ? 'السابق' : 'Previous'}
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold disabled:opacity-30 cursor-pointer"
                    >
                      {isRtl ? 'التالي' : 'Next'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: Customers Summary View */}
          {activeView === 'customers' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                    {isRtl ? 'ملخص مبيعات العملاء' : 'Customer Sales Summary'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {isRtl ? 'إجمالي الكميات والقيم المالية مرتبة تنازلياً حسب الأكثر سحباً' : 'Total weights and values ordered by volume'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                  {customersSummary.length} {isRtl ? 'عميل' : 'Customers'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 font-black">
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3 text-right">{isRtl ? 'اسم العميل' : 'Customer Name'}</th>
                      <th className="p-3 text-center">{isRtl ? 'عدد الأوامر' : 'Orders Count'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الكمية (طن)' : 'Volume (Tons)'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الكمية (كجم)' : 'Volume (Kg)'}</th>
                      <th className="p-3 text-center">{isRtl ? 'إجمالي المبيعات' : 'Total Revenue'}</th>
                      <th className="p-3 text-center">{isRtl ? 'النسبة من الإجمالي' : 'Share %'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {customersSummary.map((c, idx) => {
                      const share = stats.totalKg > 0 ? ((c.totalKg / stats.totalKg) * 100).toFixed(1) : '0';
                      return (
                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="p-3 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="p-3 font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            <Building2 size={14} className="text-blue-500" />
                            <span>{c.customer}</span>
                          </td>
                          <td className="p-3 text-center font-bold text-zinc-600 dark:text-zinc-300 font-mono">{c.count}</td>
                          <td className="p-3 text-center font-black text-blue-600 dark:text-blue-400 font-mono">{c.totalTons.toFixed(2)}</td>
                          <td className="p-3 text-center font-medium font-mono text-zinc-700 dark:text-zinc-300">{c.totalKg.toLocaleString()}</td>
                          <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {c.totalAmount ? `${c.totalAmount.toLocaleString()} ${isRtl ? 'ج.م' : 'EGP'}` : '-'}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                              {share}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Items Sold Summary View */}
          {activeView === 'items' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                    {isRtl ? 'ملخص الأصناف المنصرفة' : 'Items Sold Breakdown'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {isRtl ? 'الكميات المباعة من كل صنف ونوع مصنفة حسب حجم السحب' : 'Quantities sold per item and variety'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600">
                  {itemsSummary.length} {isRtl ? 'صنف' : 'Items'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 font-black">
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3 text-right">{isRtl ? 'اسم الصنف' : 'Item Name'}</th>
                      <th className="p-3 text-right">{isRtl ? 'الكود' : 'Code'}</th>
                      <th className="p-3 text-right">{isRtl ? 'النوع' : 'Variety'}</th>
                      <th className="p-3 text-center">{isRtl ? 'حركات الصرف' : 'Sales Rows'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الوزن (طن)' : 'Weight (Tons)'}</th>
                      <th className="p-3 text-center">{isRtl ? 'الوزن (كجم)' : 'Weight (Kg)'}</th>
                      <th className="p-3 text-center">{isRtl ? 'إجمالي القيمة' : 'Total Revenue'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {itemsSummary.map((item, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="p-3 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-3 font-bold text-zinc-900 dark:text-white">{item.itemName}</td>
                        <td className="p-3 font-mono text-zinc-400">{item.itemCode}</td>
                        <td className="p-3">
                          <span 
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                            style={{
                              backgroundColor: `${VARIETY_COLORS[item.variety || 'Other']}20`,
                              color: VARIETY_COLORS[item.variety || 'Other']
                            }}
                          >
                            {isRtl ? (VARIETY_NAMES_AR[item.variety || 'Other'] || item.variety) : item.variety}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-zinc-600 dark:text-zinc-300 font-mono">{item.count}</td>
                        <td className="p-3 text-center font-black text-amber-600 dark:text-amber-400 font-mono">{item.totalTons.toFixed(2)}</td>
                        <td className="p-3 text-center font-medium font-mono text-zinc-700 dark:text-zinc-300">{item.totalKg.toLocaleString()}</td>
                        <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {item.totalAmount ? `${item.totalAmount.toLocaleString()} ${isRtl ? 'ج.م' : 'EGP'}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Visual Analytics Charts View */}
          {activeView === 'analytics' && (
            <div className="space-y-6">
              
              {/* Top Customers Bar Chart */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                <h3 className="font-black text-sm text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 size={18} className="text-blue-500" />
                  <span>{isRtl ? 'أكبر العملاء حسب حجم السحب (بالطن)' : 'Top Customers by Volume (Tons)'}</span>
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCustomersChart} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="name" angle={-15} textAnchor="end" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-zinc-900 text-white p-3 rounded-xl text-xs shadow-xl space-y-1">
                                <p className="font-bold">{d.fullName}</p>
                                <p className="text-blue-400 font-mono">{d.tons} {isRtl ? 'طن' : 'Tons'} ({d.kg.toLocaleString()} kg)</p>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />
                      <Bar dataKey="tons" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Varieties Distribution Pie Chart */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                <h3 className="font-black text-sm text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <PieChartIcon size={18} className="text-purple-500" />
                  <span>{isRtl ? 'توزيع المبيعات حسب الأصناف والأنواع (طن)' : 'Sales by Variety Distribution (Tons)'}</span>
                </h3>
                <div className="h-72 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={varietyChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {varietyChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* MODAL 1: Google Sheet URL Setup */}
      <AnimatePresence>
        {showUrlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="text-blue-500" size={20} />
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                    {isRtl ? 'إعداد رابط Google Sheet لأوامر البيع' : 'Google Sheet URL Setup'}
                  </h3>
                </div>
                <button onClick={() => setShowUrlModal(false)} className="text-zinc-400 hover:text-zinc-600 p-1">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block">
                  {isRtl ? 'رابط ملف جوجل شيت (رابط النشر أو المشاركة):' : 'Google Sheet Link (Publish to Web or Share URL):'}
                </label>
                <textarea
                  rows={3}
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  {isRtl 
                    ? '💡 يمكنك لصق رابط شيت أوامر البيع وسيقوم النظام تلقائياً بسحب وقراءة البيانات الحية منه.' 
                    : '💡 Paste your Google Sheet URL. The app automatically fetches live data.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setShowUrlModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleSaveSheetUrl}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {isRtl ? 'حفظ وتحديث البيانات' : 'Save & Sync'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Record Details Inspection */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="text-blue-500" size={20} />
                  <div>
                    <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                      {isRtl ? `تفاصيل أمر البيع: ${selectedRecord.orderNo}` : `Order Details: ${selectedRecord.orderNo}`}
                    </h3>
                    <p className="text-[11px] text-zinc-400">{selectedRecord.date}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRecord(null)} className="text-zinc-400 hover:text-zinc-600 p-1">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-bold block">{isRtl ? 'العميل' : 'Customer'}</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{selectedRecord.customer}</span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-bold block">{isRtl ? 'الصنف' : 'Item'}</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{selectedRecord.itemName}</span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-bold block">{isRtl ? 'الكمية (كجم)' : 'Quantity (kg)'}</span>
                  <span className="font-black text-blue-600 font-mono text-sm">{selectedRecord.quantityKg.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-bold block">{isRtl ? 'الوزن (طن)' : 'Weight (Tons)'}</span>
                  <span className="font-black text-blue-600 font-mono text-sm">{selectedRecord.quantityTons.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-bold block">{isRtl ? 'سعر الوحدة' : 'Unit Price'}</span>
                  <span className="font-bold font-mono">{selectedRecord.unitPrice ? `${selectedRecord.unitPrice} ${selectedRecord.currency}` : '-'}</span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-bold block">{isRtl ? 'إجمالي القيمة' : 'Total Value'}</span>
                  <span className="font-black font-mono text-emerald-600 text-sm">
                    {selectedRecord.totalAmount ? `${selectedRecord.totalAmount.toLocaleString()} ${selectedRecord.currency}` : '-'}
                  </span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-bold block">{isRtl ? 'المخزن' : 'Store'}</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{selectedRecord.store || '-'}</span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-bold block">{isRtl ? 'السيارة والسائق' : 'Truck & Driver'}</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {selectedRecord.truckNo || '-'} {selectedRecord.driver ? `(${selectedRecord.driver})` : ''}
                  </span>
                </div>
              </div>

              {selectedRecord.notes && (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block">{isRtl ? 'ملاحظات' : 'Notes'}</span>
                  <p className="text-zinc-700 dark:text-zinc-300">{selectedRecord.notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isRtl ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Edit Order Form (Admin only) */}
      <AnimatePresence>
        {editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Edit3 className="text-amber-500" size={20} />
                  <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                    {isRtl ? 'تعديل بيانات أمر البيع' : 'Edit Sales Order'}
                  </h3>
                </div>
                <button onClick={() => setEditingRecord(null)} className="text-zinc-400 hover:text-zinc-600 p-1">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold text-blue-600 dark:text-blue-400 block mb-1">Sales Order</label>
                    <input
                      type="text"
                      value={editingRecord.salesOrder || editingRecord.orderNo || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, salesOrder: e.target.value, orderNo: e.target.value })}
                      className="w-full p-2 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-amber-600 dark:text-amber-400 block mb-1">Delivery</label>
                    <input
                      type="text"
                      value={editingRecord.delivery || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, delivery: e.target.value })}
                      placeholder="Delivery..."
                      className="w-full p-2 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">POST DOCUMENT</label>
                    <input
                      type="text"
                      value={editingRecord.postDocument || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, postDocument: e.target.value })}
                      placeholder="Doc No..."
                      className="w-full p-2 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-zinc-500 block mb-1">{isRtl ? 'اسم العميل' : 'Customer'}</label>
                  <input
                    type="text"
                    value={editingRecord.customer}
                    onChange={(e) => setEditingRecord({ ...editingRecord, customer: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-500 block mb-1">{isRtl ? 'اسم الصنف' : 'Item Name'}</label>
                  <input
                    type="text"
                    value={editingRecord.itemName}
                    onChange={(e) => setEditingRecord({ ...editingRecord, itemName: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-zinc-500 block mb-1">{isRtl ? 'الكمية (كجم)' : 'Qty (Kg)'}</label>
                    <input
                      type="number"
                      value={editingRecord.quantityKg}
                      onChange={(e) => setEditingRecord({ ...editingRecord, quantityKg: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-500 block mb-1">{isRtl ? 'السعر (ج.م)' : 'Price'}</label>
                    <input
                      type="number"
                      value={editingRecord.unitPrice || 0}
                      onChange={(e) => setEditingRecord({ ...editingRecord, unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-zinc-500 block mb-1">{isRtl ? 'المخزن' : 'Store'}</label>
                  <input
                    type="text"
                    value={editingRecord.store || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, store: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-500 block mb-1">{isRtl ? 'ملاحظات' : 'Notes'}</label>
                  <textarea
                    rows={2}
                    value={editingRecord.notes || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-amber-500/20"
                >
                  {isRtl ? 'حفظ التعديل' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cylinder, 
  Search, 
  RefreshCw, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  FileSpreadsheet, 
  Layers, 
  Calendar, 
  Truck, 
  TrendingUp, 
  TrendingDown,
  User, 
  Users, 
  ExternalLink, 
  Filter, 
  ArrowRight, 
  Boxes, 
  Info, 
  CheckCircle2, 
  Link as LinkIcon,
  ArrowUpDown,
  History,
  Scale,
  FileText,
  AlertCircle,
  Check
} from 'lucide-react';
import { Language, UserProfile } from '../types';
import { toast } from 'sonner';
import { 
  subscribeToSharedSheetUrl, 
  saveSharedSheetUrl, 
  convertToCsvUrl,
  SheetMetadata 
} from '../utils/sharedSheetConfig';
import { normalizeArabicSearch, matchesArabicSearch } from '../utils/arabic';

export const DEFAULT_BARRELS_SHEET_URL = "";

/**
 * Validates whether a given URL is a legacy broken placeholder or corrupted export URL
 */
export function isInvalidBarrelsPlaceholder(url?: string | null): boolean {
  if (!url || !url.trim()) return true;
  const clean = url.trim();
  // Any corrupted URL matching the /d/e/export bug or /d/e?
  if (clean.includes('/spreadsheets/d/e/export') || clean.includes('/spreadsheets/d/e?')) {
    return true;
  }
  // Any broken placeholder pointing to olive stock spreadsheet with gid=0 or invalid gid
  if (clean.includes('2PACX-1vTOGkYpf6hSa20PDIE2BxZ0ClH7vXd9aA7yrAOxO4nN-afVgi8RdqY8EDbzD_hRHR9A8kYr34RRndv3') && (clean.includes('gid=0') || clean.includes('gid=527869852'))) {
    return true;
  }
  // Needs to be a valid HTTP URL
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    return true;
  }
  return false;
}

const STORAGE_CACHE_KEY = "barrels_data_cache";
const STORAGE_TIME_KEY = "barrels_last_synced";
const STORAGE_URL_KEY = "barrels_sheet_url";

export interface BarrelMovementRecord {
  id: string;
  rowNumber: number;
  date: string;
  store?: string;        // المخزن (GPS / richland ...)
  customerName: string;
  movementType: 'صرف' | 'إضافة' | string;
  dispatchedQty: number; // كمية الصرف
  addedQty: number;      // كمية الإضافة
  quantity: number;      // كمية الحركة
  balance?: number;      // الرصيد
  barrelType: string;    // نوع البرميل
  docNumber: string;     // رقم الإذن
  driverName: string;    // السائق
  carNumber: string;     // رقم السيارة
  notes: string;         // ملاحظات
  rawRow: Record<string, any>;
}

export interface CustomerBalanceSummary {
  customerName: string;
  totalDispatched: number; // إجمالي المنصرف (صرف)
  totalAdded: number;      // إجمالي المضاف (إضافة / مرتجع)
  netBalance: number;      // الرصيد الحالي = الصرف - الإضافة (المتبقي لدى العميل)
  movementsCount: number;  // عدد الحركات
  lastDate: string;        // تاريخ آخر حركة
  barrelTypesSummary: Record<string, { dispatched: number; added: number; balance: number }>;
}

interface BarrelsProps {
  lang: Language;
  user?: UserProfile | null;
}

export default function Barrels({ lang, user }: BarrelsProps) {
  const isRtl = lang === 'ar';
  const isAdmin = user?.role === 'Admin' || (user?.roles && user.roles.includes('Admin'));

  // State
  const [data, setData] = useState<BarrelMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>('');
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_URL_KEY);
      if (saved && !isInvalidBarrelsPlaceholder(saved)) {
        return saved.trim();
      }
      try { localStorage.removeItem(STORAGE_URL_KEY); } catch (e) {}
      return '';
    } catch {
      return '';
    }
  });
  const [sheetMetadata, setSheetMetadata] = useState<SheetMetadata | undefined>();
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);

  // Active View Tab: 'movements' | 'customers'
  const [activeSubTab, setActiveSubTab] = useState<'customers' | 'movements'>('customers');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedMovementTypes, setSelectedMovementTypes] = useState<string[]>([]);
  const [selectedBarrelTypes, setSelectedBarrelTypes] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'has_balance' | 'zero' | 'negative'>('all');

  // Customer Statement Modal
  const [statementCustomer, setStatementCustomer] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'customerName' | 'quantity' | 'netBalance'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 1. Real-time shared sheet URL subscription via Firestore
  useEffect(() => {
    const unsubscribe = subscribeToSharedSheetUrl(
      'barrels_sheet_config',
      DEFAULT_BARRELS_SHEET_URL,
      STORAGE_URL_KEY,
      (url, metadata) => {
        if (!isInvalidBarrelsPlaceholder(url)) {
          setSheetUrl(url);
          setNewUrlInput(url);
        } else {
          setSheetUrl('');
          setNewUrlInput('');
          try { localStorage.removeItem(STORAGE_URL_KEY); } catch (e) {}
        }
        if (metadata) setSheetMetadata(metadata);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Load cached data or demo data on mount
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_CACHE_KEY);
    const lastTime = localStorage.getItem(STORAGE_TIME_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setData(parsed);
          setLoading(false);
        }
      } catch (e) {
        console.warn("Failed to parse cached barrels data", e);
      }
    }
    if (lastTime) {
      setLastSynced(lastTime);
    }
  }, []);

  // 3. Fetch data from Google Sheet
  const fetchData = async (targetUrl?: string, isManualRefresh = false) => {
    const urlToFetch = targetUrl !== undefined ? targetUrl : sheetUrl;
    if (!urlToFetch || isInvalidBarrelsPlaceholder(urlToFetch)) {
      if (isManualRefresh) {
        toast.info(isRtl ? 'يرجى ربط شيت جوجل أولاً من زر (رابط الشيت) بالأعلى لمزامنة البيانات' : 'Please link a Google Sheet first using the (Sheet URL) button');
      }
      if (data.length === 0) {
        const cached = localStorage.getItem(STORAGE_CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setData(parsed);
              setLoading(false);
              setRefreshing(false);
              return;
            }
          } catch (e) {}
        }
        setData(generateDemoBarrelData());
      }
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    let toastId: string | number | undefined;
    if (isManualRefresh) {
      toastId = toast.loading(isRtl ? 'جاري جلب بيانات البراميل من شيت جوجل...' : 'Fetching barrels data from Google Sheet...');
    }

    try {
      const csvUrl = convertToCsvUrl(urlToFetch);
      if (!csvUrl || isInvalidBarrelsPlaceholder(csvUrl)) {
        if (data.length === 0) {
          setData(generateDemoBarrelData());
        }
        if (isManualRefresh && toastId) {
          toast.warning(isRtl ? 'الرابط المحدد غير صالح أو غير معرّف بشكل سليم' : 'Invalid Google Sheet URL', { id: toastId });
        }
        return;
      }

      let csvText = '';

      // Try internal proxy first to avoid CORS issues
      try {
        const baseUrl = window.location.origin ? window.location.origin.replace(/\/$/, '') : '';
        const proxyUrl = `${baseUrl}/api/proxy-sheet?url=${encodeURIComponent(csvUrl)}&t=${Date.now()}`;
        const proxyResp = await fetch(proxyUrl);
        if (proxyResp.ok) {
          csvText = await proxyResp.text();
        } else {
          console.warn(`Proxy fetch returned status ${proxyResp.status}`);
        }
      } catch (proxyErr) {
        console.warn('Proxy fetch failed, falling back to direct fetch', proxyErr);
      }

      // Direct fallback
      if (!csvText) {
        try {
          const directResp = await fetch(`${csvUrl}${csvUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
          if (directResp.ok) {
            csvText = await directResp.text();
          } else {
            console.warn(`Direct fetch returned status ${directResp.status}`);
          }
        } catch (directErr) {
          console.warn('Direct fetch attempt failed:', directErr);
        }
      }

      // Fallback without single=true if applicable
      if (!csvText && csvUrl.includes('&single=true')) {
        try {
          const altUrl = csvUrl.replace('&single=true', '');
          const altResp = await fetch(altUrl);
          if (altResp.ok) {
            csvText = await altResp.text();
          }
        } catch (altErr) {
          console.warn('Alternative fetch without single=true failed:', altErr);
        }
      }

      if (csvText && csvText.trim()) {
        // Parse with PapaParse
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rawRows = results.data as Record<string, any>[];
            const parsedMovements = parseBarrelRows(rawRows);

            if (parsedMovements.length > 0) {
              setData(parsedMovements);
              setLoading(false);
              setRefreshing(false);

              const nowStr = new Date().toLocaleString(isRtl ? 'ar-EG' : 'en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
              });
              setLastSynced(nowStr);
              try {
                localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(parsedMovements));
                localStorage.setItem(STORAGE_TIME_KEY, nowStr);
              } catch (e) {}

              if (toastId) {
                toast.success(
                  isRtl 
                    ? `تم تحديث بيانات البراميل بنجاح (${parsedMovements.length} حركة)` 
                    : `Barrels data updated successfully (${parsedMovements.length} records)`,
                  { id: toastId }
                );
              }
            } else {
              if (toastId) {
                toast.info(isRtl ? 'تم الاتصال بالشيت بنجاح ولكن لم يتم العثور على حركات مسجلة' : 'Sheet connected, but no records found', { id: toastId });
              }
              setLoading(false);
              setRefreshing(false);
            }
          },
          error: (err: any) => {
            console.warn("Papa parse warning:", err);
            if (toastId) {
              toast.error(isRtl ? 'حدث خطأ أثناء معالجة بيانات الشيت' : 'Error parsing sheet CSV', { id: toastId });
            }
            setRefreshing(false);
            setLoading(false);
          }
        });
        return;
      }

      // If we reach here, neither proxy nor direct fetch succeeded
      console.warn("Could not fetch barrels sheet data from URL:", csvUrl);
      if (data.length === 0) {
        const demoData = generateDemoBarrelData();
        setData(demoData);
      }
      if (isManualRefresh && toastId) {
        toast.warning(isRtl ? 'تعذر الاتصال بشيت جوجل. تم الإبقاء على البيانات المخزنة.' : 'Failed to reach Google Sheet. Kept cached data.', { id: toastId });
      }
    } catch (err: any) {
      console.warn("Fetch barrels sheet warning:", err);
      if (data.length === 0) {
        const demoData = generateDemoBarrelData();
        setData(demoData);
      }
      if (isManualRefresh && toastId) {
        toast.warning(isRtl ? 'تعذر الاتصال بشيت جوجل. يرجى التحقق من الرابط.' : 'Failed to reach Google Sheet.', { id: toastId });
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sheetUrl && !isInvalidBarrelsPlaceholder(sheetUrl)) {
      fetchData(sheetUrl, false);
    } else {
      if (data.length === 0) {
        const cached = localStorage.getItem(STORAGE_CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setData(parsed);
              setLoading(false);
              return;
            }
          } catch (e) {}
        }
        setData(generateDemoBarrelData());
      }
      setLoading(false);
    }
  }, [sheetUrl]);

  // Helper to normalize dates into YYYY-MM-DD
  const normalizeDate = (raw: string): string => {
    if (!raw) return '';
    const trimmed = raw.trim();
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    const slashParts = trimmed.split('/');
    if (slashParts.length === 3) {
      let [m, d, y] = slashParts;
      if (y.length === 2) y = '20' + y;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return trimmed;
  };

  // Intelligent column header mapper
  const parseBarrelRows = (rows: Record<string, any>[]): BarrelMovementRecord[] => {
    if (!rows || rows.length === 0) return [];

    return rows.map((row, index) => {
      // Find keys ignoring case, spaces, and Arabic diacritics
      const keys = Object.keys(row);
      const findKey = (...synonyms: string[]) => {
        return keys.find(k => {
          const norm = k.toLowerCase().replace(/[\s_\-/\\]/g, '');
          return synonyms.some(syn => norm.includes(syn.toLowerCase().replace(/[\s_\-/\\]/g, '')));
        });
      };

      const dateKey = findKey('تاريخ', 'التاريخ', 'date');
      const storeKey = findKey('المخزن', 'مخزن', 'store', 'warehouse');
      const customerKey = findKey('اسم المورد', 'المورد', 'عميل', 'العميل', 'اسم العميل', 'التاجر', 'الجهة', 'customer', 'client');
      const tasweyaKey = findKey('تسوية', 'تسويات', 'ملاحظات تسوية');
      const typeKey = findKey('نوع الحركة', 'الحركة', 'نوع الاذن', 'صرف / اضافة', 'type', 'movement');
      const dispatchKey = findKey('صرف', 'صادر', 'تسليم', 'كمية الصرف', 'منصرف', 'dispatch', 'out');
      const addKey = findKey('اضافة', 'إضافة', 'وارد', 'مرتجع', 'ارتجاع', 'استلام', 'كمية الاضافة', 'مضاف', 'addition', 'in', 'return');
      const openingKey = findKey('رصيد اول', 'رصيد أول', 'افتتاحي', 'opening');
      const qtyKey = findKey('كمية', 'الكمية', 'عدد البراميل', 'العدد', 'qty', 'quantity');
      const barrelTypeKey = findKey('نوع تانك / برميل', 'نوع البرميل', 'البرميل', 'نوع البستلة', 'barrel');
      const itemKey = findKey('اسم الصنف', 'الصنف', 'item');
      const unitKey = findKey('الوحدة', 'وحدة', 'unit');
      const docKey = findKey('رقم الحركة', 'رقم الاذن', 'كود الاذن', 'رقم السند', 'اذن', 'doc', 'ref', 'no');
      const postDocKey = findKey('POST DOCUMENT', 'postdoc', 'document', 'reservation');
      const driverKey = findKey('سائق', 'السائق', 'اسم السائق', 'driver');
      const carKey = findKey('سيارة', 'السيارة', 'رقم السيارة', 'truck', 'car');
      const notesKey = findKey('ملاحظات', 'البيان', 'notes', 'remarks');
      const balanceKey = findKey('رصيد', 'الرصيد', 'رصيد العميل', 'balance');

      const rawDate = dateKey && row[dateKey] ? normalizeDate(String(row[dateKey]).trim()) : '';
      const rawStore = storeKey && row[storeKey] ? String(row[storeKey]).trim() : '';

      // Smart Customer Name Extraction:
      // Handles shifted columns where customer was entered in "تسوية" or supplier is "عدد" or empty
      const directCustomer = customerKey && row[customerKey] ? String(row[customerKey]).trim() : '';
      const tasweyaVal = tasweyaKey && row[tasweyaKey] ? String(row[tasweyaKey]).trim() : '';
      let rawCustomer = directCustomer;
      if (!rawCustomer || rawCustomer === 'عدد' || rawCustomer === 'لاغى') {
        if (tasweyaVal && tasweyaVal !== 'لاغى' && tasweyaVal !== 'عدد') {
          rawCustomer = tasweyaVal;
        } else if (rawCustomer !== 'عدد' && rawCustomer !== 'لاغى') {
          rawCustomer = directCustomer;
        }
      }
      if (!rawCustomer) {
        rawCustomer = isRtl ? 'عميل غير محدد' : 'Unspecified Customer';
      }

      // Smart Barrel Type Extraction:
      const directBarrelType = barrelTypeKey && row[barrelTypeKey] ? String(row[barrelTypeKey]).trim() : '';
      const itemVal = itemKey && row[itemKey] ? String(row[itemKey]).trim() : '';
      const unitVal = unitKey && row[unitKey] ? String(row[unitKey]).trim() : '';
      let resolvedBarrelType = '';
      if (directBarrelType && directBarrelType !== 'برميل' && !/^\d+$/.test(directBarrelType)) {
        resolvedBarrelType = directBarrelType;
      } else if (itemVal && itemVal.includes('برميل')) {
        resolvedBarrelType = itemVal;
      } else if (unitVal && unitVal.includes('برميل')) {
        resolvedBarrelType = unitVal;
      } else if (itemVal && isNaN(Number(itemVal))) {
        resolvedBarrelType = itemVal;
      } else if (directBarrelType) {
        resolvedBarrelType = directBarrelType;
      } else {
        resolvedBarrelType = isRtl ? 'برميل 220 لتر' : 'Barrel 220L';
      }

      const cleanNum = (val: any) => {
        if (!val) return 0;
        const cleaned = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
        const n = parseFloat(cleaned);
        return isNaN(n) ? 0 : n;
      };

      const explicitDispatch = dispatchKey ? cleanNum(row[dispatchKey]) : 0;
      const explicitAdd = addKey ? cleanNum(row[addKey]) : 0;
      const openingQty = openingKey ? cleanNum(row[openingKey]) : 0;
      const rawQty = qtyKey ? cleanNum(row[qtyKey]) : 0;
      const rawType = typeKey && row[typeKey] ? String(row[typeKey]).trim() : '';
      const normType = (rawType || '').toLowerCase();
      const isAddType = normType.includes('اضاف') || normType.includes('إضاف') || normType.includes('وارد') || normType.includes('ارتجاع') || normType.includes('مرتجع') || normType.includes('استلام') || normType.includes('in') || normType.includes('add') || normType.includes('return');
      const isDispatchType = normType.includes('صرف') || normType.includes('صادر') || normType.includes('تسليم') || normType.includes('خروج') || normType.includes('out') || normType.includes('dispatch') || normType.includes('issue');

      let dispatchedQty = 0;
      let addedQty = 0;
      let movementType: 'صرف' | 'إضافة' = 'صرف';

      if (explicitDispatch > 0 || explicitAdd > 0) {
        dispatchedQty = explicitDispatch;
        addedQty = explicitAdd;
        movementType = dispatchedQty > 0 && addedQty === 0 ? 'صرف' : (addedQty > 0 && dispatchedQty === 0 ? 'إضافة' : (dispatchedQty >= addedQty ? 'صرف' : 'إضافة'));
      } else if (openingQty > 0) {
        addedQty = openingQty;
        movementType = 'إضافة';
      } else if (isAddType) {
        addedQty = rawQty;
        movementType = 'إضافة';
      } else if (isDispatchType) {
        dispatchedQty = rawQty;
        movementType = 'صرف';
      } else if (rawQty !== 0) {
        if (rawQty < 0) {
          addedQty = Math.abs(rawQty);
          movementType = 'إضافة';
        } else {
          dispatchedQty = rawQty;
          movementType = 'صرف';
        }
      }

      const totalQuantity = dispatchedQty > 0 ? dispatchedQty : addedQty;
      const rawDoc = (docKey && row[docKey] ? String(row[docKey]).trim() : '') ||
                     (postDocKey && row[postDocKey] ? String(row[postDocKey]).trim() : '') ||
                     `#${index + 1}`;

      return {
        id: `barrel-row-${index + 1}`,
        rowNumber: index + 1,
        date: rawDate,
        store: rawStore,
        customerName: rawCustomer,
        movementType,
        dispatchedQty,
        addedQty,
        quantity: totalQuantity,
        balance: balanceKey ? cleanNum(row[balanceKey]) : undefined,
        barrelType: resolvedBarrelType,
        docNumber: rawDoc,
        driverName: driverKey && row[driverKey] ? String(row[driverKey]).trim() : '—',
        carNumber: carKey && row[carKey] ? String(row[carKey]).trim() : '—',
        notes: notesKey && row[notesKey] ? String(row[notesKey]).trim() : '',
        rawRow: row
      };
    }).filter(r => {
      // Keep all rows with actual movements or positive quantities
      return (r.dispatchedQty > 0 || r.addedQty > 0 || r.quantity > 0);
    });
  };

  // Generate realistic demo data if sheet is empty or inaccessible
  const generateDemoBarrelData = (): BarrelMovementRecord[] => {
    const demoCustomers = [
      'مخللات الأمانة',
      'شركة الأهرام للتصنيع الغذائي',
      'شركة التوحيد للتعبئة والتوزيع',
      'مصنع النيل للمنتجات الزراعية',
      'طيبة للمواد الغذائية',
      'البركة لتصنيع وتصدير الزيتون',
      'الهدى للحاصلات الزراعية'
    ];
    const demoBarrelTypes = ['برميل بلاستيك أزرق 220 لتر', 'برميل صاج 200 لتر', 'برميل سنابل', 'برميل وطنية'];
    const demoDrivers = ['أحمد محمود', 'محمد علي', 'إبراهيم حسن', 'محمود سعيد', 'كريم عبد الله'];

    const records: BarrelMovementRecord[] = [];
    const today = new Date();

    for (let i = 1; i <= 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - Math.floor(i / 2));
      const dateStr = d.toISOString().slice(0, 10);
      const customer = demoCustomers[i % demoCustomers.length];
      const isDispatch = i % 3 !== 0; // 2 out of 3 are dispatch
      const qty = Math.floor(Math.random() * 80) + 10;
      const bType = demoBarrelTypes[i % demoBarrelTypes.length];
      const driver = demoDrivers[i % demoDrivers.length];

      records.push({
        id: `demo-row-${i}`,
        rowNumber: i,
        date: dateStr,
        customerName: customer,
        movementType: isDispatch ? 'صرف' : 'إضافة',
        dispatchedQty: isDispatch ? qty : 0,
        addedQty: isDispatch ? 0 : qty,
        quantity: qty,
        barrelType: bType,
        docNumber: `DN-${1000 + i}`,
        driverName: driver,
        carNumber: `أ ب ج ${123 + (i % 50)}`,
        notes: isDispatch ? 'تسليم براميل تشغيل زيتون' : 'ارتجاع براميل فارغة بحالة جيدة',
        rawRow: {}
      });
    }

    return records;
  };

  // Handle saving new Google Sheet URL
  const handleSaveUrl = async () => {
    const raw = newUrlInput.trim();
    if (!raw) {
      toast.error(isRtl ? 'يرجى إدخال رابط صالح' : 'Please enter a valid URL');
      return;
    }

    if (isInvalidBarrelsPlaceholder(raw)) {
      toast.error(isRtl ? 'الرابط المدخل غير صالح. يرجى إدخال رابط شيت جوجل منشور للويب أو رابط تصدير CSV.' : 'Invalid URL. Please enter a valid Google Sheet or CSV link.');
      return;
    }

    const converted = convertToCsvUrl(raw);
    if (!converted || isInvalidBarrelsPlaceholder(converted)) {
      toast.error(isRtl ? 'تعذر التعرف على الرابط بشكل سليم. يرجى التأكد من نسخه بالكامل.' : 'Could not process sheet URL.');
      return;
    }

    setSavingUrl(true);
    try {
      await saveSharedSheetUrl('barrels_sheet_config', converted, STORAGE_URL_KEY, user ? { displayName: user.displayName, username: user.username || user.email } : null);
      setSheetUrl(converted);
      setIsUrlModalOpen(false);
      toast.success(isRtl ? 'تم حفظ وتعميم رابط شيت البراميل على جميع المستخدمين' : 'Barrels sheet URL updated and shared with all users');
      fetchData(converted, true);
    } catch (e) {
      console.warn("Failed to save sheet URL", e);
      toast.error(isRtl ? 'حدث خطأ أثناء حفظ الرابط' : 'Failed to save URL');
    } finally {
      setSavingUrl(false);
    }
  };

  // Handle clearing / resetting the Google Sheet URL
  const handleClearUrl = async () => {
    setSavingUrl(true);
    try {
      await saveSharedSheetUrl('barrels_sheet_config', '', STORAGE_URL_KEY, user ? { displayName: user.displayName, username: user.username || user.email } : null);
      try { localStorage.removeItem(STORAGE_URL_KEY); } catch (e) {}
      setSheetUrl('');
      setNewUrlInput('');
      setIsUrlModalOpen(false);
      setData(generateDemoBarrelData());
      toast.success(isRtl ? 'تم إزالة الرابط والعودة للبيانات الافتراضية' : 'Sheet URL removed. Reverted to default preview.');
    } catch (e) {
      console.warn("Failed to clear sheet URL", e);
      toast.error(isRtl ? 'حدث خطأ أثناء إزالة الرابط' : 'Failed to clear URL');
    } finally {
      setSavingUrl(false);
    }
  };

  // Compute Customer Balances Summaries (رصيد العملاء: صرف - إضافة - رصيد)
  const customerSummaries = useMemo<CustomerBalanceSummary[]>(() => {
    const map = new Map<string, {
      dispatched: number;
      added: number;
      count: number;
      dates: string[];
      types: Record<string, { dispatched: number; added: number; balance: number }>;
    }>();

    data.forEach(m => {
      if (selectedStores.length > 0 && m.store && !selectedStores.includes(m.store)) return;
      if (selectedDates.length > 0 && m.date && !selectedDates.includes(m.date)) return;
      if (selectedCustomers.length > 0 && !selectedCustomers.includes(m.customerName)) return;

      const name = m.customerName.trim();
      if (!map.has(name)) {
        map.set(name, {
          dispatched: 0,
          added: 0,
          count: 0,
          dates: [],
          types: {}
        });
      }

      const entry = map.get(name)!;
      entry.dispatched += m.dispatchedQty;
      entry.added += m.addedQty;
      entry.count += 1;
      if (m.date) entry.dates.push(m.date);

      const bType = m.barrelType || 'قياسي';
      if (!entry.types[bType]) {
        entry.types[bType] = { dispatched: 0, added: 0, balance: 0 };
      }
      entry.types[bType].dispatched += m.dispatchedQty;
      entry.types[bType].added += m.addedQty;
      entry.types[bType].balance = entry.types[bType].dispatched - entry.types[bType].added;
    });

    const summaries: CustomerBalanceSummary[] = [];
    map.forEach((val, customerName) => {
      // Net Balance = Total Dispatched - Total Added (Remaining with customer)
      const netBalance = val.dispatched - val.added;
      const sortedDates = [...val.dates].sort().reverse();
      const lastDate = sortedDates[0] || '—';

      summaries.push({
        customerName,
        totalDispatched: val.dispatched,
        totalAdded: val.added,
        netBalance,
        movementsCount: val.count,
        lastDate,
        barrelTypesSummary: val.types
      });
    });

    // Default sort by net balance descending (highest outstanding barrels first)
    return summaries.sort((a, b) => b.netBalance - a.netBalance);
  }, [data, selectedStores, selectedDates, selectedCustomers]);

  // Overall KPI Statistics (إجمالي الحركات)
  const totalStats = useMemo(() => {
    let totalDispatched = 0;
    let totalAdded = 0;
    let dispatchMovements = 0;
    let addMovements = 0;

    data.forEach(m => {
      if (selectedStores.length > 0 && m.store && !selectedStores.includes(m.store)) return;
      if (selectedDates.length > 0 && m.date && !selectedDates.includes(m.date)) return;
      if (selectedCustomers.length > 0 && !selectedCustomers.includes(m.customerName)) return;

      totalDispatched += m.dispatchedQty;
      totalAdded += m.addedQty;
      if (m.dispatchedQty > 0) dispatchMovements++;
      if (m.addedQty > 0) addMovements++;
    });

    const netCustomerBalance = totalDispatched - totalAdded;
    const totalTransactions = dispatchMovements + addMovements;
    const uniqueCustomersCount = customerSummaries.length;

    return {
      totalDispatched,
      totalAdded,
      netCustomerBalance,
      dispatchMovements,
      addMovements,
      totalTransactions,
      uniqueCustomersCount
    };
  }, [data, customerSummaries, selectedStores, selectedDates, selectedCustomers]);

  // Distinct lists for dropdowns
  const uniqueCustomersList = useMemo(() => {
    return Array.from(new Set(data.map(d => d.customerName))).filter(Boolean).sort();
  }, [data]);

  const uniqueBarrelTypesList = useMemo(() => {
    return Array.from(new Set(data.map(d => d.barrelType))).filter(Boolean).sort();
  }, [data]);

  const uniqueStoresList = useMemo(() => {
    return Array.from(new Set(data.map(d => d.store).filter(Boolean))) as string[];
  }, [data]);

  const uniqueDatesList = useMemo(() => {
    return Array.from(new Set(data.map(d => d.date).filter(Boolean))).sort().reverse();
  }, [data]);

  const uniqueMovementTypesList = ['صرف', 'إضافة'];

  // Filtered Customer Summaries (for the Customers tab)
  const filteredCustomerSummaries = useMemo(() => {
    return customerSummaries.filter(c => {
      const matchSearch = !searchTerm.trim() || 
        matchesArabicSearch(c.customerName, searchTerm) || 
        c.customerName.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (balanceFilter === 'has_balance' && c.netBalance <= 0) return false;
      if (balanceFilter === 'zero' && c.netBalance !== 0) return false;
      if (balanceFilter === 'negative' && c.netBalance >= 0) return false;

      return true;
    });
  }, [customerSummaries, searchTerm, balanceFilter]);

  // Filtered Detailed Movements Log (for the Movements tab)
  const filteredMovements = useMemo(() => {
    return data.filter(m => {
      const matchSearch = !searchTerm.trim() || 
        matchesArabicSearch(m.customerName, searchTerm) || 
        matchesArabicSearch(m.docNumber, searchTerm) || 
        matchesArabicSearch(m.driverName, searchTerm) || 
        matchesArabicSearch(m.carNumber, searchTerm) || 
        matchesArabicSearch(m.notes, searchTerm) ||
        (m.store && matchesArabicSearch(m.store, searchTerm)) ||
        m.customerName.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (selectedCustomers.length > 0 && !selectedCustomers.includes(m.customerName)) return false;
      if (selectedMovementTypes.length > 0 && !selectedMovementTypes.includes(m.movementType)) return false;
      if (selectedBarrelTypes.length > 0 && !selectedBarrelTypes.includes(m.barrelType)) return false;
      if (selectedStores.length > 0 && m.store && !selectedStores.includes(m.store)) return false;
      if (selectedDates.length > 0 && m.date && !selectedDates.includes(m.date)) return false;

      if (dateFrom && m.date && m.date < dateFrom) return false;
      if (dateTo && m.date && m.date > dateTo) return false;

      return true;
    }).sort((a, b) => {
      if (sortField === 'date') {
        const diff = (a.date || '').localeCompare(b.date || '');
        return sortDirection === 'asc' ? diff : -diff;
      }
      if (sortField === 'customerName') {
        const diff = a.customerName.localeCompare(b.customerName);
        return sortDirection === 'asc' ? diff : -diff;
      }
      if (sortField === 'quantity') {
        const diff = a.quantity - b.quantity;
        return sortDirection === 'asc' ? diff : -diff;
      }
      return 0;
    });
  }, [data, searchTerm, selectedCustomers, selectedMovementTypes, selectedBarrelTypes, selectedStores, selectedDates, dateFrom, dateTo, sortField, sortDirection]);

  // Paginated movements
  const paginatedMovements = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredMovements.slice(startIndex, startIndex + pageSize);
  }, [filteredMovements, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredMovements.length / pageSize) || 1;

  // Statement for selected customer modal
  const customerStatementMovements = useMemo(() => {
    if (!statementCustomer) return [];
    return data
      .filter(m => m.customerName === statementCustomer)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [data, statementCustomer]);

  const customerStatementTotals = useMemo(() => {
    if (!statementCustomer) return { dispatched: 0, added: 0, balance: 0 };
    const found = customerSummaries.find(c => c.customerName === statementCustomer);
    if (!found) return { dispatched: 0, added: 0, balance: 0 };
    return {
      dispatched: found.totalDispatched,
      added: found.totalAdded,
      balance: found.netBalance
    };
  }, [statementCustomer, customerSummaries]);

  // Export to Excel: Customer Balances
  const handleExportCustomerBalances = () => {
    if (filteredCustomerSummaries.length === 0) {
      toast.error(isRtl ? 'لا توجد بيانات لتصديرها' : 'No data to export');
      return;
    }

    const rows = filteredCustomerSummaries.map((c, i) => ({
      [isRtl ? 'م' : 'No']: i + 1,
      [isRtl ? 'اسم العميل' : 'Customer Name']: c.customerName,
      [isRtl ? 'إجمالي الصرف (برميل)' : 'Total Dispatched']: c.totalDispatched,
      [isRtl ? 'إجمالي الإضافة (برميل)' : 'Total Added']: c.totalAdded,
      [isRtl ? 'صافي الرصيد الحالي (مستحق)' : 'Net Current Balance']: c.netBalance,
      [isRtl ? 'عدد الحركات' : 'Movements Count']: c.movementsCount,
      [isRtl ? 'تاريخ آخر حركة' : 'Last Movement Date']: c.lastDate,
      [isRtl ? 'حالة الرصيد' : 'Status']: c.netBalance > 0 
        ? (isRtl ? 'رصيد طرف العميل' : 'In Customer Custody') 
        : c.netBalance === 0 
          ? (isRtl ? 'متزن' : 'Balanced') 
          : (isRtl ? 'مرتجع زائد' : 'Over-returned')
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isRtl ? 'أرصدة العملاء' : 'Customer Balances');
    XLSX.writeFile(wb, `RichLand_Barrels_Customer_Balances_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(isRtl ? 'تم تصدير تقرير أرصدة العملاء بنجاح' : 'Customer balances exported successfully');
  };

  // Export to Excel: Detailed Movements
  const handleExportMovements = () => {
    if (filteredMovements.length === 0) {
      toast.error(isRtl ? 'لا توجد حركات لتصديرها' : 'No movements to export');
      return;
    }

    const rows = filteredMovements.map((m, i) => ({
      [isRtl ? 'م' : 'No']: i + 1,
      [isRtl ? 'التاريخ' : 'Date']: m.date,
      [isRtl ? 'رقم الإذن' : 'Doc No']: m.docNumber,
      [isRtl ? 'اسم العميل' : 'Customer Name']: m.customerName,
      [isRtl ? 'نوع الحركة' : 'Movement Type']: m.movementType,
      [isRtl ? 'كمية الصرف' : 'Dispatched Qty']: m.dispatchedQty || '',
      [isRtl ? 'كمية الإضافة' : 'Added Qty']: m.addedQty || '',
      [isRtl ? 'الكمية' : 'Quantity']: m.quantity,
      [isRtl ? 'نوع البرميل' : 'Barrel Type']: m.barrelType,
      [isRtl ? 'السائق' : 'Driver']: m.driverName,
      [isRtl ? 'السيارة' : 'Vehicle']: m.carNumber,
      [isRtl ? 'ملاحظات' : 'Notes']: m.notes
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isRtl ? 'حركات البراميل' : 'Barrels Movements');
    XLSX.writeFile(wb, `RichLand_Barrels_Movements_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(isRtl ? 'تم تصدير سجل حركات البراميل بنجاح' : 'Movements exported successfully');
  };

  // Export Customer Statement to Excel
  const handleExportCustomerStatement = () => {
    if (!statementCustomer || customerStatementMovements.length === 0) {
      toast.error(isRtl ? 'لا توجد بيانات لتصديرها' : 'No data to export');
      return;
    }

    const rows = customerStatementMovements.map((m, i) => ({
      [isRtl ? 'م' : 'No']: i + 1,
      [isRtl ? 'التاريخ' : 'Date']: m.date,
      [isRtl ? 'رقم الإذن' : 'Doc No']: m.docNumber,
      [isRtl ? 'نوع الحركة' : 'Movement Type']: m.movementType,
      [isRtl ? 'كمية الصرف' : 'Dispatched Qty']: m.dispatchedQty || '',
      [isRtl ? 'كمية الإضافة' : 'Added Qty']: m.addedQty || '',
      [isRtl ? 'نوع البرميل' : 'Barrel Type']: m.barrelType,
      [isRtl ? 'ملاحظات' : 'Notes']: m.notes
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isRtl ? 'كشف حساب العميل' : 'Customer Statement');
    XLSX.writeFile(wb, `RichLand_Customer_Statement_${statementCustomer}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(isRtl ? 'تم تصدير كشف حساب العميل بنجاح' : 'Customer statement exported successfully');
  };

  // Print Customer Statement
  const handlePrintCustomerStatement = () => {
    window.print();
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900/60 p-5 rounded-3xl border border-zinc-200/70 dark:border-zinc-800/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Cylinder size={28} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                {isRtl ? 'إدارة وحسابات البراميل' : 'Barrels & Drums Management'}
              </h1>
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                {isRtl ? 'شيت جوجل' : 'Google Sheet'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 flex items-center gap-2">
              <span>{isRtl ? 'متابعة أرصدة العملاء (صرف / إضافة / رصيد) وإجمالي الحركات' : 'Customer balances (dispatch / add / balance) & movement totals'}</span>
              {lastSynced && (
                <>
                  <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    {isRtl ? `آخر مزامنة: ${lastSynced}` : `Last synced: ${lastSynced}`}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => fetchData(undefined, true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold text-xs transition-all border border-zinc-200/60 dark:border-zinc-700/60 cursor-pointer disabled:opacity-50"
            title={isRtl ? 'تحديث البيانات من جوجل شيت' : 'Refresh from Google Sheet'}
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            <span>{isRtl ? 'تحديث' : 'Refresh'}</span>
          </button>

          {/* Export Button */}
          <button
            onClick={activeSubTab === 'customers' ? handleExportCustomerBalances : handleExportMovements}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
          >
            <Download size={15} />
            <span>{isRtl ? 'تصدير إكسل' : 'Export Excel'}</span>
          </button>

          {/* Google Sheet URL Config Button */}
          <button
            onClick={() => setIsUrlModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs transition-all border border-zinc-200/60 dark:border-zinc-700/60 cursor-pointer"
            title={isRtl ? 'تعديل رابط شيت جوجل' : 'Google Sheet URL'}
          >
            <LinkIcon size={14} className="text-blue-500" />
            <span>{isRtl ? 'رابط الشيت' : 'Sheet URL'}</span>
          </button>
        </div>
      </div>

      {/* Info Banner when no sheet is configured */}
      {!sheetUrl && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0">
              <Info size={18} />
            </div>
            <div>
              <p className="font-black text-xs">
                {isRtl ? 'عرض تجريبي لحسابات وأرصدة البراميل' : 'Demo Preview of Barrels Accounts & Balances'}
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                {isRtl 
                  ? 'يمكنك في أي وقت ربط شيت جوجل المعتمد لحركات البراميل للشركة من زر (رابط الشيت) بالأعلى لربط ومزامنة البيانات الحية تلقائياً لجميع المستخدمين.'
                  : 'You can link your company Google Sheet anytime using the (Sheet URL) button above to stream live records for all users.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsUrlModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold text-xs transition-all cursor-pointer shrink-0 shadow-sm"
          >
            {isRtl ? 'ربط الشيت الآن' : 'Link Sheet Now'}
          </button>
        </div>
      )}

      {/* KPI Cards: إجمالي الحركات والأرصدة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Dispatched Card */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl shadow-sm hover:border-red-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {isRtl ? 'إجمالي الصرف' : 'Total Dispatched'}
            </span>
            <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
              <TrendingDown size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black font-sans text-red-600 dark:text-red-400">
              {formatNumber(totalStats.totalDispatched)}
              <span className="text-xs text-zinc-400 font-medium mr-1.5 ml-1.5">{isRtl ? 'برميل' : 'bbl'}</span>
            </h3>
            <p className="text-[10px] text-zinc-400 font-bold mt-1">
              {isRtl ? `${totalStats.dispatchMovements} إذن صرف` : `${totalStats.dispatchMovements} dispatch orders`}
            </p>
          </div>
        </div>

        {/* Total Added / Returned Card */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl shadow-sm hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {isRtl ? 'إجمالي الإضافة (المرتجع)' : 'Total Added / Returned'}
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black font-sans text-emerald-600 dark:text-emerald-400">
              {formatNumber(totalStats.totalAdded)}
              <span className="text-xs text-zinc-400 font-medium mr-1.5 ml-1.5">{isRtl ? 'برميل' : 'bbl'}</span>
            </h3>
            <p className="text-[10px] text-zinc-400 font-bold mt-1">
              {isRtl ? `${totalStats.addMovements} إذن إضافة` : `${totalStats.addMovements} addition orders`}
            </p>
          </div>
        </div>

        {/* Net Customer Balance (الرصيد المتبقي لدى العملاء) */}
        <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-amber-500/15 dark:to-zinc-900 border border-amber-500/30 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              {isRtl ? 'صافي رصيد العملاء' : 'Net Customer Balances'}
            </span>
            <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
              <Scale size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black font-sans text-amber-700 dark:text-amber-400">
              {formatNumber(totalStats.netCustomerBalance)}
              <span className="text-xs text-amber-600/70 dark:text-amber-300/70 font-medium mr-1.5 ml-1.5">{isRtl ? 'برميل طرف العملاء' : 'with customers'}</span>
            </h3>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-300/80 font-bold mt-1">
              {isRtl ? 'صرف - إضافة = براميل متبقية' : 'Dispatched - Added = Remaining'}
            </p>
          </div>
        </div>

        {/* Total Movements Count Card */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl shadow-sm hover:border-blue-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {isRtl ? 'إجمالي الحركات' : 'Total Movements'}
            </span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
              <History size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black font-sans text-blue-600 dark:text-blue-400">
              {formatNumber(totalStats.totalTransactions)}
            </h3>
            <p className="text-[10px] text-zinc-400 font-bold mt-1">
              {isRtl ? 'إجمالي أذونات الصرف والإضافة' : 'All dispatch & return records'}
            </p>
          </div>
        </div>

        {/* Active Customers Count Card */}
        <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 rounded-3xl shadow-sm hover:border-purple-500/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {isRtl ? 'العملاء المسجلين' : 'Total Customers'}
            </span>
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
              <Users size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black font-sans text-purple-600 dark:text-purple-400">
              {totalStats.uniqueCustomersCount}
            </h3>
            <p className="text-[10px] text-zinc-400 font-bold mt-1">
              {isRtl ? 'عميل مسجل لديه حركات براميل' : 'Registered customers with movements'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation: Customers Balances vs Detailed Movements Log */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveSubTab('customers');
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer flex-1 sm:flex-none justify-center ${
              activeSubTab === 'customers'
                ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Users size={15} />
            <span>{isRtl ? 'رصيد العملاء (صرف - إضافة - رصيد)' : 'Customer Balances'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 font-mono">
              {customerSummaries.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('movements');
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer flex-1 sm:flex-none justify-center ${
              activeSubTab === 'movements'
                ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <History size={15} />
            <span>{isRtl ? 'سجل الحركات التفصيلي' : 'Detailed Movements Log'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 font-mono">
              {data.length}
            </span>
          </button>
        </div>

        {/* View Details Helper */}
        <p className="text-xs text-zinc-400 font-medium">
          {activeSubTab === 'customers' 
            ? (isRtl ? 'اضغط على أي عميل لمشاهدة كشف الحساب وسجل حركاته بالتفصيل' : 'Click on any customer to view full transaction statement')
            : (isRtl ? 'عرض تفصيلي لكل أذونات الصرف والإضافة المستخرجة' : 'Full log of all barrel dispatch and return transactions')
          }
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-3xl border border-zinc-200/70 dark:border-zinc-800/60 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={17} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeSubTab === 'customers'
                  ? (isRtl ? 'ابحث باسم العميل...' : 'Search by customer name...')
                  : (isRtl ? 'ابحث باسم العميل، رقم الإذن، السائق، رقم السيارة...' : 'Search customer, doc no, driver, car...')
              }
              className="w-full pl-4 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-right"
              dir={isRtl ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Quick Balance Filter for Customers Tab */}
          {activeSubTab === 'customers' && (
            <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 shrink-0">
              <button
                onClick={() => setBalanceFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  balanceFilter === 'all'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {isRtl ? 'كل الأرصدة' : 'All'}
              </button>
              <button
                onClick={() => setBalanceFilter('has_balance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  balanceFilter === 'has_balance'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-amber-600'
                }`}
              >
                {isRtl ? 'لديهم رصيد مستحق' : 'Has Outstanding'}
              </button>
              <button
                onClick={() => setBalanceFilter('zero')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  balanceFilter === 'zero'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-emerald-600'
                }`}
              >
                {isRtl ? 'متزن (0)' : 'Balanced (0)'}
              </button>
              <button
                onClick={() => setBalanceFilter('negative')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  balanceFilter === 'negative'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-blue-600'
                }`}
              >
                {isRtl ? 'مرتجع زائد' : 'Negative'}
              </button>
            </div>
          )}

          {/* Clear Filters Button */}
          {(searchTerm || balanceFilter !== 'all' || selectedCustomers.length > 0 || selectedMovementTypes.length > 0 || selectedBarrelTypes.length > 0 || selectedStores.length > 0 || selectedDates.length > 0 || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setBalanceFilter('all');
                setSelectedCustomers([]);
                setSelectedMovementTypes([]);
                setSelectedBarrelTypes([]);
                setSelectedStores([]);
                setSelectedDates([]);
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs text-red-500 hover:underline font-bold px-2 py-1 flex items-center gap-1 cursor-pointer shrink-0"
            >
              <X size={14} />
              <span>{isRtl ? 'إعادة ضبط' : 'Reset'}</span>
            </button>
          )}
        </div>

        {/* Multi-Select Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
          <MultiSelectDropdown
            label={isRtl ? 'العملاء' : 'Customers'}
            options={uniqueCustomersList}
            selectedValues={selectedCustomers}
            onChange={setSelectedCustomers}
            isRtl={isRtl}
            icon={<User size={14} className="text-amber-500" />}
          />

          <MultiSelectDropdown
            label={isRtl ? 'التاريخ' : 'Dates'}
            options={uniqueDatesList}
            selectedValues={selectedDates}
            onChange={setSelectedDates}
            isRtl={isRtl}
            icon={<Calendar size={14} className="text-blue-500" />}
          />

          {uniqueStoresList.length > 0 && (
            <MultiSelectDropdown
              label={isRtl ? 'المخزن' : 'Store'}
              options={uniqueStoresList}
              selectedValues={selectedStores}
              onChange={setSelectedStores}
              isRtl={isRtl}
              icon={<Boxes size={14} className="text-emerald-500" />}
            />
          )}

          {activeSubTab === 'movements' && (
            <>
              <MultiSelectDropdown
                label={isRtl ? 'نوع الحركة' : 'Movement Type'}
                options={uniqueMovementTypesList}
                selectedValues={selectedMovementTypes}
                onChange={setSelectedMovementTypes}
                isRtl={isRtl}
                icon={<ArrowUpDown size={14} className="text-purple-500" />}
              />

              {uniqueBarrelTypesList.length > 0 && (
                <MultiSelectDropdown
                  label={isRtl ? 'نوع البرميل' : 'Barrel Type'}
                  options={uniqueBarrelTypesList}
                  selectedValues={selectedBarrelTypes}
                  onChange={setSelectedBarrelTypes}
                  isRtl={isRtl}
                  icon={<Cylinder size={14} className="text-amber-600" />}
                />
              )}

              {/* Date Range Inputs */}
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-[11px] font-bold text-zinc-400">{isRtl ? 'من:' : 'From:'}</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold"
                />
                <span className="text-[11px] font-bold text-zinc-400">{isRtl ? 'إلى:' : 'To:'}</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loading & Empty States */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-bold text-zinc-500 animate-pulse">
            {isRtl ? 'جاري تحميل ومعالجة بيانات البراميل من شيت جوجل...' : 'Loading and calculating barrels records from Google Sheet...'}
          </p>
        </div>
      ) : activeSubTab === 'customers' ? (
        /* TAB 1: CUSTOMER BALANCES TABLE (رصيد العملاء) */
        <div className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-200/70 dark:border-zinc-800/60 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-amber-500" />
              <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                {isRtl ? 'جدول أرصدة العملاء (صرف - إضافة - رصيد)' : 'Customer Balances Table'}
              </h2>
              <span className="text-xs text-zinc-400 font-bold font-mono">
                ({filteredCustomerSummaries.length} {isRtl ? 'عميل' : 'customers'})
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="bg-zinc-50/80 dark:bg-zinc-800/40 text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 text-center">#</th>
                  <th className="py-3 px-4">{isRtl ? 'اسم العميل' : 'Customer Name'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'إجمالي الصرف (صادر)' : 'Total Dispatched'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'إجمالي الإضافة (وارد)' : 'Total Added'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'صافي الرصيد الحالي' : 'Net Current Balance'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'عدد الحركات' : 'Movements'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'تاريخ آخر حركة' : 'Last Movement'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {filteredCustomerSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                      <p className="font-bold text-xs">{isRtl ? 'لا توجد بيانات عملاء مطابقة للفلاتر' : 'No customer records matching filters'}</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomerSummaries.map((c, index) => {
                    const isPositive = c.netBalance > 0;
                    const isZero = c.netBalance === 0;
                    const isNegative = c.netBalance < 0;

                    return (
                      <tr 
                        key={c.customerName}
                        className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors group cursor-pointer"
                        onClick={() => setStatementCustomer(c.customerName)}
                      >
                        <td className="py-3 px-4 text-center font-mono text-[11px] text-zinc-400">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 font-black text-zinc-900 dark:text-zinc-100 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {c.customerName.charAt(0)}
                            </div>
                            <span>{c.customerName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-red-600 dark:text-red-400">
                          {formatNumber(c.totalDispatched)}
                          <span className="text-[10px] text-zinc-400 mr-1">{isRtl ? 'ب' : 'b'}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatNumber(c.totalAdded)}
                          <span className="text-[10px] text-zinc-400 mr-1">{isRtl ? 'ب' : 'b'}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full font-mono font-black text-xs ${
                            isPositive
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                              : isZero
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                          }`}>
                            {isPositive ? '+' : ''}{formatNumber(c.netBalance)} {isRtl ? 'برميل' : 'bbl'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-zinc-500 font-bold">
                          {c.movementsCount}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-zinc-400 text-[11px]">
                          {c.lastDate}
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setStatementCustomer(c.customerName)}
                            className="px-3 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold text-[11px] rounded-xl border border-amber-200 dark:border-amber-800 transition-all cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <FileText size={12} />
                            <span>{isRtl ? 'كشف الحركات' : 'Statement'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 2: DETAILED MOVEMENTS LOG TABLE (سجل الحركات) */
        <div className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-200/70 dark:border-zinc-800/60 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={18} className="text-blue-500" />
              <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                {isRtl ? 'سجل حركات البراميل التفصيلي' : 'Detailed Barrels Transactions Log'}
              </h2>
              <span className="text-xs text-zinc-400 font-bold font-mono">
                ({filteredMovements.length} {isRtl ? 'حركة' : 'records'})
              </span>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400 font-bold">{isRtl ? 'عرض:' : 'Show:'}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="bg-zinc-50/80 dark:bg-zinc-800/40 text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 text-center">#</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'التاريخ' : 'Date'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'رقم الإذن' : 'Doc No'}</th>
                  <th className="py-3 px-4">{isRtl ? 'اسم العميل' : 'Customer'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'نوع الحركة' : 'Type'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'كمية الصرف' : 'Dispatched'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'كمية الإضافة' : 'Added'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'نوع البرميل' : 'Barrel Type'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'السائق / السيارة' : 'Driver / Truck'}</th>
                  <th className="py-3 px-4">{isRtl ? 'البيان / ملاحظات' : 'Notes'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {paginatedMovements.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-zinc-400">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-500" />
                      <p className="font-bold text-xs">{isRtl ? 'لا توجد حركات مطابقة للفلاتر' : 'No movement records matching filters'}</p>
                    </td>
                  </tr>
                ) : (
                  paginatedMovements.map((m, index) => {
                    const isDispatch = m.movementType === 'صرف' || m.dispatchedQty > 0;

                    return (
                      <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-[11px] text-zinc-400">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-zinc-600 dark:text-zinc-300">
                          {m.date || '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-zinc-700 dark:text-zinc-300">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px]">
                            {m.docNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-zinc-900 dark:text-zinc-100">
                          <button
                            onClick={() => setStatementCustomer(m.customerName)}
                            className="hover:text-amber-600 hover:underline cursor-pointer text-right"
                          >
                            {m.customerName}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isDispatch
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isDispatch ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                            {isDispatch ? (isRtl ? 'صرف' : 'Dispatch') : (isRtl ? 'إضافة' : 'Addition')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-red-600 dark:text-red-400">
                          {m.dispatchedQty > 0 ? formatNumber(m.dispatchedQty) : '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {m.addedQty > 0 ? formatNumber(m.addedQty) : '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-zinc-600 dark:text-zinc-300">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/5 text-amber-700 dark:text-amber-400 border border-amber-500/10 text-[10px] font-bold">
                            {m.barrelType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-zinc-500 text-[11px]">
                          {m.driverName !== '—' ? `${m.driverName} (${m.carNumber})` : m.carNumber}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 text-[11px] max-w-xs truncate" title={m.notes}>
                          {m.notes || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-bold font-mono">
                {isRtl ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = currentPage;
                    if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;

                    if (pageNum < 1 || pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Detailed Statement Modal (كشف حساب براميل العميل) */}
      <AnimatePresence>
        {statementCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl print-modal-container"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              {/* Official Print Header */}
              <div className="hidden print:block mb-4 text-center border-b-2 border-zinc-900 pb-4">
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">ريش لاند لتصنيع وتصدير الحاصلات الزراعية</h1>
                <p className="text-xs text-zinc-700 font-bold mt-1">إدارة الحسابات والمخازن - كشف حساب عهدة براميل رسمي</p>
                <div className="flex items-center justify-between mt-4 text-xs font-bold text-zinc-900 px-2">
                  <span>اسم العميل: <strong className="underline text-sm">{statementCustomer}</strong></span>
                  <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
                </div>
              </div>

              {/* Modal Header */}
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30 print:hidden">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-2xl">
                    <User size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                      {statementCustomer}
                    </h3>
                    <p className="text-xs text-zinc-400 font-bold">
                      {isRtl ? 'كشف حركة ورصيد البراميل التفصيلي' : 'Barrels Movement & Custody Statement'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setStatementCustomer(null)}
                  className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Customer Balance Summary Bar inside Modal */}
              <div className="p-4 bg-amber-500/5 border-b border-amber-500/10 grid grid-cols-3 gap-3 text-center print:border-zinc-300 print:bg-zinc-50">
                <div className="p-3 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 print:border-zinc-300 print:bg-white">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                    {isRtl ? 'إجمالي الصرف' : 'Total Dispatched'}
                  </span>
                  <span className="text-lg font-black text-red-600 font-mono">
                    {formatNumber(customerStatementTotals.dispatched)} {isRtl ? 'برميل' : 'bbl'}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 print:border-zinc-300 print:bg-white">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                    {isRtl ? 'إجمالي الإضافة (المرتجع)' : 'Total Returned / Added'}
                  </span>
                  <span className="text-lg font-black text-emerald-600 font-mono">
                    {formatNumber(customerStatementTotals.added)} {isRtl ? 'برميل' : 'bbl'}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-zinc-800/80 rounded-2xl border border-amber-500/30 print:border-zinc-300 print:bg-white">
                  <span className="text-[10px] font-bold text-amber-600 uppercase block mb-1">
                    {isRtl ? 'صافي الرصيد المستحق طرفه' : 'Net Outstanding Balance'}
                  </span>
                  <span className="text-lg font-black text-amber-700 dark:text-amber-400 font-mono">
                    {formatNumber(customerStatementTotals.balance)} {isRtl ? 'برميل' : 'bbl'}
                  </span>
                </div>
              </div>

              {/* Statement Table */}
              <div className="overflow-y-auto flex-1 p-4 print:overflow-visible print:p-0">
                <table className="w-full text-right text-xs print:border-collapse print:border print:border-zinc-800" dir={isRtl ? 'rtl' : 'ltr'}>
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-400 border-b border-zinc-200 dark:border-zinc-700 text-[10px] font-black uppercase print:bg-zinc-200 print:text-zinc-900 print:border-b-2 print:border-zinc-800">
                      <th className="py-2.5 px-3 text-center print:border print:border-zinc-800">#</th>
                      <th className="py-2.5 px-3 text-center print:border print:border-zinc-800">{isRtl ? 'التاريخ' : 'Date'}</th>
                      <th className="py-2.5 px-3 text-center print:border print:border-zinc-800">{isRtl ? 'رقم الإذن' : 'Doc No'}</th>
                      <th className="py-2.5 px-3 text-center print:border print:border-zinc-800">{isRtl ? 'نوع الحركة' : 'Type'}</th>
                      <th className="py-2.5 px-3 text-center print:border print:border-zinc-800">{isRtl ? 'صرف' : 'Dispatch'}</th>
                      <th className="py-2.5 px-3 text-center print:border print:border-zinc-800">{isRtl ? 'إضافة' : 'Add'}</th>
                      <th className="py-2.5 px-3 text-center print:border print:border-zinc-800">{isRtl ? 'نوع البرميل' : 'Barrel'}</th>
                      <th className="py-2.5 px-3 print:border print:border-zinc-800">{isRtl ? 'البيان' : 'Notes'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 print:divide-zinc-800">
                    {customerStatementMovements.map((m, i) => (
                      <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 print:border-b print:border-zinc-800">
                        <td className="py-2.5 px-3 text-center font-mono text-zinc-400 print:text-zinc-900 print:border print:border-zinc-800">{i + 1}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-700 dark:text-zinc-300 print:text-zinc-900 print:border print:border-zinc-800">{m.date}</td>
                        <td className="py-2.5 px-3 text-center font-mono print:border print:border-zinc-800">{m.docNumber}</td>
                        <td className="py-2.5 px-3 text-center print:border print:border-zinc-800">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            m.movementType === 'صرف'
                              ? 'bg-red-500/10 text-red-600 print:text-red-700 print:bg-transparent'
                              : 'bg-emerald-500/10 text-emerald-600 print:text-emerald-700 print:bg-transparent'
                          }`}>
                            {m.movementType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-red-600 print:text-red-700 print:border print:border-zinc-800">
                          {m.dispatchedQty > 0 ? formatNumber(m.dispatchedQty) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 print:text-emerald-700 print:border print:border-zinc-800">
                          {m.addedQty > 0 ? formatNumber(m.addedQty) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center text-zinc-500 text-[11px] print:text-zinc-900 print:border print:border-zinc-800">{m.barrelType}</td>
                        <td className="py-2.5 px-3 text-zinc-500 text-[11px] print:text-zinc-900 print:border print:border-zinc-800">{m.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Official Print Signatures */}
              <div className="hidden print:flex items-center justify-between mt-12 pt-8 border-t-2 border-zinc-900 text-xs font-bold text-zinc-900 page-break-inside-avoid">
                <div className="text-center">
                  <p className="mb-12 font-bold">إعداد ومراجعة (المحاسب)</p>
                  <div className="w-44 border-b-2 border-dashed border-zinc-600 mx-auto"></div>
                </div>
                <div className="text-center">
                  <p className="mb-12 font-bold">اعتماد الإدارة / خاتم الشركة</p>
                  <div className="w-44 border-b-2 border-dashed border-zinc-600 mx-auto"></div>
                </div>
                <div className="text-center">
                  <p className="mb-12 font-bold">استلام العميل (المقر / التوقيع)</p>
                  <div className="w-44 border-b-2 border-dashed border-zinc-600 mx-auto"></div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/35 print:hidden">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCustomerStatement}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Download size={14} />
                    <span>{isRtl ? 'تصدير إكسل' : 'Export Excel'}</span>
                  </button>
                  <button
                    onClick={handlePrintCustomerStatement}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-2xl text-xs font-bold transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700"
                  >
                    <FileText size={14} />
                    <span>{isRtl ? 'طباعة الكشف' : 'Print Statement'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 font-bold font-mono">
                    {customerStatementMovements.length} {isRtl ? 'حركة مسجلة' : 'movements recorded'}
                  </span>
                  <button
                    onClick={() => setStatementCustomer(null)}
                    className="px-5 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {isRtl ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Sheet URL Config Modal */}
      <AnimatePresence>
        {isUrlModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <button
                onClick={() => setIsUrlModalOpen(false)}
                className="absolute top-5 left-5 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                  <LinkIcon size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    {isRtl ? 'إعداد رابط شيت البراميل' : 'Barrels Google Sheet Configuration'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-bold">
                    {isRtl ? 'تحديث وتثبيت الرابط لجميع المستخدمين في النظام' : 'Update and sync sheet link for all users in real-time'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    {isRtl ? 'رابط جوجل شيت (رابط النشر أو التعديل)' : 'Google Sheet URL (Public CSV or Edit URL)'}
                  </label>
                  <input
                    type="url"
                    value={newUrlInput}
                    onChange={(e) => setNewUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="ltr"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                    {isRtl 
                      ? 'يمكنك وضع رابط شيت جوجل العادي أو رابط النشر CSV؛ سيقوم النظام تلقائياً بتحويله واستخراج البيانات.'
                      : 'You can paste standard Google Sheets link or published CSV link. The system converts it automatically.'}
                  </p>
                </div>

                {sheetMetadata?.updatedBy && (
                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-[11px] text-blue-700 dark:text-blue-300 font-bold">
                    {isRtl 
                      ? `آخر تحديث تم بواسطة: ${sheetMetadata.updatedBy} بتاريخ ${sheetMetadata.updatedAt ? new Date(sheetMetadata.updatedAt).toLocaleString('ar-EG') : ''}`
                      : `Last updated by ${sheetMetadata.updatedBy}`}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSaveUrl}
                    disabled={savingUrl}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {savingUrl ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ وتثبيت الرابط للجميع' : 'Save & Sync for Everyone')}
                  </button>

                  {sheetUrl && (
                    <button
                      onClick={handleClearUrl}
                      disabled={savingUrl}
                      className="px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 rounded-2xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                      title={isRtl ? 'إزالة الرابط والعودة للعرض التجريبي' : 'Remove link and revert to demo preview'}
                    >
                      {isRtl ? 'إلغاء الربط' : 'Unlink'}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setNewUrlInput('');
                    }}
                    className="px-4 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {isRtl ? 'مسح الخانة' : 'Clear'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  isRtl,
  icon
}: {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (vals: string[]) => void;
  isRtl: boolean;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    !search || opt.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = options.length > 0 && selectedValues.length === options.length;
  const someSelected = selectedValues.length > 0 && !allSelected;

  const handleToggleAll = () => {
    if (allSelected || someSelected) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const handleToggleOption = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter(v => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/70 rounded-2xl text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 transition-all cursor-pointer"
      >
        {icon}
        <span>{label}</span>
        {selectedValues.length > 0 ? (
          <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-mono">
            {selectedValues.length}
          </span>
        ) : (
          <span className="text-zinc-400 text-[10px]">({isRtl ? 'الكل' : 'All'})</span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-1.5 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl z-50 p-3 flex flex-col gap-2 ${isRtl ? 'right-0' : 'left-0'}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? 'بحث في القائمة...' : 'Search options...'}
              className="w-full pl-3 pr-9 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] font-bold text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
            <button
              type="button"
              onClick={handleToggleAll}
              className="hover:text-amber-600 cursor-pointer text-amber-700 dark:text-amber-400"
            >
              {allSelected || someSelected ? (isRtl ? 'إلغاء تحديد الكل' : 'Deselect All') : (isRtl ? 'تحديد الكل' : 'Select All')}
            </button>
            {selectedValues.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-red-500 hover:underline cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Clear'}
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-4">{isRtl ? 'لا توجد نتائج' : 'No results'}</p>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedValues.includes(opt);
                return (
                  <div
                    key={opt}
                    onClick={() => handleToggleOption(opt)}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-500/10 text-amber-900 dark:text-amber-200'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'border-zinc-300 dark:border-zinc-600'
                    }`}>
                      {isSelected && <Check size={11} />}
                    </div>
                    <span className="truncate">{opt}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

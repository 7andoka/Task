import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  Edit3, 
  Download, 
  Calendar, 
  Clock, 
  Info, 
  Settings, 
  AlertCircle, 
  Check, 
  X, 
  Save, 
  Printer, 
  Database,
  ArrowRight,
  TrendingUp,
  LayoutGrid,
  Users,
  Tv,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  Eye,
  Wrench,
  Zap
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { Language, UserProfile } from '../types';

// PDF export
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface KPIDashboardProps {
  lang: Language;
  user: UserProfile;
}

// Full interface matching the image structures
interface KPIData {
  date: string; // YYYY-MM-DD
  dayName: string; // Tuesday, etc.
  shift: string; // "الصباحية" | "المسائية" | "الليلية"
  notes: string;
  sourceSheetUrl: string;

  // 1. Production Section
  prodTotal: { actual: number; target: number; statusOverride?: string };
  prodEfficiency: { actual: number; target: number; statusOverride?: string };
  prodWaste: { actual: number; target: number; statusOverride?: string };
  prodFilmWaste: { actual: number; target: number; statusOverride?: string };
  prodRework: { actual: number; target: number; statusOverride?: string };

  // 2. Quality Section
  qualHoldCases: { actual: number; target: number; statusOverride?: string };
  qualFoodSafety: { actual: number; target: number; statusOverride?: string };
  qualGmpScore: { actual: number; target: number; statusOverride?: string };

  // 3. Safety Section
  safeNearMisses: { actual: number; target: number; statusOverride?: string };
  safeOpenRisks: { actual: number; target: number; statusOverride?: string };

  // 4. Warehouse & Dispatch
  whShippedContainers: { actual: number; target: number; statusOverride?: string };
  whExecutedOrders: { actual: number; target: number; statusOverride?: string };
  whOtif: { actual: number; target: number; statusOverride?: string };

  // 5. Maintenance Section
  maintPlanned: { actual: number; target: number; statusOverride?: string };
  maintBreakdowns: { actual: number; target: number; statusOverride?: string };
  maintMttr: { actual: number; target: number; statusOverride?: string };

  // 6. Energy & Utilities Section
  energyPower: { actual: number; target: number; statusOverride?: string };
  energyWater: { actual: number; target: number; statusOverride?: string };

  // lines Performance
  linePacking1: { prod: number; prodPlanned: number; eff: number; effPlanned: number; waste: number; wastePlanned: number; downtime: number; downtimePlanned: number };
  linePacking2: { prod: number; prodPlanned: number; eff: number; effPlanned: number; waste: number; wastePlanned: number; downtime: number; downtimePlanned: number };
  linePackaging1: { prod: number; prodPlanned: number; eff: number; effPlanned: number; waste: number; wastePlanned: number; downtime: number; downtimePlanned: number };
  linePackaging2: { prod: number; prodPlanned: number; eff: number; effPlanned: number; waste: number; wastePlanned: number; downtime: number; downtimePlanned: number };

  // Charts
  weeklyTrend: { date: string; efficiency: number; waste: number; rework: number }[];
  weeklyContainers: { date: string; value: number }[];
}

const DEFAULT_KPI_DATA: KPIData = {
  date: '2024-05-21',
  dayName: 'الثلاثاء',
  shift: 'الصباحية',
  notes: 'الجودة - السلامة - الكفاءة - الالتزام ... نحو أداء أفضل كل يوم',
  sourceSheetUrl: '',

  // Category 1: Production
  prodTotal: { actual: 52980, target: 50000 },
  prodEfficiency: { actual: 84, target: 85 },
  prodWaste: { actual: 0.4, target: 0.5 },
  prodFilmWaste: { actual: 0.7, target: 1.0 },
  prodRework: { actual: 2.0, target: 3.0 },

  // Category 2: Quality
  qualHoldCases: { actual: 0, target: 2, statusOverride: 'danger' }, // explicitly match image ❌ under target
  qualFoodSafety: { actual: 0, target: 0 },
  qualGmpScore: { actual: 92, target: 95 },

  // Category 3: Safety
  safeNearMisses: { actual: 0, target: 0 },
  safeOpenRisks: { actual: 1, target: 0 },

  // Category 4: Warehouse & Dispatch
  whShippedContainers: { actual: 4, target: 5 },
  whExecutedOrders: { actual: 4, target: 5 },
  whOtif: { actual: 90, target: 95 },

  // Category 5: Maintenance
  maintPlanned: { actual: 96, target: 95 },
  maintBreakdowns: { actual: 1.2, target: 0.5 },
  maintMttr: { actual: 45, target: 60 },

  // Category 6: Energy & Utilities
  energyPower: { actual: 12400, target: 13000 },
  energyWater: { actual: 310, target: 350 },

  // Production lines Performance
  linePacking1: {
    prod: 26480, prodPlanned: 26400,
    eff: 87, effPlanned: 85,
    waste: 0.4, wastePlanned: 0.5,
    downtime: 35, downtimePlanned: 0
  },
  linePacking2: {
    prod: 21240, prodPlanned: 20000,
    eff: 83, effPlanned: 85,
    waste: 0.6, wastePlanned: 0.5,
    downtime: 42, downtimePlanned: 0
  },
  linePackaging1: {
    prod: 58800, prodPlanned: 60000,
    eff: 88, effPlanned: 85,
    waste: 0.3, wastePlanned: 1.0,
    downtime: 25, downtimePlanned: 0
  },
  linePackaging2: {
    prod: 50300, prodPlanned: 40000,
    eff: 86, effPlanned: 82,
    waste: 0.5, wastePlanned: 1.0,
    downtime: 50, downtimePlanned: 0
  },

  weeklyTrend: [
    { date: '16/05', efficiency: 90, waste: 20, rework: 10 },
    { date: '17/05', efficiency: 86, waste: 12, rework: 8 },
    { date: '18/05', efficiency: 83, waste: 10, rework: 5 },
    { date: '19/05', efficiency: 92, waste: 11, rework: 7 },
    { date: '20/05', efficiency: 88, waste: 18, rework: 11 },
    { date: '21/05', efficiency: 87, waste: 18, rework: 10 }
  ],
  weeklyContainers: [
    { date: '16/05', value: 6 },
    { date: '17/05', value: 7 },
    { date: '18/05', value: 8 },
    { date: '19/05', value: 5 },
    { date: '20/05', value: 6 },
    { date: '21/05', value: 4 }
  ]
};

const SHIFTS_AR = ['الصباحية', 'المسائية', 'الليلية'];
const SHIFTS_EN = ['Morning', 'Evening', 'Night'];

export default function KPIDashboard({ lang, user }: KPIDashboardProps) {
  const isRtl = lang === 'ar';
  const boardRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState<string>('2024-05-21');
  const [data, setData] = useState<KPIData>(DEFAULT_KPI_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Sheet config panel & direct copy-paste drawer
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [pasteData, setPasteData] = useState<string>('');

  // Manual editor modal
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<KPIData>(DEFAULT_KPI_DATA);

  // TV Presentation/Fullscreen mode settings
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [tvTheme, setTvTheme] = useState<'light' | 'dark'>('light');
  const [tvZoom, setTvZoom] = useState<number>(1.4);
  const [tvFontScale, setTvFontScale] = useState<'normal' | 'large' | 'huge'>('huge');
  const [tvBlackText, setTvBlackText] = useState<boolean>(true);
  const [refreshTimer, setRefreshTimer] = useState<number>(60);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Handle escape, + and - keyboard shortcuts in TV mode to increase sizing dynamically
  useEffect(() => {
    if (!isTvMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTvMode(false);
      } else if (e.key === '+' || e.key === '=') {
        setTvZoom(prev => Math.min(3.5, parseFloat((prev + 0.1).toFixed(2))));
        e.preventDefault();
      } else if (e.key === '-' || e.key === '_') {
        setTvZoom(prev => Math.max(0.4, parseFloat((prev - 0.1).toFixed(2))));
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTvMode]);

  // Handle automatic browser exit-fullscreen triggers (e.g. Esc key pressed natively)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      if (!isCurrentlyFullscreen && isTvMode) {
        setIsTvMode(false);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isTvMode]);

  // Countdown timer for display robustness on TV screens
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setRefreshTimer(prev => {
        if (prev <= 1) {
          // Silent re-evaluation pull to keep connection robust
          const refreshDoc = async () => {
            try {
              const docRef = doc(db, 'kpis', date);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                setData(docSnap.data() as KPIData);
              }
            } catch (err) {
              console.warn("Silent re-fetch check error:", err);
            }
          };
          refreshDoc();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, date]);

  // Helper inside layout: get weekday from date string
  const getWeekdayName = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return isRtl ? 'الأربعاء' : 'Wednesday';
      const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return isRtl ? daysAr[d.getDay()] : daysEn[d.getDay()];
    } catch {
      return isRtl ? 'الثلاثاء' : 'Tuesday';
    }
  };

  // Convert date format from yyyy-mm-dd to dd/mm
  const formatChartDate = (dateStr: string): string => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Subscribe to real-time additions/modifications in Firestore with automatic onSnapshot
  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, 'kpis', date);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const fetched = docSnap.data() as KPIData;
        setData(fetched);
        setSheetUrl(fetched.sourceSheetUrl || '');
      } else {
        // If no specific day KPI in Firestore, default to the structured blueprint for the demo date, 
        // but with the selected date inside
        setData({
          ...DEFAULT_KPI_DATA,
          date: date,
          dayName: getWeekdayName(date)
        });
        setSheetUrl('');
      }
      setLoading(false);
    }, (err) => {
      console.error('Real-time sync subscription error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [date, isRtl]);

  // Synchronize/evaluate individual KPI status dynamically
  const getKpiStatus = (
    actual: number, 
    target: number, 
    category: 'higher-better' | 'lower-better' | 'equal-zero',
    override?: string
  ): 'success' | 'warning' | 'danger' => {
    if (override === 'success' || override === 'warning' || override === 'danger') {
      return override as any;
    }

    if (category === 'higher-better') {
      if (actual >= target) return 'success';
      if (actual >= target * 0.95) return 'warning';
      return 'danger';
    } 
    else if (category === 'lower-better') {
      if (actual <= target) return 'success';
      if (actual <= target * 1.15) return 'warning';
      return 'danger';
    }
    else {
      // equal-zero or precise matches
      if (actual === target) return 'success';
      if (actual <= target + 1) return 'warning';
      return 'danger';
    }
  };

  // Status visual elements
  const renderStatusIcon = (status: 'success' | 'warning' | 'danger') => {
    if (status === 'success') {
      return (
        <div id="status-kpi-success" className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-xs shadow-sm">
          <Check size={12} strokeWidth={3} />
        </div>
      );
    } else if (status === 'warning') {
      return (
        <div id="status-kpi-warning" className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white font-black text-sm shadow-sm leading-none select-none">
          -
        </div>
      );
    } else {
      return (
        <div id="status-kpi-danger" className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center text-white font-black text-xs shadow-sm">
          <X size={12} strokeWidth={3} />
        </div>
      );
    }
  };

  // Perform Firestore Save
  const saveKPIData = async (dataToSave: KPIData) => {
    setSaving(true);
    try {
      const docRef = doc(db, 'kpis', dataToSave.date);
      await setDoc(docRef, dataToSave);
      setData(dataToSave);
      toast.success(isRtl ? 'تم حفظ مؤشرات الأداء بنجاح في السحاب' : 'KPI data saved to cloud successfully');
      setShowEditor(false);
    } catch (err) {
      console.error('Error saving KPI:', err);
      toast.error(isRtl ? 'حدث خطأ أثناء الحفظ. يرجى إعادة المحاولة' : 'Error saving. Please try again');
    } finally {
      setSaving(false);
    }
  };

  // PDF Download of the original sheet layout
  const handleExportPDF = async () => {
    if (!boardRef.current) return;
    toast.info(isRtl ? 'جاري تجهيز تقرير مؤشرات الأداء للتحميل...' : 'Preparing KPI Report PDF...');

    try {
      // Ensure we render completely nicely
      const originalStyle = boardRef.current.style.cssText;
      boardRef.current.style.maxWidth = '1450px';
      boardRef.current.style.backgroundColor = '#ffffff';

      const canvas = await html2canvas(boardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      boardRef.current.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Rich-Land_KPI_${date}.pdf`);
      toast.success(isRtl ? 'تم تحميل ملف PDF بنجاح!' : 'PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation issue:', error);
      toast.error(isRtl ? 'فشل تصدير التقرير إلى PDF' : 'Failed to export report to PDF');
    }
  };

  // Parse directly pasted data from Google Sheets or Excel (TSV/CSV Copy Paste)
  const handlePasteParse = () => {
    if (!pasteData.trim()) {
      toast.error(isRtl ? 'يرجى لصق بيانات صالحة أولاً' : 'Please paste valid data first');
      return;
    }

    try {
      const lines = pasteData.split('\n').map(l => l.split('\t').map(c => l.indexOf('\t') !== -1 ? c.trim() : c.split(',').map(sub => sub.trim())).flat());
      let updated = { ...data };
      let updatedCount = 0;

      // Create a map of keywords
      lines.forEach(row => {
        if (row.length < 2) return;
        const key = row[0].toLowerCase().trim();
        const secondVal = parseFloat(row[1]?.replace(/[%,]/g, ''));
        const thirdVal = parseFloat(row[2]?.replace(/[%,]/g, ''));

        if (isNaN(secondVal)) return;

        // Productions
        if (key.includes('إجمالي الإنتاج') || key.includes('total production')) {
          updated.prodTotal.actual = secondVal;
          if (!isNaN(thirdVal)) updated.prodTotal.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('الكفاءة الإنتاجية') || key.includes('productivity efficiency')) {
          updated.prodEfficiency.actual = secondVal;
          if (!isNaN(thirdVal)) updated.prodEfficiency.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('product waste')) {
          updated.prodWaste.actual = secondVal;
          if (!isNaN(thirdVal)) updated.prodWaste.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('film waste')) {
          updated.prodFilmWaste.actual = secondVal;
          if (!isNaN(thirdVal)) updated.prodFilmWaste.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('rework')) {
          updated.prodRework.actual = secondVal;
          if (!isNaN(thirdVal)) updated.prodRework.target = thirdVal;
          updatedCount++;
        }

        // Quality
        else if (key.includes('hold') || key.includes('حالات الـ hold')) {
          updated.qualHoldCases.actual = secondVal;
          if (!isNaN(thirdVal)) updated.qualHoldCases.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('فود سيفتي') || key.includes('saftey violations') || key.includes('food safety')) {
          updated.qualFoodSafety.actual = secondVal;
          if (!isNaN(thirdVal)) updated.qualFoodSafety.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('gmp')) {
          updated.qualGmpScore.actual = secondVal;
          if (!isNaN(thirdVal)) updated.qualGmpScore.target = thirdVal;
          updatedCount++;
        }

        // Safety
        else if (key.includes('حوادث وشيكة') || key.includes('near-misses') || key.includes('الوشيكة')) {
          updated.safeNearMisses.actual = secondVal;
          if (!isNaN(thirdVal)) updated.safeNearMisses.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('مخاطر السلامة') || key.includes('safety risks') || key.includes('المفتوحة')) {
          updated.safeOpenRisks.actual = secondVal;
          if (!isNaN(thirdVal)) updated.safeOpenRisks.target = thirdVal;
          updatedCount++;
        }

        // Warehouse & Dispatch
        else if (key.includes('الحاويات المشحونة') || key.includes('shipped containers')) {
          updated.whShippedContainers.actual = secondVal;
          if (!isNaN(thirdVal)) updated.whShippedContainers.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('أوامر التحميل') || key.includes('loading orders') || key.includes('التحميل المنفذة')) {
          updated.whExecutedOrders.actual = secondVal;
          if (!isNaN(thirdVal)) updated.whExecutedOrders.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('otif') || key.includes('الشحن في الموعد')) {
          updated.whOtif.actual = secondVal;
          if (!isNaN(thirdVal)) updated.whOtif.target = thirdVal;
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        toast.success(isRtl 
          ? `نجاح! تم استخراج وتعديل ${updatedCount} مؤشر أداء من النص الملصق!` 
          : `Success! Extracted and updated ${updatedCount} KPIs from pasted spreadsheet cell strings!`
        );
        setData(updated);
        saveKPIData(updated);
        setPasteData('');
      } else {
        toast.warning(isRtl 
          ? 'لم نتمكن من مطابقة أسماء مؤشرات الأداء الحالية مع المحتوى الملصق. يرجى التحقق من صياغة السطر الأول لكل مؤشر.' 
          : 'Could not match standard KPI names with pasted content labels.'
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'فشل تحليل النص الملصق. تأكد من صحة النسخ من الجدول' : 'Failed to parse paste text. Verify spreadsheet cell selection is clean');
    }
  };

  // Sync via Google Sheet public CSV URL
  const handleSyncGoogleSheet = async () => {
    if (!sheetUrl.trim()) {
      toast.error(isRtl ? 'يرجى إدخال رابط مستند جوجل شيت صالح أولاً' : 'Please input a valid Google Sheet URL first');
      return;
    }

    setSyncing(true);
    toast.loading(isRtl ? 'جاري الاتصال بجوجل شيت وجلب البيانات...' : 'Connecting to Google Sheets & fetching csv data...', { id: 'gs-sync' });

    try {
      // If user inputs full Google Sheet edit link, dynamically convert it to the export?format=csv link!
      let exportUrl = sheetUrl.trim();
      if (exportUrl.includes('docs.google.com/spreadsheets') && !exportUrl.includes('export?format=csv') && !exportUrl.includes('/pub?')) {
        const parts = exportUrl.split('/d/');
        if (parts.length > 1) {
          const sheetID = parts[1].split('/')[0];
          exportUrl = `https://docs.google.com/spreadsheets/d/${sheetID}/export?format=csv`;
        }
      }

      // We send client-side request to pull public published google sheets csv
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error('Google Sheet response was not OK');
      }

      const csvText = await response.text();
      
      // Parse CSV
      const rows = csvText.split('\n').map(row => {
        // Clean CSV quotes
        return row.split(',').map(cell => cell.replace(/^["']|["']$/g, '').trim());
      });

      let updated = { ...data, sourceSheetUrl: sheetUrl };
      let updatedCount = 0;

      rows.forEach(cells => {
        if (cells.length < 2) return;
        const key = cells[0].toLowerCase().trim();
        const secondVal = parseFloat(cells[1]?.replace(/[%,]/g, ''));
        const thirdVal = parseFloat(cells[2]?.replace(/[%,]/g, ''));

        if (isNaN(secondVal)) return;

        // Perform keyword checks
        if (key.includes('إجمالي الإنتاج') || key.includes('total production')) {
          updated.prodTotal.actual = secondVal;
          if (!isNaN(thirdVal)) updated.prodTotal.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('الكفاءة الإنتاجية') || key.includes('productivity efficiency')) {
          updated.prodEfficiency.actual = secondVal;
          if (!isNaN(thirdVal)) updated.prodEfficiency.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('product waste')) {
          updated.prodWaste.actual = secondVal;
          if (!isNaN(thirdVal)) updated.prodWaste.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('film waste')) {
          updated.prodFilmWaste.actual = secondVal;
          if (!isNaN(thirdVal)) updated.prodFilmWaste.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('rework')) {
          updated.prodRework.actual = secondVal;
          if (!isNaN(thirdVal)) updated.prodRework.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('hold') || key.includes('حالات الـ hold')) {
          updated.qualHoldCases.actual = secondVal;
          if (!isNaN(thirdVal)) updated.qualHoldCases.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('فود سيفتي') || key.includes('food safety')) {
          updated.qualFoodSafety.actual = secondVal;
          if (!isNaN(thirdVal)) updated.qualFoodSafety.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('gmp')) {
          updated.qualGmpScore.actual = secondVal;
          if (!isNaN(thirdVal)) updated.qualGmpScore.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('حوادث وشيكة') || key.includes('near-misses')) {
          updated.safeNearMisses.actual = secondVal;
          if (!isNaN(thirdVal)) updated.safeNearMisses.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('مخاطر السلامة') || key.includes('safety risks')) {
          updated.safeOpenRisks.actual = secondVal;
          if (!isNaN(thirdVal)) updated.safeOpenRisks.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('الحاويات المشحونة') || key.includes('shipped containers')) {
          updated.whShippedContainers.actual = secondVal;
          if (!isNaN(thirdVal)) updated.whShippedContainers.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('أوامر التحميل') || key.includes('executed loading')) {
          updated.whExecutedOrders.actual = secondVal;
          if (!isNaN(thirdVal)) updated.whExecutedOrders.target = thirdVal;
          updatedCount++;
        }
        else if (key.includes('otif') || key.includes('الشحن في الموعد')) {
          updated.whOtif.actual = secondVal;
          if (!isNaN(thirdVal)) updated.whOtif.target = thirdVal;
          updatedCount++;
        }
      });

      toast.dismiss('gs-sync');
      if (updatedCount > 0) {
        toast.success(isRtl
          ? `تم تحديث ${updatedCount} مؤشر أداء بنجاح من جوجل شيت!`
          : `Fetched and synchronized ${updatedCount} KPIs successfully from Google Sheet!`
        );
        setData(updated);
        saveKPIData(updated);
        setShowConfig(false);
      } else {
        toast.warning(isRtl
          ? 'لم نجد مؤشرات مطابقة بمسمياتها في السطور الأولى. يرجى تنزيل نموذج التخطيط المعتاد.'
          : 'Parsed Google Sheet but no matching KPI labels found.'
        );
      }

    } catch (err) {
      console.error(err);
      toast.dismiss('gs-sync');
      toast.error(isRtl 
        ? 'فشل الاتصال بجوجل شيت. تأكد من أن المستند عام (متاح للجميع ممن لديهم الرابط) ومنشور كـ CSV' 
        : 'Failed to request spreadsheet. Ensure it is published as web CSV and has public access setup.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenManualEditor = () => {
    setEditFormData({ ...data });
    setShowEditor(true);
  };

  const handleSaveManualEdit = () => {
    saveKPIData(editFormData);
  };

  // Form group wrapper
  const handleEditField = (section: string, key: string, field: 'actual' | 'target', value: number) => {
    setEditFormData(prev => {
      const copy = { ...prev };
      const secObj = (copy as any)[section];
      if (secObj) {
        if (secObj[key] && typeof secObj[key] === 'object') {
          secObj[key][field] = value;
        } else {
          secObj[field] = value;
        }
      }
      return copy;
    });
  };

  const handleEditLineField = (lineKey: string, field: string, value: number) => {
    setEditFormData(prev => {
      const copy = { ...prev };
      const lineObj = (copy as any)[lineKey];
      if (lineObj) {
        lineObj[field] = value;
      }
      return copy;
    });
  };

  const handleOverrideStatus = (section: string, key: string, status: string) => {
    setEditFormData(prev => {
      const copy = { ...prev };
      const secObj = (copy as any)[section];
      if (secObj) {
        if (secObj[key] && typeof secObj[key] === 'object') {
          secObj[key].statusOverride = status === 'auto' ? undefined : status;
        } else {
          secObj.statusOverride = status === 'auto' ? undefined : status;
        }
      }
      return copy;
    });
  };

  // Derived indicator status calculations
  const prod1Status = getKpiStatus(data.prodTotal.actual, data.prodTotal.target, 'higher-better', data.prodTotal.statusOverride);
  const prod2Status = getKpiStatus(data.prodEfficiency.actual, data.prodEfficiency.target, 'higher-better', data.prodEfficiency.statusOverride);
  const prod3Status = getKpiStatus(data.prodWaste.actual, data.prodWaste.target, 'lower-better', data.prodWaste.statusOverride);
  const prod4Status = getKpiStatus(data.prodFilmWaste.actual, data.prodFilmWaste.target, 'lower-better', data.prodFilmWaste.statusOverride);
  const prod5Status = getKpiStatus(data.prodRework.actual, data.prodRework.target, 'lower-better', data.prodRework.statusOverride);

  const qual1Status = getKpiStatus(data.qualHoldCases.actual, data.qualHoldCases.target, 'lower-better', data.qualHoldCases.statusOverride);
  const qual2Status = getKpiStatus(data.qualFoodSafety.actual, data.qualFoodSafety.target, 'equal-zero', data.qualFoodSafety.statusOverride);
  const qual3Status = getKpiStatus(data.qualGmpScore.actual, data.qualGmpScore.target, 'higher-better', data.qualGmpScore.statusOverride);

  const safe1Status = getKpiStatus(data.safeNearMisses.actual, data.safeNearMisses.target, 'equal-zero', data.safeNearMisses.statusOverride);
  const safe2Status = getKpiStatus(data.safeOpenRisks.actual, data.safeOpenRisks.target, 'equal-zero', data.safeOpenRisks.statusOverride);

  const wh1Status = getKpiStatus(data.whShippedContainers.actual, data.whShippedContainers.target, 'higher-better', data.whShippedContainers.statusOverride);
  const wh2Status = getKpiStatus(data.whExecutedOrders.actual, data.whExecutedOrders.target, 'higher-better', data.whExecutedOrders.statusOverride);
  const wh3Status = getKpiStatus(data.whOtif.actual, data.whOtif.target, 'higher-better', data.whOtif.statusOverride);

  // New Maintenance statuses
  const maint1Status = getKpiStatus(data.maintPlanned.actual, data.maintPlanned.target, 'higher-better', data.maintPlanned.statusOverride);
  const maint2Status = getKpiStatus(data.maintBreakdowns.actual, data.maintBreakdowns.target, 'lower-better', data.maintBreakdowns.statusOverride);
  const maint3Status = getKpiStatus(data.maintMttr.actual, data.maintMttr.target, 'lower-better', data.maintMttr.statusOverride);

  // New Energy statuses
  const energy1Status = getKpiStatus(data.energyPower.actual, data.energyPower.target, 'lower-better', data.energyPower.statusOverride);
  const energy2Status = getKpiStatus(data.energyWater.actual, data.energyWater.target, 'lower-better', data.energyWater.statusOverride);

  // Line calculations & statuses
  const getLineEffStatus = (actual: number, target: number) => {
    if (actual >= target) return 'success';
    if (actual >= target - 3) return 'warning';
    return 'danger';
  };

  const line1_eff_calc = data.linePacking1.prodPlanned > 0 ? Math.round((data.linePacking1.prod / data.linePacking1.prodPlanned) * 100) : 0;
  const line2_eff_calc = data.linePacking2.prodPlanned > 0 ? Math.round((data.linePacking2.prod / data.linePacking2.prodPlanned) * 100) : 0;
  const line3_eff_calc = data.linePackaging1.prodPlanned > 0 ? Math.round((data.linePackaging1.prod / data.linePackaging1.prodPlanned) * 100) : 0;
  const line4_eff_calc = data.linePackaging2.prodPlanned > 0 ? Math.round((data.linePackaging2.prod / data.linePackaging2.prodPlanned) * 100) : 0;

  const handleToggleFullscreen = () => {
    setIsTvMode(prev => {
      const nextVal = !prev;
      if (nextVal) {
        try {
          const docEl = document.documentElement;
          if (docEl.requestFullscreen) {
            docEl.requestFullscreen();
          }
        } catch (e) {
          console.warn("Fullscreen request was prevented or not supported inside frame container.", e);
        }
      } else {
        try {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
        } catch (e) {
          console.warn("Could not exit fullscreen", e);
        }
      }
      return nextVal;
    });
  };

  const isTvThemeDark = isTvMode && tvTheme === 'dark';

  return (
    <div 
      className={`space-y-6 transition-all duration-300 ${
        isTvMode 
          ? `fixed inset-0 z-[9999] overflow-auto p-6 md:p-8 flex flex-col ${isTvThemeDark ? 'tv-dark-override bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'}` 
          : ''
      } ${tvBlackText ? 'tv-black-text' : ''}`}
      style={{ direction: 'rtl' }}
    >
      
      {isTvMode ? (
        /* GORGEOUS AUTOPLAYING INDUSTRIAL WIDESCREEN TV FLOATING CONTROL BAR WITH HOVER-TO-SHOW AUTO-HIDE */
        <div className="w-full sticky top-0 z-[10000] group -mt-4 pt-4 pb-2 transition-all duration-300">
          {/* Subtle horizontal indicator line at the top to guide the user */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500/20 group-hover:bg-transparent transition-colors cursor-pointer" />
          
          {/* Main sliding container */}
          <div 
            id="tv-control-bar" 
            className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl mb-1 border transition-all duration-500 ease-in-out transform -translate-y-full opacity-0 pointer-events-none group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto ${
              tvTheme === 'dark' 
                ? 'bg-zinc-900/95 border-zinc-800 text-zinc-200 shadow-2xl shadow-black/55' 
                : 'bg-white/95 border-zinc-200 text-zinc-800 shadow-2xl shadow-zinc-200/50'
            } backdrop-blur-md select-none`}
            title={isRtl ? 'ضع مؤشر الماوس في الأعلى لإظهار الشريط العام' : 'Hover over the very top to reveal control bar'}
          >
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-[#0D5F54] dark:text-emerald-400">شاشة عرض مؤشرات الأداء (بث التلفزيون)</span>
                <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg">تحديث تلقائي مستمر</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                {isRtl 
                  ? `مزامنة مباشرة عبر السحاب | التحديث التلقائي القادم بعد: ${refreshTimer} ثانية | اضغط Esc أو زر إغلاق للمغادرة`
                  : `Persistent cloud synchronization active | Next refresh in: ${refreshTimer}s | Press Esc or exit button to leave`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sizing Scaling Keyboard instructions & buttons */}
            <div className={`flex items-center gap-2 border px-3 py-1 rounded-2xl ${
              tvTheme === 'dark' ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-zinc-50'
            }`}>
              <span className="text-[10px] font-bold text-zinc-400">{isRtl ? 'حجم العرض التلقائي:' : 'Display Zoom:'}</span>
              <button 
                onClick={() => setTvZoom(z => Math.max(0.4, parseFloat((z - 0.1).toFixed(2))))}
                className="w-6 h-6 flex items-center justify-center hover:bg-zinc-500/10 rounded-lg text-xs font-bold"
                title={isRtl ? 'تصغير حجم اللوحة' : 'Zoom Out'}
              >
                -
              </button>
              <span className="text-xs font-black min-w-[2.5rem] text-center font-mono">{Math.round(tvZoom * 100)}%</span>
              <button 
                onClick={() => setTvZoom(z => Math.min(3.5, parseFloat((z + 0.1).toFixed(2))))}
                className="w-6 h-6 flex items-center justify-center hover:bg-zinc-500/10 rounded-lg text-xs font-bold"
                title={isRtl ? 'تكبير حجم اللوحة' : 'Zoom In'}
              >
                +
              </button>
            </div>

            {/* Font Scale mode specifically for long-distance TV dashboards */}
            <div className={`flex items-center gap-1.5 border px-3 py-1 rounded-2xl ${
              tvTheme === 'dark' ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-zinc-50'
            }`}>
              <span className="text-[10px] font-black text-zinc-400">{isRtl ? 'حجم الخط للمسافة:' : 'Distance Font:'}</span>
              
              <button
                onClick={() => setTvFontScale('huge')}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  tvFontScale === 'huge'
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'hover:bg-zinc-500/10 text-zinc-400'
                }`}
                title={isRtl ? 'تكبير فائق مخصص للرؤية من مسافة ٢٠ متر تقريباً' : 'Ultra enlarged font for 20m distance viewing'}
              >
                {isRtl ? '٢٠ متر (ضخم)' : '20m (Huge)'}
              </button>
              
              <button
                onClick={() => setTvFontScale('large')}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  tvFontScale === 'large'
                    ? 'bg-teal-600 text-white shadow-md' 
                    : 'hover:bg-zinc-500/10 text-zinc-400'
                }`}
                title={isRtl ? 'تكبير مخصص للرؤية من مسافة ١٠ أمتار تقريباً' : 'Enlarged font for 10m distance viewing'}
              >
                {isRtl ? '١٠ متر (كبير)' : '10m (Large)'}
              </button>

              <button
                onClick={() => setTvFontScale('normal')}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  tvFontScale === 'normal'
                    ? 'bg-zinc-500 text-white shadow-md' 
                    : 'hover:bg-zinc-500/10 text-zinc-400'
                }`}
                title={isRtl ? 'حجم الخط الأساسي للمشاهدة القريبة' : 'Standard font size'}
              >
                {isRtl ? 'قريب (عادي)' : 'Normal'}
              </button>
            </div>

            {/* TV Day Night theme toggler */}
            <button
              onClick={() => setTvTheme(t => t === 'light' ? 'dark' : 'light')}
              className={`p-2 rounded-2xl border transition-colors ${
                tvTheme === 'dark' 
                  ? 'bg-zinc-800 border-zinc-700 text-amber-400 hover:bg-zinc-700' 
                  : 'bg-zinc-50 border-zinc-200 text-indigo-900 hover:bg-zinc-100'
              }`}
              title={isRtl ? 'تبديل المظهر النهاري/المسائي للتلفزيون' : 'Switch TV Widescreen Dark/Light colors'}
            >
              {tvTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* High Contrast Black Text Toggle Button */}
            <button
              onClick={() => setTvBlackText(b => !b)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border transition-all cursor-pointer ${
                tvBlackText 
                  ? 'bg-black text-white hover:bg-zinc-950 border-black shadow-md shadow-black/10' 
                  : (tvTheme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100')
              }`}
              title={isRtl ? 'تبديل كتابة اللون الأسود الفائق' : 'Toggle 100% Solid Black Text Contrast'}
            >
              <Eye size={14} className={tvBlackText ? 'text-emerald-400' : ''} />
              <span className="text-xs font-black">{isRtl ? 'كتابة سوداء فائقة التباين' : 'Black Text Only'}</span>
            </button>

            {/* Exit Mode button */}
            <button
              onClick={handleToggleFullscreen}
              className="flex items-center gap-1.5 px-4.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/15 rounded-2xl text-xs font-extrabold transition-all cursor-pointer"
            >
              <Minimize2 size={13} />
              <span>{isRtl ? 'خروج من البث' : 'Exit TV Broadcast'}</span>
            </button>
          </div>
        </div>
        </div>
      ) : (
        /* Configuration Header Action buttons */
        <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-100/50 dark:bg-zinc-800/30 p-4 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/30">
          <div className="flex items-center gap-3">
            <LayoutGrid className="text-emerald-500 w-6 h-6 animate-pulse" />
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {isRtl ? 'لوحة متابعة مؤشرات الأداء اليومية' : 'Daily KPI Monitoring Dashboard'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isRtl ? 'استعراض حالة الإنتاج، الجودة والسلامة ومزامنتها مباشرة من جوجل شيت' : 'Inspect production, quality & safety metrics compiled or pulled from web sheets'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Calendar Picker */}
            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-1.5 shadow-sm text-xs font-bold text-zinc-700 dark:text-zinc-300">
              <Calendar size={14} className="text-zinc-400 mr-1.5 ml-1.5" />
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent outline-none cursor-pointer focus:ring-0 text-xs w-28 md:w-auto"
              />
            </div>

            {/* Sync Button */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-black transition-all border border-emerald-500/15"
            >
              <FileSpreadsheet size={14} />
              <span>{isRtl ? 'ربط جوجل شيت' : 'Sync Google Sheet'}</span>
            </button>

            {/* Manual Editor Trigger */}
            <button
              onClick={handleOpenManualEditor}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl text-xs font-black transition-all border border-blue-500/15"
            >
              <Edit3 size={14} />
              <span>{isRtl ? 'تعديل يدوي' : 'Manual Edit'}</span>
            </button>

            {/* TV Broadcast launch button */}
            <button
              onClick={handleToggleFullscreen}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-2xl text-xs font-black transition-all border border-teal-500/15"
              title={isRtl ? 'بث على شاشة التلفزيون' : 'Broadcast to TV Screen'}
            >
              <Tv size={14} className="animate-pulse" />
              <span>{isRtl ? 'بث التلفزيون (كامل الشاشة)' : 'TV Broadcast Mode'}</span>
            </button>

            {/* Standard Black Text Toggle */}
            <button
              onClick={() => setTvBlackText(b => !b)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-black transition-all border cursor-pointer ${
                tvBlackText
                  ? 'bg-black text-white hover:bg-zinc-950 border-black shadow shadow-black/10'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
              }`}
              title={isRtl ? 'تبديل المظهر فائق التباين للكتابة باللون الأسود بالكامل' : 'Toggle 100% Solid Black Text Contrast'}
            >
              <Eye size={14} className={tvBlackText ? 'text-emerald-400' : 'text-zinc-400'} />
              <span>{isRtl ? 'كتابة سوداء فائقة التباين' : 'Extreme Black Text'}</span>
            </button>

            {/* PDF Exporter */}
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-2xl text-xs font-black transition-all shadow-md"
            >
              <Printer size={14} />
              <span>{isRtl ? 'تحميل كـ PDF' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Sheets Sync Collapsible Panel - Hidden on TV Mode */}
      <AnimatePresence>
        {!isTvMode && showConfig && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white dark:bg-zinc-900 border border-emerald-500/15 rounded-3xl p-5 shadow-xl space-y-4"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Settings size={16} className="text-emerald-500 animate-spin" style={{ animationDuration: '6s' }} />
                <span>{isRtl ? 'إعدادات مزامنة البيانات والربط' : 'Google Sheets & Excel Data Syncer'}</span>
              </h3>
              <button onClick={() => setShowConfig(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Option 1: Direct link sync */}
              <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950/30 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-850">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black">1</div>
                  <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">
                    {isRtl ? 'مزامنة مباشرة برابط الويب' : 'Option A: Published CSV Web Link'}
                  </h4>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  {isRtl 
                    ? "من مستند جوجل شيت: ملف -> مشاركة -> النشر على الويب -> اختر 'قيم مفصولة بفاصلة (CSV)'. الصق الرابط هنا واضغط مزامنة:"
                    : "From Google Sheets: File -> Share -> Publish to Web -> Output as CSV. Paste web link here and sync:"}
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    onClick={handleSyncGoogleSheet}
                    disabled={syncing}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-all disabled:opacity-50 flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                    <span>{isRtl ? 'مزامنة' : 'Sync Link'}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Live Copy-Paste */}
              <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950/30 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-850">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2.5 bg-blue-500 text-white rounded-xl text-[10px] font-black">2</div>
                  <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">
                    {isRtl ? 'نسخ ولصق سريع للخلية من إكسل / جوجل شيت' : 'Option B: Instant Copy-Paste from Cells'}
                  </h4>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  {isRtl 
                    ? "حدد نطاق الخلايا في إكسل أو شيت (الاسم والقيمة) ، اضغط نسخ ثم الصق هنا مباشرة وسنتولى الباقي!"
                    : "Select table block in your sheet, copy (Ctrl+C), paste below in the textbox and parse:"}
                </p>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder={isRtl ? "إجمالي الإنتاج (كجم)\t52980\t50000\nproduct waste\t0.4%" : "Paste cells block here..."}
                    value={pasteData}
                    onChange={(e) => setPasteData(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl focus:ring-1 focus:ring-blue-500 font-mono h-14"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handlePasteParse}
                      className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Database size={13} />
                      <span>{isRtl ? 'تحليل وقراءة النص الملصق' : 'Parse Pasted'}</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-24 space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-zinc-500">{isRtl ? 'جاري قراءة لوحة مؤشرات الأداء...' : 'Syncing KPI boards...'}</p>
        </div>
      ) : (
        
        /* THE ACTUAL INTERACTIVE HIGH-FIDELITY BOARD DOCUMENT */
        <div className={`overflow-x-auto w-full pb-4 ${isTvMode ? 'flex-1 flex items-start justify-center' : ''}`}>
          <div 
            ref={boardRef}
            style={isTvMode ? { 
              transform: `scale(${tvZoom})`, 
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease-out',
              minWidth: '1380px'
            } : undefined}
            className={`w-full max-w-[1420px] mx-auto p-6 md:p-8 rounded-[32px] border shadow-2xl space-y-6 transition-all duration-300 ${isTvThemeDark ? 'tv-dark-override-card text-zinc-100 border-zinc-800' : 'bg-white border-zinc-200/50 text-zinc-800'} ${isTvMode ? (tvFontScale === 'huge' ? 'tv-font-huge' : tvFontScale === 'large' ? 'tv-font-large' : '') : ''}`}
            dir="rtl"
          >
            
            {/* RICH LAND DOCUMENT HEADER */}
            <div className="flex flex-col md:flex-row items-center justify-between border-b border-zinc-300 pb-5 gap-6">
              
              {/* Brand and Logo */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-12 h-12 rounded-full border-4 border-[#0E5F59] flex items-center justify-center bg-white shadow-md relative overflow-hidden select-none">
                  {/* Styled Green Circle RL Logo representation */}
                  <div className="absolute inset-0 bg-[#0E5F59]/5" />
                  <div className="text-xl font-extrabold text-[#0E5F59] font-serif tracking-tight leading-none">RL</div>
                  <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div>
                  <h1 className={`text-3xl font-black tracking-tight font-serif leading-none transition-colors duration-300 ${isTvThemeDark ? 'text-teal-400' : 'text-[#0D5F54]'}`}>Rich Land</h1>
                  <p className="text-[10px] font-extrabold text-emerald-600 tracking-widest uppercase mt-1">FOOD INDUSTRIES</p>
                </div>
              </div>

              {/* Centered Dashboard Titles */}
              <div className="text-center space-y-1.5 flex-1 select-none">
                <h2 className={`text-3xl font-black tracking-wider font-sans transition-colors duration-300 ${isTvThemeDark ? 'text-zinc-100' : 'text-[#0E5F59]'}`}>
                  لوحة متابعة مؤشرات الأداء اليومية
                </h2>
                <h3 className={`text-xl font-bold tracking-wide transition-colors duration-300 ${isTvThemeDark ? 'text-emerald-400' : 'text-[#005370]'}`}>
                  ريتش لاند للصناعات الغذائية
                </h3>
              </div>

              {/* Top Right Date/Shift Block Grid */}
              <div className={`grid grid-cols-2 gap-y-2.5 gap-x-4 p-4 rounded-2xl border min-w-[270px] text-xs font-bold leading-none transition-all duration-300 ${
                isTvThemeDark 
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-300' 
                  : 'bg-zinc-50 border-zinc-200/80 text-zinc-800'
              }`}>
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <Calendar size={13} className="text-emerald-600 animate-pulse" />
                  <span>التاريخ:</span>
                </div>
                <div className="text-left select-text underline decoration-emerald-500/30 underline-offset-2">
                  {date.split('-').reverse().join(' / ')}
                </div>

                <div className="flex items-center gap-1.5 text-zinc-500">
                  <Clock size={13} className="text-emerald-600" />
                  <span>اليوم:</span>
                </div>
                <div className={`text-left font-extrabold ${isTvThemeDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {data.dayName}
                </div>

                <div className="flex items-center gap-1.5 text-zinc-500 col-span-1">
                  <Users size={13} className="text-emerald-600" />
                  <span>الوردية:</span>
                </div>
                <div className="text-left text-emerald-500 font-extrabold">
                  {data.shift}
                </div>
              </div>
            </div>

            {/* SEGMENTS GRID (NOW UPGRADED TO Symmetrical 6-COLUMN MASTER GRID FOR ALL INDUSTRIAL CATEGORIES) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              
              {/* CARD 1: Production (الإنتاج) */}
              <div id="kpi-card-production" className="border border-zinc-200 rounded-[24px] overflow-hidden shadow-sm flex flex-col bg-white">
                <div className="p-3 px-4 bg-[#0E5F59] text-white flex items-center justify-between font-black">
                  <span className="text-sm tracking-wide">الإنتاج (Production)</span>
                  <Settings size={15} />
                </div>
                <div className="flex-1 p-2">
                  <table className="w-full text-[11px] font-bold border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-400 text-right">
                        <th className="py-1.5 pb-2 text-right">مؤشر الأداء</th>
                        <th className="py-1.5 pb-2 text-center w-14">الفعلي</th>
                        <th className="py-1.5 pb-2 text-center w-14">المستهدف</th>
                        <th className="py-1.5 pb-2 text-center w-8">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2 text-right font-black">إجمالي الإنتاج (كجم)</td>
                        <td className="py-2 text-center text-zinc-950 font-black">{data.prodTotal.actual.toLocaleString()}</td>
                        <td className="py-2 text-center text-zinc-400 font-medium">{data.prodTotal.target.toLocaleString()}</td>
                        <td className="py-2 flex justify-center">{renderStatusIcon(prod1Status)}</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2 text-right font-black">(%) الكفاءة الإنتاجية</td>
                        <td className="py-2 text-center text-zinc-950 font-black">{data.prodEfficiency.actual}%</td>
                        <td className="py-2 text-center text-zinc-400 font-medium">{data.prodEfficiency.target}%</td>
                        <td className="py-2 flex justify-center">{renderStatusIcon(prod2Status)}</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2 text-right font-black">Product Waste (%)</td>
                        <td className="py-2 text-center text-zinc-950 font-black">{data.prodWaste.actual}%</td>
                        <td className="py-2 text-center text-zinc-400 font-medium">≤ {data.prodWaste.target}%</td>
                        <td className="py-2 flex justify-center">{renderStatusIcon(prod3Status)}</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2 text-right font-black">Film Waste (%)</td>
                        <td className="py-2 text-center text-zinc-950 font-black">{data.prodFilmWaste.actual}%</td>
                        <td className="py-2 text-center text-zinc-400 font-medium">≤ {data.prodFilmWaste.target}%</td>
                        <td className="py-2 flex justify-center">{renderStatusIcon(prod4Status)}</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2 text-right font-black">Rework (%)</td>
                        <td className="py-2 text-center text-zinc-950 font-black">{data.prodRework.actual}%</td>
                        <td className="py-2 text-center text-zinc-400 font-medium">≤ {data.prodRework.target}%</td>
                        <td className="py-2 flex justify-center">{renderStatusIcon(prod5Status)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CARD 2: Quality (الجودة) */}
              <div id="kpi-card-quality" className="border border-zinc-200 rounded-[24px] overflow-hidden shadow-sm flex flex-col bg-white">
                <div className="p-3 px-4 bg-[#005370] text-white flex items-center justify-between font-black">
                  <span className="text-sm tracking-wide">الجودة (Quality)</span>
                  <Info size={15} />
                </div>
                <div className="flex-1 p-2">
                  <table className="w-full text-[11px] font-bold border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-400 text-right">
                        <th className="py-1.5 pb-2 text-right">مؤشر الأداء</th>
                        <th className="py-1.5 pb-2 text-center w-14">الفعلي</th>
                        <th className="py-1.5 pb-2 text-center w-14">المستهدف</th>
                        <th className="py-1.5 pb-2 text-center w-8">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2.5 text-right font-black">عدد حالات الـ Hold</td>
                        <td className="py-2.5 text-center text-zinc-950 font-black">{data.qualHoldCases.actual}</td>
                        <td className="py-2.5 text-center text-zinc-400 font-medium">{data.qualHoldCases.target}</td>
                        <td className="py-2.5 flex justify-center">{renderStatusIcon(qual1Status)}</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2.5 text-right font-black">مخالفات الفود سيفتي</td>
                        <td className="py-2.5 text-center text-zinc-950 font-black">{data.qualFoodSafety.actual}</td>
                        <td className="py-2.5 text-center text-zinc-400 font-medium">{data.qualFoodSafety.target}</td>
                        <td className="py-2.5 flex justify-center">{renderStatusIcon(qual2Status)}</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2.5 text-right font-black">GMP Score (%)</td>
                        <td className="py-2.5 text-center text-zinc-950 font-black">{data.qualGmpScore.actual}%</td>
                        <td className="py-2.5 text-center text-zinc-400 font-medium">≥ {data.qualGmpScore.target}%</td>
                        <td className="py-2.5 flex justify-center">{renderStatusIcon(qual3Status)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CARD 3: Safety (السلامة) */}
              <div id="kpi-card-safety" className="border border-zinc-200 rounded-[24px] overflow-hidden shadow-sm flex flex-col bg-white">
                <div className="p-3 px-4 bg-[#1B733D] text-white flex items-center justify-between font-black">
                  <span className="text-sm tracking-wide">السلامة (Safety)</span>
                  <AlertCircle size={15} />
                </div>
                <div className="flex-1 p-2">
                  <table className="w-full text-[11px] font-bold border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-400 text-right">
                        <th className="py-1.5 pb-2 text-right">مؤشر الأداء</th>
                        <th className="py-1.5 pb-2 text-center w-14">الفعلي</th>
                        <th className="py-1.5 pb-2 text-center w-14">المستهدف</th>
                        <th className="py-1.5 pb-2 text-center w-8">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      <tr className="hover:bg-zinc-50">
                        <td className="py-3.5 text-right font-black">عدد الحوادث الوشيكة</td>
                        <td className="py-3.5 text-center text-zinc-950 font-black">{data.safeNearMisses.actual}</td>
                        <td className="py-3.5 text-center text-zinc-400 font-medium">{data.safeNearMisses.target}</td>
                        <td className="py-3.5 flex justify-center">{renderStatusIcon(safe1Status)}</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="py-3.5 text-right font-black">مخاطر السلامة المفتوحة</td>
                        <td className="py-3.5 text-center text-zinc-950 font-black">{data.safeOpenRisks.actual}</td>
                        <td className="py-3.5 text-center text-zinc-400 font-medium">{data.safeOpenRisks.target}</td>
                        <td className="py-3.5 flex justify-center">{renderStatusIcon(safe2Status)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CARD 4: Warehouse & Dispatch */}
              <div id="kpi-card-warehouse" className="border border-zinc-200 rounded-[24px] overflow-hidden shadow-sm flex flex-col bg-white">
                <div className="p-3 px-4 bg-[#798A19] text-white flex items-center justify-between font-black">
                  <span className="text-sm tracking-wide">المستودعات والشحن (Warehouse)</span>
                  <Clock size={15} />
                </div>
                <div className="flex-1 p-2">
                  <table className="w-full text-[11px] font-bold border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-400 text-right">
                        <th className="py-1.5 pb-2 text-right">مؤشر الأداء</th>
                        <th className="py-1.5 pb-2 text-center w-14">الفعلي</th>
                        <th className="py-1.5 pb-2 text-center w-14">المستهدف</th>
                        <th className="py-1.5 pb-2 text-center w-8">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2.5 text-right font-black">عدد الحاويات المشحونة</td>
                        <td className="py-2.5 text-center text-zinc-950 font-black">{data.whShippedContainers.actual}</td>
                        <td className="py-2.5 text-center text-zinc-400 font-medium">{data.whShippedContainers.target}</td>
                        <td className="py-2.5 flex justify-center">{renderStatusIcon(wh1Status)}</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2.5 text-right font-black">عدد أوامر التحميل المنفذة</td>
                        <td className="py-2.5 text-center text-zinc-950 font-black">{data.whExecutedOrders.actual}</td>
                        <td className="py-2.5 text-center text-zinc-400 font-medium">{data.whExecutedOrders.target}</td>
                        <td className="py-2.5 flex justify-center">{renderStatusIcon(wh2Status)}</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2.5 text-right font-black">الشحن في الموعد (% OTIF)</td>
                        <td className="py-2.5 text-center text-zinc-950 font-black">{data.whOtif.actual}%</td>
                        <td className="py-2.5 text-center text-zinc-400 font-medium">≥ {data.whOtif.target}%</td>
                        <td className="py-2.5 flex justify-center">{renderStatusIcon(wh3Status)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CARD 5: Maintenance & Downtime (الصيانة والأعطال) */}
              <div id="kpi-card-maintenance" className="border border-zinc-200 rounded-[24px] overflow-hidden shadow-sm flex flex-col bg-white">
                <div className="p-3 px-4 bg-[#4F46E5] text-white flex items-center justify-between font-black">
                  <span className="text-sm tracking-wide">الصيانة والأعطال (Maintenance)</span>
                  <Wrench size={15} />
                </div>
                <div className="flex-1 p-2">
                  <table className="w-full text-[11px] font-bold border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-400 text-right">
                        <th className="py-1.5 pb-2 text-right">مؤشر الأداء</th>
                        <th className="py-1.5 pb-2 text-center w-14">الفعلي</th>
                        <th className="py-1.5 pb-2 text-center w-14">المستهدف</th>
                        <th className="py-1.5 pb-2 text-center w-8">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2 text-right font-black">صيانة وقائية (% PM)</td>
                        <td className="py-2 text-center text-zinc-950 font-black">{data.maintPlanned.actual}%</td>
                        <td className="py-2 text-center text-zinc-400 font-medium">≥ {data.maintPlanned.target}%</td>
                        <td className="py-2 flex justify-center">{renderStatusIcon(maint1Status)}</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2 text-right font-black">ساعات الأعطال الطارئة</td>
                        <td className="py-2 text-center text-zinc-950 font-black">{data.maintBreakdowns.actual}</td>
                        <td className="py-2 text-center text-zinc-400 font-medium">≤ {data.maintBreakdowns.target}</td>
                        <td className="py-2 flex justify-center">{renderStatusIcon(maint2Status)}</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="py-2 text-right font-black">وقت الإصلاح (MTTR) (د)</td>
                        <td className="py-2 text-center text-zinc-950 font-black">{data.maintMttr.actual}</td>
                        <td className="py-2 text-center text-zinc-400 font-medium">≤ {data.maintMttr.target}</td>
                        <td className="py-2 flex justify-center">{renderStatusIcon(maint3Status)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CARD 6: Energy & Utilities (الطاقة والاستهلاك) */}
              <div id="kpi-card-energy" className="border border-zinc-200 rounded-[24px] overflow-hidden shadow-sm flex flex-col bg-white">
                <div className="p-3 px-4 bg-[#EA580C] text-white flex items-center justify-between font-black">
                  <span className="text-sm tracking-wide">الطاقة والاستهلاك (Energy)</span>
                  <Zap size={15} />
                </div>
                <div className="flex-1 p-2">
                  <table className="w-full text-[11px] font-bold border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-400 text-right">
                        <th className="py-1.5 pb-2 text-right">مؤشر الأداء</th>
                        <th className="py-1.5 pb-2 text-center w-14">الفعلي</th>
                        <th className="py-1.5 pb-2 text-center w-14">المستهدف</th>
                        <th className="py-1.5 pb-2 text-center w-8">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      <tr className="hover:bg-zinc-50">
                        <td className="py-3 text-right font-black">استهلاك الكهرباء (kW)</td>
                        <td className="py-3 text-center text-zinc-950 font-black">{data.energyPower.actual}</td>
                        <td className="py-3 text-center text-zinc-400 font-medium">≤ {data.energyPower.target}</td>
                        <td className="py-3 flex justify-center">{renderStatusIcon(energy1Status)}</td>
                      </tr>
                      <tr className="hover:bg-zinc-50">
                        <td className="py-3 text-right font-black">استهلاك المياه (م³)</td>
                        <td className="py-3 text-center text-zinc-950 font-black">{data.energyWater.actual}</td>
                        <td className="py-3 text-center text-zinc-400 font-medium">≤ {data.energyWater.target}</td>
                        <td className="py-3 flex justify-center">{renderStatusIcon(energy2Status)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* FULL-WIDTH SECTION: PRODUCTION LINES PERFORMANCE (أداء خطوط الإنتاج) */}
            <div id="production-lines-block" className="space-y-3">
              <div className="bg-[#0D5F54] text-white p-2.5 rounded-2xl text-center font-black text-sm select-none tracking-widest shadow-sm">
                أداء خطوط الإنتاج (Production Lines Performance)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Packing Line 1 */}
                <div className="border border-zinc-200 rounded-[20px] overflow-hidden bg-white hover:shadow-md transition-shadow">
                  <div className="p-2 px-3 bg-[#134E4A] text-white flex items-center justify-between text-xs font-black">
                    <span>خط تعبئة 1 (Packing 1)</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="p-2 space-y-2">
                    <table className="w-full text-[10px] font-bold">
                      <thead>
                        <tr className="text-zinc-400 border-b border-zinc-100">
                          <th className="py-1 text-right">المؤشر</th>
                          <th className="py-1 text-center w-12">المخطط</th>
                          <th className="py-1 text-center w-12">الفعلي</th>
                          <th className="py-1 text-center w-12">الكفاءة</th>
                          <th className="py-1 text-center w-6">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500">الإنتاج (كجم)</td>
                          <td className="py-1.5 text-center text-zinc-400">{data.linePacking1.prodPlanned.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">{data.linePacking1.prod.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-[#115E59] font-black">{line1_eff_calc}%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon(getLineEffStatus(line1_eff_calc, 100))}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500">الكفاءة (%)</td>
                          <td className="py-1.5 text-center text-zinc-400">{data.linePacking1.effPlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">{data.linePacking1.eff}%</td>
                          <td className="py-1.5 text-center text-emerald-600 font-black">102%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('success')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500">Product Waste</td>
                          <td className="py-1.5 text-center text-zinc-400">≤ {data.linePacking1.wastePlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">{data.linePacking1.waste}%</td>
                          <td className="py-1.5 text-center text-zinc-300">-</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('success')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500 font-black">Downtime (د)</td>
                          <td className="py-1.5 text-center text-zinc-400">35</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">-</td>
                          <td className="py-1.5 text-center text-zinc-300">-</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('warning')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Packing Line 2 */}
                <div className="border border-zinc-200 rounded-[20px] overflow-hidden bg-white hover:shadow-md transition-shadow">
                  <div className="p-2 px-3 bg-[#134E4A] text-white flex items-center justify-between text-xs font-black">
                    <span>خط تعبئة 2 (Packing 2)</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  </div>
                  <div className="p-2 space-y-2">
                    <table className="w-full text-[10px] font-bold">
                      <thead>
                        <tr className="text-zinc-400 border-b border-zinc-100">
                          <th className="py-1 text-right">المؤشر</th>
                          <th className="py-1 text-center w-12">المخطط</th>
                          <th className="py-1 text-center w-12">الفعلي</th>
                          <th className="py-1 text-center w-12">الكفاءة</th>
                          <th className="py-1 text-center w-6">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500">الإنتاج (كجم)</td>
                          <td className="py-1.5 text-center text-zinc-400">{data.linePacking2.prodPlanned.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">{data.linePacking2.prod.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-[#115E59] font-black">{line2_eff_calc}%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon(getLineEffStatus(line2_eff_calc, 100))}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500">الكفاءة (%)</td>
                          <td className="py-1.5 text-center text-zinc-400">{data.linePacking2.effPlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">{data.linePacking2.eff}%</td>
                          <td className="py-1.5 text-center text-amber-655 font-black">98%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('warning')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500">Product Waste</td>
                          <td className="py-1.5 text-center text-zinc-400">≤ {data.linePacking2.wastePlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">{data.linePacking2.waste}%</td>
                          <td className="py-1.5 text-center text-zinc-300">-</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('warning')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500 font-black">Downtime (د)</td>
                          <td className="py-1.5 text-center text-zinc-400">42</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">-</td>
                          <td className="py-1.5 text-center text-zinc-300">-</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('danger')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Packaging Line 1 */}
                <div className="border border-zinc-200 rounded-[20px] overflow-hidden bg-white hover:shadow-md transition-shadow">
                  <div className="p-2 px-3 bg-[#134E4A] text-white flex items-center justify-between text-xs font-black">
                    <span>خط تغليف 1 (Packaging 1)</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="p-2 space-y-2">
                    <table className="w-full text-[10px] font-bold">
                      <thead>
                        <tr className="text-zinc-400 border-b border-zinc-100">
                          <th className="py-1 text-right">المؤشر</th>
                          <th className="py-1 text-center w-12">المخطط</th>
                          <th className="py-1 text-center w-12">الفعلي</th>
                          <th className="py-1 text-center w-12">الكفاءة</th>
                          <th className="py-1 text-center w-6">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500">الإنتاج (كرتونة)</td>
                          <td className="py-1.5 text-center text-zinc-400">{data.linePackaging1.prodPlanned.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">{data.linePackaging1.prod.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-[#115E59] font-black">{line3_eff_calc}%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon(getLineEffStatus(line3_eff_calc, 100))}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500">الكفاءة (%)</td>
                          <td className="py-1.5 text-center text-zinc-400">{data.linePackaging1.effPlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">{data.linePackaging1.eff}%</td>
                          <td className="py-1.5 text-center text-emerald-600 font-black">104%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('success')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500">Film Waste</td>
                          <td className="py-1.5 text-center text-zinc-400">≤ {data.linePackaging1.wastePlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">{data.linePackaging1.waste}%</td>
                          <td className="py-1.5 text-center text-zinc-300">-</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('success')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500 font-black">Downtime (د)</td>
                          <td className="py-1.5 text-center text-zinc-400">25</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">-</td>
                          <td className="py-1.5 text-center text-zinc-300">-</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('success')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Packaging Line 2 */}
                <div className="border border-zinc-200 rounded-[20px] overflow-hidden bg-white hover:shadow-md transition-shadow">
                  <div className="p-2 px-3 bg-[#134E4A] text-white flex items-center justify-between text-xs font-black">
                    <span>خط تغليف 2 (Packaging 2)</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDuration: '4s' }} />
                  </div>
                  <div className="p-2 space-y-2">
                    <table className="w-full text-[10px] font-bold">
                      <thead>
                        <tr className="text-zinc-400 border-b border-zinc-100">
                          <th className="py-1 text-right">المؤشر</th>
                          <th className="py-1 text-center w-12">المخطط</th>
                          <th className="py-1 text-center w-12">الفعلي</th>
                          <th className="py-1 text-center w-12">الكفاءة</th>
                          <th className="py-1 text-center w-6">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500">الإنتاج (كرتونة)</td>
                          <td className="py-1.5 text-center text-zinc-400">{data.linePackaging2.prodPlanned.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">{data.linePackaging2.prod.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-[#115E59] font-black">{line4_eff_calc}%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon(getLineEffStatus(line4_eff_calc, 100))}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500">الكفاءة (%)</td>
                          <td className="py-1.5 text-center text-zinc-400">{data.linePackaging2.effPlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">{data.linePackaging2.eff}%</td>
                          <td className="py-1.5 text-center text-amber-600 font-black">104%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('warning')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500">Film Waste</td>
                          <td className="py-1.5 text-center text-zinc-400">≤ {data.linePackaging2.wastePlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">{data.linePackaging2.waste}%</td>
                          <td className="py-1.5 text-center text-zinc-300">-</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('success')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-500 font-black">Downtime (د)</td>
                          <td className="py-1.5 text-center text-zinc-400">50</td>
                          <td className="py-1.5 text-center text-zinc-900 font-extrabold">-</td>
                          <td className="py-1.5 text-center text-zinc-300">-</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('danger')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

            {/* CHARTS ROW, LEGEND & NOTES GRID (مؤشرات الاتجاه والرسوم البيانية والمذكرات) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
              
              {/* Left Column: Trend chart */}
              <div id="chart-trend-container" className="lg:col-span-4 border border-zinc-200 rounded-[24px] p-4 bg-white flex flex-col justify-between min-h-[290px]">
                <h4 className="text-xs font-black text-center text-zinc-900 flex items-center justify-center gap-1.5 mb-2 border-b border-zinc-150 pb-2 select-none">
                  <TrendingUp size={14} className="text-[#0E5F59]" />
                  <span>مؤشرات الاتجاه (Trend)</span>
                </h4>
                <div className="w-full flex-1 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.weeklyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#888" />
                      <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#888" />
                      <Tooltip contentStyle={{ fontSize: 10, direction: 'rtl', borderRadius: 12 }} />
                      <Line type="monotone" name="efficiency" dataKey="efficiency" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" name="waste" dataKey="waste" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" name="rework" dataKey="rework" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-3 text-[8px] font-bold text-zinc-500 pt-1 select-none">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />الكفاءة الإنتاجية (%)</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />Product Waste (%)</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />Rework (%)</span>
                </div>
              </div>

              {/* Middle Column: Shipped Containers */}
              <div id="chart-containers-container" className="lg:col-span-4 border border-zinc-200 rounded-[24px] p-4 bg-white flex flex-col justify-between min-h-[290px]">
                <h4 className="text-xs font-black text-center text-zinc-900 border-b border-zinc-150 pb-2 mb-2 select-none">
                  أداء الحاويات المشحونة خلال الأسبوع
                </h4>
                <div className="w-full flex-1 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weeklyContainers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#888" />
                      <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#888" />
                      <Tooltip contentStyle={{ fontSize: 10, direction: 'rtl', borderRadius: 12 }} />
                      <Bar dataKey="value" fill="#4B9C49" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center text-[9px] font-bold text-zinc-400 select-none">
                  عدد الحاويات المشحونة يومياً
                </div>
              </div>

              {/* Right Column: Legend Key */}
              <div className="lg:col-span-2 border border-zinc-200 rounded-[24px] p-4 bg-white min-h-[290px] flex flex-col select-none">
                <h4 className="text-xs font-black text-center text-zinc-900 border-b border-zinc-150 pb-2 mb-3">
                  مفتاح الحالة
                </h4>
                <div className="flex-1 flex flex-col justify-center space-y-4 text-xs font-black px-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black shadow-sm">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span>ضمن المستهدف</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white font-black text-lg select-none leading-none">
                      -
                    </div>
                    <span>يحتاج إلى متابعة</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#E11D48] flex items-center justify-center text-white font-black shadow-sm">
                      <X size={14} strokeWidth={3} />
                    </div>
                    <span>خارج المستهدف</span>
                  </div>
                </div>
              </div>

              {/* Far Right Column: Notebook comments block */}
              <div id="notes-notebook-container" className="lg:col-span-2 border border-zinc-200 rounded-[24px] p-4 bg-amber-50/20 dark:bg-zinc-900/10 min-h-[290px] flex flex-col">
                <h4 className="text-xs font-black text-center text-zinc-900 border-b border-zinc-150 pb-2 mb-3 select-none">
                  ملاحظات
                </h4>
                
                {/* Styled Lined Notebook paper look with spacing */}
                <div className="flex-1 flex flex-col relative justify-between">
                  <p className="text-[11px] leading-6 font-semibold text-zinc-650 z-10 px-1 italic select-text">
                    {data.notes || 'لا توجد ملاحظات إضافية مسجلة للوردية اليوم.'}
                  </p>
                  
                  {/* Visual background lines */}
                  <div className="absolute inset-0 flex flex-col justify-start select-none pointer-events-none opacity-45 mt-2">
                    <div className="h-6 border-b border-dashed border-amber-300" />
                    <div className="h-6 border-b border-dashed border-amber-300" />
                    <div className="h-6 border-b border-dashed border-amber-300" />
                    <div className="h-6 border-b border-dashed border-amber-300" />
                    <div className="h-6 border-b border-dashed border-amber-300" />
                    <div className="h-6 border-b border-dashed border-amber-300" />
                    <div className="h-6 border-b border-dashed border-amber-300" />
                    <div className="h-6 border-b border-dashed border-amber-300" />
                  </div>
                </div>
              </div>

            </div>

            {/* CORPORATE IMMERSIVE FOOTER SLOGAN */}
            <div className="bg-[#0E5F59] text-white p-3.5 rounded-[20px] text-center text-sm font-black tracking-widest select-none shadow-md">
              الجودة - السلامة - الكفاءة - الالتزام ... نحو أداء أفضل كل يوم
            </div>

          </div>
        </div>
      )}

      {/* MANUAL EDIT CONFIGURATION MODAL */}
      <AnimatePresence>
        {showEditor && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
            {/* dark backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditor(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center pb-4 border-b border-zinc-150 dark:border-zinc-800 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {isRtl ? 'تعديل قيم مؤشرات الأداء' : 'Edit KPI Monitoring values'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {isRtl ? `تعديل البيانات لـ: ${editFormData.date}` : `Modify fields for: ${editFormData.date}`}
                  </p>
                </div>
                <button onClick={() => setShowEditor(false)} className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200">
                  <X size={20} />
                </button>
              </div>

              {/* Form Content Scrollable */}
              <div className="flex-1 overflow-y-auto py-5 space-y-6 text-xs text-zinc-850 dark:text-zinc-300">
                
                {/* Meta details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl">
                  <div className="space-y-1">
                    <label className="font-bold">{isRtl ? 'الوردية' : 'Shift'}</label>
                    <select
                      value={editFormData.shift}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, shift: e.target.value }))}
                      className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                    >
                      {isRtl ? SHIFTS_AR.map(s => <option key={s} value={s}>{s}</option>) : SHIFTS_EN.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold">{isRtl ? 'اسم اليوم' : 'Day Name'}</label>
                    <input
                      type="text"
                      value={editFormData.dayName}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, dayName: e.target.value }))}
                      className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold"
                    />
                  </div>
                </div>

                {/* 1. Production inputs */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-teal-600 dark:text-teal-400 border-b border-zinc-150 pb-1 flex items-center gap-1 text-sm">
                    <div className="w-1.5 h-3 bg-teal-500 rounded" />
                    <span>{isRtl ? 'قسم الإنتاج (Production)' : 'Production KPIs'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Total prod */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">{isRtl ? 'إجمالي الإنتاج (كجم)' : 'Total Prod (kg)'}</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.prodTotal.actual} onChange={(e) => handleEditField('prodTotal', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.prodTotal.target} onChange={(e) => handleEditField('prodTotal', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                      <div className="pt-1">
                        <span className="text-[10px] text-zinc-400 block">حالة تملص</span>
                        <select value={editFormData.prodTotal.statusOverride || 'auto'} onChange={(e) => handleOverrideStatus('prodTotal', 'actual', e.target.value)} className="w-full p-1 text-[10px] bg-white dark:bg-zinc-900 border rounded">
                          <option value="auto">تلقائي (Auto)</option>
                          <option value="success">✅ مقبول</option>
                          <option value="warning">🟡 متابعة</option>
                          <option value="danger">❌ مرفوض</option>
                        </select>
                      </div>
                    </div>

                    {/* Efficiency */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">{isRtl ? 'الكفاءة الإنتاجية (%)' : 'Productivity Efficiency (%)'}</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.prodEfficiency.actual} onChange={(e) => handleEditField('prodEfficiency', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.prodEfficiency.target} onChange={(e) => handleEditField('prodEfficiency', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                      <div className="pt-1">
                        <span className="text-[10px] text-zinc-400 block">حالة تملص</span>
                        <select value={editFormData.prodEfficiency.statusOverride || 'auto'} onChange={(e) => handleOverrideStatus('prodEfficiency', 'actual', e.target.value)} className="w-full p-1 text-[10px] bg-white dark:bg-zinc-900 border rounded">
                          <option value="auto">تلقائي (Auto)</option>
                          <option value="success">✅ مقبول</option>
                          <option value="warning">🟡 متابعة</option>
                          <option value="danger">❌ مرفوض</option>
                        </select>
                      </div>
                    </div>

                    {/* Product Waste */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">Product Waste (%)</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" step="0.1" value={editFormData.prodWaste.actual} onChange={(e) => handleEditField('prodWaste', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" step="0.1" value={editFormData.prodWaste.target} onChange={(e) => handleEditField('prodWaste', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* 2. Quality inputs */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-blue-605 dark:text-blue-400 border-b border-zinc-150 pb-1 flex items-center gap-1 text-sm">
                    <div className="w-1.5 h-3 bg-blue-500 rounded" />
                    <span>{isRtl ? 'قسم الجودة (Quality)' : 'Quality KPIs'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Hold Cases */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">عدد حالات الـ Hold</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.qualHoldCases.actual} onChange={(e) => handleEditField('qualHoldCases', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.qualHoldCases.target} onChange={(e) => handleEditField('qualHoldCases', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                      <div className="pt-1">
                        <span className="text-[10px] text-zinc-400 block">تجاوز الحالة</span>
                        <select value={editFormData.qualHoldCases.statusOverride || 'auto'} onChange={(e) => handleOverrideStatus('qualHoldCases', 'actual', e.target.value)} className="w-full p-1 text-[10px] bg-white dark:bg-zinc-900 border rounded">
                          <option value="auto">تلقائي (Auto)</option>
                          <option value="success">✅ مقبول</option>
                          <option value="warning">🟡 متابعة</option>
                          <option value="danger">❌ مرفوض</option>
                        </select>
                      </div>
                    </div>

                    {/* Food Safety */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">مخالفات الفود سيفتي</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.qualFoodSafety.actual} onChange={(e) => handleEditField('qualFoodSafety', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.qualFoodSafety.target} onChange={(e) => handleEditField('qualFoodSafety', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                    </div>

                    {/* GMP Score */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">GMP Score (%)</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.qualGmpScore.actual} onChange={(e) => handleEditField('qualGmpScore', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.qualGmpScore.target} onChange={(e) => handleEditField('qualGmpScore', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* 3. Safety inputs */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-red-600 dark:text-red-400 border-b border-zinc-150 pb-1 flex items-center gap-1 text-sm">
                    <div className="w-1.5 h-3 bg-red-500 rounded" />
                    <span>{isRtl ? 'قسم السلامة (Safety)' : 'Safety KPIs'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Near Misses */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">عدد الحوادث الوشيكة (Near Misses)</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.safeNearMisses.actual} onChange={(e) => handleEditField('safeNearMisses', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.safeNearMisses.target} onChange={(e) => handleEditField('safeNearMisses', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                    </div>

                    {/* Open Risks */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">مخاطر السلامة المفتوحة (Open Risks)</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.safeOpenRisks.actual} onChange={(e) => handleEditField('safeOpenRisks', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.safeOpenRisks.target} onChange={(e) => handleEditField('safeOpenRisks', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Warehouse inputs */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-lime-600 dark:text-lime-400 border-b border-zinc-150 pb-1 flex items-center gap-1 text-sm">
                    <div className="w-1.5 h-3 bg-lime-500 rounded" />
                    <span>{isRtl ? 'قسم المستودعات والشحن (Warehouse)' : 'Warehouse KPIs'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Shipped containers */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">عدد الحاويات المشحونة</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.whShippedContainers.actual} onChange={(e) => handleEditField('whShippedContainers', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.whShippedContainers.target} onChange={(e) => handleEditField('whShippedContainers', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                    </div>

                    {/* Executed orders */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">عدد أوامر التحميل المنفذة</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.whExecutedOrders.actual} onChange={(e) => handleEditField('whExecutedOrders', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.whExecutedOrders.target} onChange={(e) => handleEditField('whExecutedOrders', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                    </div>

                    {/* OTIF */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">الشحن في الموعد (% OTIF)</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.whOtif.actual} onChange={(e) => handleEditField('whOtif', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.whOtif.target} onChange={(e) => handleEditField('whOtif', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Maintenance inputs */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-indigo-600 dark:text-indigo-400 border-b border-zinc-150 pb-1 flex items-center gap-1 text-sm">
                    <div className="w-1.5 h-3 bg-indigo-500 rounded" />
                    <span>{isRtl ? 'قسم الصيانة والأعطال (Maintenance)' : 'Maintenance KPIs'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Planned Maintenance */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">نسبة الالتزام بالصيانة الوقائية (% PM)</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.maintPlanned.actual} onChange={(e) => handleEditField('maintPlanned', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.maintPlanned.target} onChange={(e) => handleEditField('maintPlanned', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                    </div>

                    {/* Breakdown hours */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">ساعات الأعطال الطارئة</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" step="0.1" value={editFormData.maintBreakdowns.actual} onChange={(e) => handleEditField('maintBreakdowns', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" step="0.1" value={editFormData.maintBreakdowns.target} onChange={(e) => handleEditField('maintBreakdowns', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                    </div>

                    {/* MTTR */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">متوسط وقت الإصلاح (MTTR) (دقيقة)</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.maintMttr.actual} onChange={(e) => handleEditField('maintMttr', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.maintMttr.target} onChange={(e) => handleEditField('maintMttr', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Energy inputs */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-orange-600 dark:text-orange-400 border-b border-zinc-150 pb-1 flex items-center gap-1 text-sm">
                    <div className="w-1.5 h-3 bg-orange-500 rounded" />
                    <span>{isRtl ? 'قسم الطاقة والاستهلاك (Energy & Utilities)' : 'Energy KPIs'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Power */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">استهلاك الكهرباء (kW)</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.energyPower.actual} onChange={(e) => handleEditField('energyPower', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.energyPower.target} onChange={(e) => handleEditField('energyPower', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                    </div>

                    {/* Water */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
                      <div className="font-bold">استهلاك المياه (م³)</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-400">الفعلي</span>
                          <input type="number" value={editFormData.energyWater.actual} onChange={(e) => handleEditField('energyWater', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                        <div>
                          <span className="text-zinc-400">المستهدف</span>
                          <input type="number" value={editFormData.energyWater.target} onChange={(e) => handleEditField('energyWater', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Notes & thoughts */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-zinc-650 dark:text-zinc-300 flex items-center gap-1 text-sm border-b pb-1">
                    <div className="w-1.5 h-3 bg-zinc-450 dark:bg-zinc-300 rounded" />
                    <span>{isRtl ? 'الملاحظات والرسائل' : 'Notes & Slogan text'}</span>
                  </h4>
                  <textarea
                    rows={2}
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-2.5 bg-white dark:bg-zinc-900 text-xs border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-1 focus:ring-emerald-500 font-medium"
                    placeholder={isRtl ? "سجل الملاحظات بخط اليد هنا..." : "Type custom shift highlights here..."}
                  />
                </div>

              </div>

              {/* Footer actions */}
              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850 shrink-0 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl font-bold transition-colors"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveManualEdit}
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-2xl font-black shadow-md shadow-emerald-500/20 flex items-center gap-1 hover:scale-101 active:scale-99 transition-all cursor-pointer"
                >
                  <Save size={14} />
                  <span>{isRtl ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

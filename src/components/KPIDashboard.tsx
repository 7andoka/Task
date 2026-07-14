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
  Upload,
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
  ArrowLeft,
  Sliders
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
  isDark?: boolean;
  setIsDark?: (dark: boolean) => void;
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

export default function KPIDashboard({ lang, user, isDark = true, setIsDark }: KPIDashboardProps) {
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
  const [localIsDark, setLocalIsDark] = useState<boolean>(isDark);
  const activeDark = setIsDark ? isDark : localIsDark;
  const toggleDark = () => {
    if (setIsDark) {
      setIsDark(!isDark);
    } else {
      setLocalIsDark(!localIsDark);
    }
  };
  const [tvZoom, setTvZoom] = useState<number>(1.0);
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  const [refreshTimer, setRefreshTimer] = useState<number>(60);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Layout customization settings
  const [showCustomizer, setShowCustomizer] = useState<boolean>(false);
  const [showControlPanel, setShowControlPanel] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>(() => {
    return (localStorage.getItem('kpi_font_size') as any) || 'base';
  });
  const [cardSpacing, setCardSpacing] = useState<'sm' | 'md' | 'lg'>(() => {
    return (localStorage.getItem('kpi_card_spacing') as any) || 'md';
  });
  const [topCardsCols, setTopCardsCols] = useState<number>(() => {
    return Number(localStorage.getItem('kpi_top_cards_cols')) || 4;
  });
  const [topCardsOrder, setTopCardsOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('kpi_top_cards_order');
    return saved ? JSON.parse(saved) : ['production', 'quality', 'safety', 'warehouse'];
  });
  const [mainSectionsOrder, setMainSectionsOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('kpi_main_sections_order');
    return saved ? JSON.parse(saved) : ['top_kpis', 'lines', 'charts'];
  });

  useEffect(() => {
    localStorage.setItem('kpi_font_size', fontSize);
  }, [fontSize]);
  useEffect(() => {
    localStorage.setItem('kpi_card_spacing', cardSpacing);
  }, [cardSpacing]);
  useEffect(() => {
    localStorage.setItem('kpi_top_cards_cols', String(topCardsCols));
  }, [topCardsCols]);
  useEffect(() => {
    localStorage.setItem('kpi_top_cards_order', JSON.stringify(topCardsOrder));
  }, [topCardsOrder]);
  useEffect(() => {
    localStorage.setItem('kpi_main_sections_order', JSON.stringify(mainSectionsOrder));
  }, [mainSectionsOrder]);

  const moveCardInOrder = (index: number, direction: 'left' | 'right') => {
    const nextOrder = [...topCardsOrder];
    // RTL view: "left" moves to a lower index (index-1), "right" moves to higher (index+1)
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < nextOrder.length) {
      const temp = nextOrder[index];
      nextOrder[index] = nextOrder[targetIndex];
      nextOrder[targetIndex] = temp;
      setTopCardsOrder(nextOrder);
    }
  };

  const moveSectionInOrder = (index: number, direction: 'up' | 'down') => {
    const nextOrder = [...mainSectionsOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < nextOrder.length) {
      const temp = nextOrder[index];
      nextOrder[index] = nextOrder[targetIndex];
      nextOrder[targetIndex] = temp;
      setMainSectionsOrder(nextOrder);
    }
  };

  const handleResetLayout = () => {
    setFontSize('base');
    setCardSpacing('md');
    setTopCardsCols(4);
    setTopCardsOrder(['production', 'quality', 'safety', 'warehouse']);
    setMainSectionsOrder(['top_kpis', 'lines', 'charts']);
    toast.success(isRtl ? 'تم إعادة ضبط مظهر وترتيب البطاقات للوضع الافتراضي' : 'Layout has been reset to default');
  };

  // Typography Scaling Helper
  const getFontSizeClass = (level: 'title' | 'subtitle' | 'table-head' | 'table-body' | 'text' | 'section-header' | 'sub-text' | 'legend-title' | 'card-title') => {
    if (isTvMode) {
      if (level === 'title') return 'text-lg md:text-xl font-black';
      if (level === 'subtitle') return 'text-[10px] md:text-[11px] font-bold';
      if (level === 'card-title') return 'text-[10px] md:text-[11px] font-black';
      if (level === 'section-header') return 'text-[10px] md:text-[11px] font-black py-1';
      if (level === 'table-head') return 'text-[9px] md:text-[10px] py-0.5';
      if (level === 'table-body') return 'text-[10px] md:text-[11.5px] py-0.5';
      if (level === 'sub-text') return 'text-[8.5px] md:text-[9.5px]';
      if (level === 'legend-title') return 'text-[10px]';
      return 'text-[10px]';
    }
    if (fontSize === 'sm') {
      if (level === 'title') return 'text-xl md:text-2xl font-black';
      if (level === 'subtitle') return 'text-[11px] md:text-xs font-bold';
      if (level === 'card-title') return 'text-[11px] md:text-xs font-black';
      if (level === 'section-header') return 'text-xs font-black py-1.5';
      if (level === 'table-head') return 'text-[9px] py-1';
      if (level === 'table-body') return 'text-[10px] py-1';
      if (level === 'sub-text') return 'text-[9px]';
      if (level === 'legend-title') return 'text-[10px]';
      return 'text-[10px]';
    }
    if (fontSize === 'lg') {
      if (level === 'title') return 'text-4xl font-black';
      if (level === 'subtitle') return 'text-2xl font-bold';
      if (level === 'card-title') return 'text-base md:text-lg font-black';
      if (level === 'section-header') return 'text-base font-black py-3.5';
      if (level === 'table-head') return 'text-xs py-2';
      if (level === 'table-body') return 'text-[13px] py-3';
      if (level === 'sub-text') return 'text-[11.5px]';
      if (level === 'legend-title') return 'text-sm';
      return 'text-sm';
    }
    if (fontSize === 'xl') {
      if (level === 'title') return 'text-5xl font-black';
      if (level === 'subtitle') return 'text-3xl font-bold';
      if (level === 'card-title') return 'text-lg md:text-xl font-black';
      if (level === 'section-header') return 'text-lg font-black py-4.5';
      if (level === 'table-head') return 'text-sm py-2.5';
      if (level === 'table-body') return 'text-[15px] py-3.5';
      if (level === 'sub-text') return 'text-xs';
      if (level === 'legend-title') return 'text-base';
      return 'text-base';
    }
    // 'base' default
    if (level === 'title') return 'text-3xl font-black';
    if (level === 'subtitle') return 'text-xl font-bold';
    if (level === 'card-title') return 'text-xs md:text-sm font-black';
    if (level === 'section-header') return 'text-sm font-black py-2.5';
    if (level === 'table-head') return 'text-[11px] py-1.5';
    if (level === 'table-body') return 'text-[11px] py-2';
    if (level === 'sub-text') return 'text-[10px]';
    if (level === 'legend-title') return 'text-xs';
    return 'text-xs';
  };

  // Card Spacing and Padding Helper
  const getSpacingClass = (type: 'grid' | 'card-padding' | 'card-header' | 'container-spacing') => {
    if (isTvMode) {
      if (type === 'grid') return 'gap-2';
      if (type === 'card-padding') return 'p-2 md:p-3';
      if (type === 'card-header') return 'p-1.5 px-3.5 text-[11px]';
      if (type === 'container-spacing') return 'space-y-1.5';
    }
    if (cardSpacing === 'sm') {
      if (type === 'grid') return 'gap-3';
      if (type === 'card-padding') return 'p-2';
      if (type === 'card-header') return 'p-2 px-3 text-xs';
      if (type === 'container-spacing') return 'space-y-3';
    }
    if (cardSpacing === 'lg') {
      if (type === 'grid') return 'gap-7';
      if (type === 'card-padding') return 'p-5';
      if (type === 'card-header') return 'p-4.5 px-6 text-base';
      if (type === 'container-spacing') return 'space-y-8';
    }
    // 'md' default
    if (type === 'grid') return 'gap-5';
    if (type === 'card-padding') return 'p-3';
    if (type === 'card-header') return 'p-3 px-4 text-sm';
    if (type === 'container-spacing') return 'space-y-6';
  };

  // Dynamic Table Cell Padding Helper
  const getTdPadding = (defaultPy: string) => {
    return isTvMode ? 'py-0.5 md:py-1' : defaultPy;
  };

  // Auto scale / zoom dashboard to fit any TV screen perfectly
  useEffect(() => {
    if (!isTvMode) return;

    const handleResize = () => {
      if (!isAutoFit) return;
      
      const containerWidth = window.innerWidth - 48; // Horizontal screen clearance
      const containerHeight = window.innerHeight - 80 - 48; // control bar height + padding
      
      const unscaledWidth = 1420; // Natural dashboard bounding width
      const unscaledHeight = boardRef.current ? boardRef.current.offsetHeight : 1000;

      if (unscaledHeight > 0) {
        const scaleX = containerWidth / unscaledWidth;
        const scaleY = containerHeight / unscaledHeight;
        
        // Take the min scale of both axes to ensure entire layout lives inside the viewport
        let optimalScale = Math.min(scaleX, scaleY);
        
        // Clamp scale to readable limits
        optimalScale = Math.max(0.4, Math.min(1.3, optimalScale));
        
        setTvZoom(parseFloat(optimalScale.toFixed(3)));
      }
    };

    const timer = setTimeout(handleResize, 150);
    window.addEventListener('resize', handleResize);
    
    let resizeObserver: ResizeObserver | null = null;
    if (boardRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(boardRef.current);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [isTvMode, isAutoFit, data]);

  // Handle escape, + and - keyboard shortcuts in TV mode to increase sizing dynamically
  useEffect(() => {
    if (!isTvMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTvMode(false);
      } else if (e.key === '+' || e.key === '=') {
        setIsAutoFit(false);
        setTvZoom(prev => Math.min(1.5, parseFloat((prev + 0.05).toFixed(2))));
        e.preventDefault();
      } else if (e.key === '-' || e.key === '_') {
        setIsAutoFit(false);
        setTvZoom(prev => Math.max(0.6, parseFloat((prev - 0.05).toFixed(2))));
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
        <div id="status-kpi-warning" className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white font-extrabold text-xs shadow-sm leading-none select-none">
          !
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

  const handleDownloadCSVTemplate = () => {
    const rows = [
      ['Key', 'Name (En)', 'Name (Ar)', 'Actual / Value (الفعلي / القيمة)', 'Target / Planned (المستهدف / المخطط)', 'Notes / Downtime (ملاحظات / توقفات)'],
      ['shift', 'Shift', 'الوردية', data.shift || '', '', ''],
      ['notes', 'Notes', 'ملاحظات الوردية', data.notes || '', '', ''],
      ['prodTotal', 'Total Production (Kg)', 'إجمالي الإنتاج (كجم)', data.prodTotal?.actual ?? 0, data.prodTotal?.target ?? 0, ''],
      ['prodEfficiency', 'Productivity Efficiency (%)', 'الكفاءة الإنتاجية (%)', data.prodEfficiency?.actual ?? 0, data.prodEfficiency?.target ?? 0, ''],
      ['prodWaste', 'Product Waste (%)', 'فقد المنتج (%)', data.prodWaste?.actual ?? 0, data.prodWaste?.target ?? 0, ''],
      ['prodFilmWaste', 'Film Waste (%)', 'فقد الفيلم (%)', data.prodFilmWaste?.actual ?? 0, data.prodFilmWaste?.target ?? 0, ''],
      ['prodRework', 'Rework (%)', 'إعادة التشغيل (%)', data.prodRework?.actual ?? 0, data.prodRework?.target ?? 0, ''],
      ['qualHoldCases', 'Hold Cases', 'حالات الـ hold', data.qualHoldCases?.actual ?? 0, data.qualHoldCases?.target ?? 0, ''],
      ['qualFoodSafety', 'Food Safety Violations', 'مخالفات سلامة الغذاء', data.qualFoodSafety?.actual ?? 0, data.qualFoodSafety?.target ?? 0, ''],
      ['qualGmpScore', 'GMP Score (%)', 'تقييم الـ GMP (%)', data.qualGmpScore?.actual ?? 0, data.qualGmpScore?.target ?? 0, ''],
      ['safeNearMisses', 'Near Misses', 'حوادث وشيكة', data.safeNearMisses?.actual ?? 0, data.safeNearMisses?.target ?? 0, ''],
      ['safeOpenRisks', 'Open Safety Risks', 'مخاطر السلامة المفتوحة', data.safeOpenRisks?.actual ?? 0, data.safeOpenRisks?.target ?? 0, ''],
      ['whShippedContainers', 'Shipped Containers', 'الحاويات المشحونة', data.whShippedContainers?.actual ?? 0, data.whShippedContainers?.target ?? 0, ''],
      ['whExecutedOrders', 'Executed Loading Orders', 'أوامر التحميل المنفذة', data.whExecutedOrders?.actual ?? 0, data.whExecutedOrders?.target ?? 0, ''],
      ['whOtif', 'OTIF (%)', 'الشحن في الموعد OTIF (%)', data.whOtif?.actual ?? 0, data.whOtif?.target ?? 0, ''],
      ['linePacking1_prod', 'Packing Line 1 - Production (Kg)', 'خط التعبئة 1 - الإنتاج (كجم)', data.linePacking1?.prod ?? 0, data.linePacking1?.prodPlanned ?? 0, ''],
      ['linePacking1_eff', 'Packing Line 1 - Efficiency (%)', 'خط التعبئة 1 - الكفاءة (%)', data.linePacking1?.eff ?? 0, data.linePacking1?.effPlanned ?? 0, ''],
      ['linePacking1_waste', 'Packing Line 1 - Waste (%)', 'خط التعبئة 1 - الفاقد (%)', data.linePacking1?.waste ?? 0, data.linePacking1?.wastePlanned ?? 0, ''],
      ['linePacking1_downtime', 'Packing Line 1 - Downtime (min)', 'خط التعبئة 1 - التوقفات (بالدقائق)', data.linePacking1?.downtime ?? 0, data.linePacking1?.downtimePlanned ?? 0, ''],
      ['linePacking2_prod', 'Packing Line 2 - Production (Kg)', 'خط التعبئة 2 - الإنتاج (كجم)', data.linePacking2?.prod ?? 0, data.linePacking2?.prodPlanned ?? 0, ''],
      ['linePacking2_eff', 'Packing Line 2 - Efficiency (%)', 'خط التعبئة 2 - الكفاءة (%)', data.linePacking2?.eff ?? 0, data.linePacking2?.effPlanned ?? 0, ''],
      ['linePacking2_waste', 'Packing Line 2 - Waste (%)', 'خط التعبئة 2 - الفاقد (%)', data.linePacking2?.waste ?? 0, data.linePacking2?.wastePlanned ?? 0, ''],
      ['linePacking2_downtime', 'Packing Line 2 - Downtime (min)', 'خط التعبئة 2 - التوقفات (بالدقائق)', data.linePacking2?.downtime ?? 0, data.linePacking2?.downtimePlanned ?? 0, ''],
      ['linePackaging1_prod', 'Packaging Line 1 - Production (Kg)', 'خط التغليف 1 - الإنتاج (كجم)', data.linePackaging1?.prod ?? 0, data.linePackaging1?.prodPlanned ?? 0, ''],
      ['linePackaging1_eff', 'Packaging Line 1 - Efficiency (%)', 'خط التغليف 1 - الكفاءة (%)', data.linePackaging1?.eff ?? 0, data.linePackaging1?.effPlanned ?? 0, ''],
      ['linePackaging1_waste', 'Packaging Line 1 - Waste (%)', 'خط التغليف 1 - الفاقد (%)', data.linePackaging1?.waste ?? 0, data.linePackaging1?.wastePlanned ?? 0, ''],
      ['linePackaging1_downtime', 'Packaging Line 1 - Downtime (min)', 'خط التغليف 1 - التوقفات (بالدقائق)', data.linePackaging1?.downtime ?? 0, data.linePackaging1?.downtimePlanned ?? 0, ''],
      ['linePackaging2_prod', 'Packaging Line 2 - Production (Kg)', 'خط التغليف 2 - الإنتاج (كجم)', data.linePackaging2?.prod ?? 0, data.linePackaging2?.prodPlanned ?? 0, ''],
      ['linePackaging2_eff', 'Packaging Line 2 - Efficiency (%)', 'خط التغليف 2 - الكفاءة (%)', data.linePackaging2?.eff ?? 0, data.linePackaging2?.effPlanned ?? 0, ''],
      ['linePackaging2_waste', 'Packaging Line 2 - Waste (%)', 'خط التغليف 2 - الفاقد (%)', data.linePackaging2?.waste ?? 0, data.linePackaging2?.wastePlanned ?? 0, ''],
      ['linePackaging2_downtime', 'Packaging Line 2 - Downtime (min)', 'خط التغليف 2 - التوقفات (بالدقائق)', data.linePackaging2?.downtime ?? 0, data.linePackaging2?.downtimePlanned ?? 0, '']
    ];

    const csvString = rows.map(row => 
      row.map(val => {
        const s = val === undefined || val === null ? '' : String(val);
        if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      }).join(',')
    ).join('\r\n');

    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `KPI_Template_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(isRtl ? 'تم تحميل نموذج البيانات بنجاح!' : 'Data template downloaded successfully!');
  };

  const handleUploadCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast.error(isRtl ? 'فشل قراءة الملف' : 'Failed to read file');
        return;
      }

      try {
        const lines = text.split(/\r?\n/);
        let updated = { ...data };
        let updatedCount = 0;

        lines.forEach((line, index) => {
          if (index === 0 || !line.trim()) return;

          const cells: string[] = [];
          let currentCell = '';
          let insideQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              cells.push(currentCell.trim());
              currentCell = '';
            } else {
              currentCell += char;
            }
          }
          cells.push(currentCell.trim());

          const cleanedCells = cells.map(c => c.replace(/^["']|["']$/g, '').trim());
          if (cleanedCells.length < 4) return;

          const key = cleanedCells[0];
          const valStr = cleanedCells[3];
          const targetStr = cleanedCells[4];

          const valNum = parseFloat(valStr.replace(/[%,]/g, ''));
          const targetNum = parseFloat(targetStr.replace(/[%,]/g, ''));

          if (key === 'shift') {
            if (valStr) {
              updated.shift = valStr;
              updatedCount++;
            }
          } else if (key === 'notes') {
            updated.notes = valStr;
            updatedCount++;
          } else {
            if (isNaN(valNum)) return;

            if (['prodTotal', 'prodEfficiency', 'prodWaste', 'prodFilmWaste', 'prodRework', 
                 'qualHoldCases', 'qualFoodSafety', 'qualGmpScore', 
                 'safeNearMisses', 'safeOpenRisks', 
                 'whShippedContainers', 'whExecutedOrders', 'whOtif'].includes(key)) {
              if (!(updated as any)[key]) {
                (updated as any)[key] = { actual: 0, target: 0 };
              }
              (updated as any)[key].actual = valNum;
              if (!isNaN(targetNum)) {
                (updated as any)[key].target = targetNum;
              }
              updatedCount++;
            }
            else if (key.startsWith('linePacking1_') || key.startsWith('linePacking2_') || key.startsWith('linePackaging1_') || key.startsWith('linePackaging2_')) {
              const parts = key.split('_');
              const lineKey = parts[0];
              const field = parts[1];

              if (!(updated as any)[lineKey]) {
                (updated as any)[lineKey] = { prod: 0, prodPlanned: 0, eff: 0, effPlanned: 0, waste: 0, wastePlanned: 0, downtime: 0, downtimePlanned: 0 };
              }
              const lineObj = (updated as any)[lineKey];
              if (lineObj) {
                if (field === 'prod') {
                  lineObj.prod = valNum;
                  if (!isNaN(targetNum)) lineObj.prodPlanned = targetNum;
                  updatedCount++;
                } else if (field === 'eff') {
                  lineObj.eff = valNum;
                  if (!isNaN(targetNum)) lineObj.effPlanned = targetNum;
                  updatedCount++;
                } else if (field === 'waste') {
                  lineObj.waste = valNum;
                  if (!isNaN(targetNum)) lineObj.wastePlanned = targetNum;
                  updatedCount++;
                } else if (field === 'downtime') {
                  lineObj.downtime = valNum;
                  if (!isNaN(targetNum)) lineObj.downtimePlanned = targetNum;
                  updatedCount++;
                }
              }
            }
          }
        });

        if (updatedCount > 0) {
          toast.success(isRtl
            ? `نجاح! تم استيراد وتحديث ${updatedCount} من البيانات والمؤشرات بنجاح!`
            : `Success! Imported and updated ${updatedCount} data points and KPIs successfully!`
          );
          setData(updated);
          await saveKPIData(updated);
        } else {
          toast.warning(isRtl
            ? 'لم يتم التعرف على مصفوفة البيانات في الملف. يرجى استخدام النموذج الصحيح.'
            : 'No recognized data found in the uploaded file. Please use the valid template.'
          );
        }
      } catch (err) {
        console.error(err);
        toast.error(isRtl ? 'حدث خطأ أثناء قراءة وتحليل ملف CSV.' : 'Error reading or parsing the CSV file.');
      }
    };

    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
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
      if (secObj && secObj[key]) {
        secObj[key][field] = value;
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
      if (secObj && secObj[key]) {
        secObj[key].statusOverride = status === 'auto' ? undefined : status;
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

  const renderCard = (cardId: string) => {
    if (cardId === 'production') {
      return (
        <div key="production" id="kpi-card-production" className={`border border-zinc-200 dark:border-zinc-800 rounded-[24px] overflow-hidden shadow-sm flex flex-col bg-white dark:bg-zinc-900 animate-fade-in ${isTvMode ? 'h-full flex-1' : ''}`}>
          <div className="p-3 px-4 bg-[#0E5F59] text-white flex items-center justify-between font-black">
            <span className={getFontSizeClass('card-title')}>الإنتاج (Production)</span>
            <Settings size={15} />
          </div>
          <div className={`flex-1 ${getSpacingClass('card-padding')} ${isTvMode ? 'flex flex-col justify-center min-h-0 overflow-hidden' : ''}`}>
            <table className="w-full text-right font-bold border-collapse">
              <thead>
                <tr className={`border-b border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-200 text-right font-black ${getFontSizeClass('table-head')}`}>
                  <th className="py-1 pb-1.5 text-right">مؤشر الأداء</th>
                  <th className="py-1 pb-1.5 text-center w-14">الفعلي</th>
                  <th className="py-1 pb-1.5 text-center w-14">المستهدف</th>
                  <th className="py-1 pb-1.5 text-center w-8">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10">
                  <td className={`${getTdPadding('py-1.5')} text-right font-black text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>إجمالي الإنتاج (كجم)</td>
                  <td className={`${getTdPadding('py-1.5')} text-center text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>{data.prodTotal.actual.toLocaleString()}</td>
                  <td className={`${getTdPadding('py-1.5')} text-center text-zinc-950 dark:text-zinc-300 font-bold ${getFontSizeClass('table-body')}`}>{data.prodTotal.target.toLocaleString()}</td>
                  <td className={`${getTdPadding('py-1.5')} flex justify-center`}>{renderStatusIcon(prod1Status)}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10">
                  <td className={`${getTdPadding('py-1.5')} text-right font-black text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>(%) الكفاءة الإنتاجية</td>
                  <td className={`${getTdPadding('py-1.5')} text-center text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>{data.prodEfficiency.actual}%</td>
                  <td className={`${getTdPadding('py-1.5')} text-center text-zinc-950 dark:text-zinc-300 font-bold ${getFontSizeClass('table-body')}`}>{data.prodEfficiency.target}%</td>
                  <td className={`${getTdPadding('py-1.5')} flex justify-center`}>{renderStatusIcon(prod2Status)}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10">
                  <td className={`${getTdPadding('py-1.5')} text-right font-black text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>Product Waste (%)</td>
                  <td className={`${getTdPadding('py-1.5')} text-center text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>{data.prodWaste.actual}%</td>
                  <td className={`${getTdPadding('py-1.5')} text-center text-zinc-950 dark:text-zinc-300 font-bold ${getFontSizeClass('table-body')}`}>≤ {data.prodWaste.target}%</td>
                  <td className={`${getTdPadding('py-1.5')} flex justify-center`}>{renderStatusIcon(prod3Status)}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10">
                  <td className={`${getTdPadding('py-1.5')} text-right font-black text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>Film Waste (%)</td>
                  <td className={`${getTdPadding('py-1.5')} text-center text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>{data.prodFilmWaste.actual}%</td>
                  <td className={`${getTdPadding('py-1.5')} text-center text-zinc-950 dark:text-zinc-300 font-bold ${getFontSizeClass('table-body')}`}>≤ {data.prodFilmWaste.target}%</td>
                  <td className={`${getTdPadding('py-1.5')} flex justify-center`}>{renderStatusIcon(prod4Status)}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10">
                  <td className={`${getTdPadding('py-1.5')} text-right font-black text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>Rework (%)</td>
                  <td className={`${getTdPadding('py-1.5')} text-center text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>{data.prodRework.actual}%</td>
                  <td className={`${getTdPadding('py-1.5')} text-center text-zinc-950 dark:text-zinc-300 font-bold ${getFontSizeClass('table-body')}`}>≤ {data.prodRework.target}%</td>
                  <td className={`${getTdPadding('py-1.5')} flex justify-center`}>{renderStatusIcon(prod5Status)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (cardId === 'quality') {
      return (
        <div key="quality" id="kpi-card-quality" className={`border border-zinc-200 dark:border-zinc-800 rounded-[24px] overflow-hidden shadow-sm flex flex-col bg-white dark:bg-zinc-900 ${isTvMode ? 'h-full flex-1' : ''}`}>
          <div className="p-3 px-4 bg-[#829E16] text-white flex items-center justify-between font-black">
            <span className={getFontSizeClass('card-title')}>الجودة (Quality)</span>
            <Info size={15} />
          </div>
          <div className={`flex-1 ${getSpacingClass('card-padding')} ${isTvMode ? 'flex flex-col justify-center min-h-0 overflow-hidden' : ''}`}>
            <table className="w-full text-right font-bold border-collapse">
              <thead>
                <tr className={`border-b border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-200 text-right font-black ${getFontSizeClass('table-head')}`}>
                  <th className="py-1 pb-1.5 text-right">مؤشر الأداء</th>
                  <th className="py-1 pb-1.5 text-center w-14">الفعلي</th>
                  <th className="py-1 pb-1.5 text-center w-14">المستهدف</th>
                  <th className="py-1 pb-1.5 text-center w-8">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10">
                  <td className={`${getTdPadding('py-2')} text-right font-black text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>عدد حالات الـ Hold</td>
                  <td className={`${getTdPadding('py-2')} text-center text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>{data.qualHoldCases.actual}</td>
                  <td className={`${getTdPadding('py-2')} text-center text-zinc-950 dark:text-zinc-300 font-bold ${getFontSizeClass('table-body')}`}>{data.qualHoldCases.target}</td>
                  <td className={`${getTdPadding('py-2')} flex justify-center`}>{renderStatusIcon(qual1Status)}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10">
                  <td className={`${getTdPadding('py-2')} text-right font-black text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>مخالفات الفود سيفتي</td>
                  <td className={`${getTdPadding('py-2')} text-center text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>{data.qualFoodSafety.actual}</td>
                  <td className={`${getTdPadding('py-2')} text-center text-zinc-950 dark:text-zinc-300 font-bold ${getFontSizeClass('table-body')}`}>{data.qualFoodSafety.target}</td>
                  <td className={`${getTdPadding('py-2')} flex justify-center`}>{renderStatusIcon(qual2Status)}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10">
                  <td className={`${getTdPadding('py-2')} text-right font-black text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>GMP Score (%)</td>
                  <td className={`${getTdPadding('py-2')} text-center text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>{data.qualGmpScore.actual}%</td>
                  <td className={`${getTdPadding('py-2')} text-center text-zinc-950 dark:text-zinc-300 font-bold ${getFontSizeClass('table-body')}`}>≥ {data.qualGmpScore.target}%</td>
                  <td className={`${getTdPadding('py-2')} flex justify-center`}>{renderStatusIcon(qual3Status)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (cardId === 'safety') {
      return (
        <div key="safety" id="kpi-card-safety" className={`border border-zinc-200 dark:border-zinc-800 rounded-[24px] overflow-hidden shadow-sm flex flex-col bg-white dark:bg-zinc-900 ${isTvMode ? 'h-full flex-1' : ''}`}>
          <div className="p-3 px-4 bg-[#007E72] text-white flex items-center justify-between font-black">
            <span className={getFontSizeClass('card-title')}>السلامة (Safety)</span>
            <AlertCircle size={15} />
          </div>
          <div className={`flex-1 ${getSpacingClass('card-padding')} ${isTvMode ? 'flex flex-col justify-center min-h-0 overflow-hidden' : ''}`}>
            <table className="w-full text-right font-bold border-collapse">
              <thead>
                <tr className={`border-b border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-200 text-right font-black ${getFontSizeClass('table-head')}`}>
                  <th className="py-1 pb-1.5 text-right">مؤشر الأداء</th>
                  <th className="py-1 pb-1.5 text-center w-14">الفعلي</th>
                  <th className="py-1 pb-1.5 text-center w-14">المستهدف</th>
                  <th className="py-1 pb-1.5 text-center w-8">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10">
                  <td className={`${getTdPadding('py-3')} text-right font-black text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>عدد الحوادث الوشيكة</td>
                  <td className={`${getTdPadding('py-3')} text-center text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>{data.safeNearMisses.actual}</td>
                  <td className={`${getTdPadding('py-3')} text-center text-zinc-950 dark:text-zinc-300 font-bold ${getFontSizeClass('table-body')}`}>{data.safeNearMisses.target}</td>
                  <td className={`${getTdPadding('py-3')} flex justify-center`}>{renderStatusIcon(safe1Status)}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10">
                  <td className={`${getTdPadding('py-3')} text-right font-black text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>مخاطر السلامة المفتوحة</td>
                  <td className={`${getTdPadding('py-3')} text-center text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>{data.safeOpenRisks.actual}</td>
                  <td className={`${getTdPadding('py-3')} text-center text-zinc-950 dark:text-zinc-300 font-bold ${getFontSizeClass('table-body')}`}>{data.safeOpenRisks.target}</td>
                  <td className={`${getTdPadding('py-3')} flex justify-center`}>{renderStatusIcon(safe2Status)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (cardId === 'warehouse') {
      return (
        <div key="warehouse" id="kpi-card-warehouse" className={`border border-zinc-200 dark:border-zinc-800 rounded-[24px] overflow-hidden shadow-sm flex flex-col bg-white dark:bg-zinc-900 ${isTvMode ? 'h-full flex-1' : ''}`}>
          <div className="p-3 px-4 bg-[#889E19] text-white flex items-center justify-between font-black">
            <span className={getFontSizeClass('card-title')}>المستودعات والشحن (Warehouse)</span>
            <Clock size={15} />
          </div>
          <div className={`flex-1 ${getSpacingClass('card-padding')} ${isTvMode ? 'flex flex-col justify-center min-h-0 overflow-hidden' : ''}`}>
            <table className="w-full text-right font-bold border-collapse">
              <thead>
                <tr className={`border-b border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-200 text-right font-black ${getFontSizeClass('table-head')}`}>
                  <th className="py-1 pb-1.5 text-right">مؤشر الأداء</th>
                  <th className="py-1 pb-1.5 text-center w-14">الفعلي</th>
                  <th className="py-1 pb-1.5 text-center w-14">المستهدف</th>
                  <th className="py-1 pb-1.5 text-center w-8">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10">
                  <td className={`${getTdPadding('py-2')} text-right font-black text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>عدد الحاويات المشحونة</td>
                  <td className={`${getTdPadding('py-2')} text-center text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>{data.whShippedContainers.actual}</td>
                  <td className={`${getTdPadding('py-2')} text-center text-zinc-950 dark:text-zinc-300 font-bold ${getFontSizeClass('table-body')}`}>{data.whShippedContainers.target}</td>
                  <td className={`${getTdPadding('py-2')} flex justify-center`}>{renderStatusIcon(wh1Status)}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10">
                  <td className={`${getTdPadding('py-2')} text-right font-black text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>عدد أوامر التحميل المنفذة</td>
                  <td className={`${getTdPadding('py-2')} text-center text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>{data.whExecutedOrders.actual}</td>
                  <td className={`${getTdPadding('py-2')} text-center text-zinc-950 dark:text-zinc-300 font-bold ${getFontSizeClass('table-body')}`}>{data.whExecutedOrders.target}</td>
                  <td className={`${getTdPadding('py-2')} flex justify-center`}>{renderStatusIcon(wh2Status)}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/10">
                  <td className={`${getTdPadding('py-2')} text-right font-black text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>الشحن في الموعد (% OTIF)</td>
                  <td className={`${getTdPadding('py-2')} text-center text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>{data.whOtif.actual}%</td>
                  <td className={`${getTdPadding('py-2')} text-center text-zinc-950 dark:text-zinc-300 font-bold ${getFontSizeClass('table-body')}`}>≥ {data.whOtif.target}%</td>
                  <td className={`${getTdPadding('py-2')} flex justify-center`}>{renderStatusIcon(wh3Status)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderTopKpis = () => (
    /* SEGMENTS GRID (THE 4 CORE CATEGORY CARDS) */
    <div key="top_kpis" className={`grid grid-cols-1 md:grid-cols-${topCardsCols >= 4 ? 4 : 2} lg:grid-cols-${topCardsCols} xl:grid-cols-${topCardsCols} ${getSpacingClass('grid')}`}>
      {topCardsOrder.map(cardId => renderCard(cardId))}
    </div>
  );

  const renderLines = () => (
    /* FULL-WIDTH SECTION: PRODUCTION LINES PERFORMANCE (أداء خطوط الإنتاج) */
    <div key="lines" id="production-lines-block" className={`space-y-3 ${isTvMode ? 'flex-1 min-h-0 h-full flex flex-col justify-between' : ''}`}>
      <div className={`bg-[#0D5F54] text-white rounded-2xl text-center font-black select-none tracking-widest shadow-sm ${isTvMode ? 'p-1 py-1.5 text-xs font-black' : 'p-2.5 ' + getFontSizeClass('section-header')}`}>
        أداء خطوط الإنتاج (Production Lines Performance)
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${isTvMode ? 'flex-1 min-h-0 h-full' : ''}`}>
        
        {/* Packing Line 1 */}
        <div className={`border border-zinc-200 dark:border-zinc-800 rounded-[20px] overflow-hidden bg-white dark:bg-zinc-900 hover:shadow-md transition-shadow ${isTvMode ? 'h-full flex flex-col justify-between' : ''}`}>
          <div className="p-2 px-3 bg-[#134E4A] text-white flex items-center justify-between text-xs font-black">
            <span>خط تعبئة 1 (Packing 1)</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className={`flex-grow space-y-2 ${getSpacingClass('card-padding')} ${isTvMode ? 'flex flex-col justify-center min-h-0 overflow-hidden' : ''}`}>
            <table className="w-full text-right font-bold">
              <thead>
                <tr className={`text-zinc-950 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 font-black ${getFontSizeClass('table-head')}`}>
                  <th className="text-right">المؤشر</th>
                  <th className="text-center w-12">المخطط</th>
                  <th className="text-center w-12">الفعلي</th>
                  <th className="text-center w-12">الكفاءة</th>
                  <th className="text-center w-6">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>الإنتاج (كجم)</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePacking1.prodPlanned.toLocaleString()}</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePacking1.prod.toLocaleString()}</td>
                  <td className={`text-center text-[#115E59] dark:text-emerald-400 font-black ${getFontSizeClass('table-body')}`}>{line1_eff_calc}%</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon(getLineEffStatus(line1_eff_calc, 100))}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>الكفاءة (%)</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePacking1.effPlanned}%</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePacking1.eff}%</td>
                  <td className={`text-center text-emerald-600 dark:text-emerald-400 font-black ${getFontSizeClass('table-body')}`}>{data.linePacking1.effPlanned > 0 ? '102%' : '102%'}</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon('success')}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>Product Waste</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>≤ {data.linePacking1.wastePlanned}%</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePacking1.waste}%</td>
                  <td className={`text-center text-zinc-500 dark:text-zinc-550 ${getFontSizeClass('table-body')}`}>-</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon('success')}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>Downtime (د)</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>35</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>-</td>
                  <td className={`text-center text-zinc-500 dark:text-zinc-550 ${getFontSizeClass('table-body')}`}>-</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon('warning')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Packing Line 2 */}
        <div className={`border border-zinc-200 dark:border-zinc-800 rounded-[20px] overflow-hidden bg-white dark:bg-zinc-900 hover:shadow-md transition-shadow ${isTvMode ? 'h-full flex flex-col justify-between' : ''}`}>
          <div className="p-2 px-3 bg-[#134E4A] text-white flex items-center justify-between text-xs font-black">
            <span>خط تعبئة 2 (Packing 2)</span>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div className={`flex-grow space-y-2 ${getSpacingClass('card-padding')} ${isTvMode ? 'flex flex-col justify-center min-h-0 overflow-hidden' : ''}`}>
            <table className="w-full text-right font-bold">
              <thead>
                <tr className={`text-zinc-950 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 font-black ${getFontSizeClass('table-head')}`}>
                  <th className="text-right">المؤشر</th>
                  <th className="text-center w-12">المخطط</th>
                  <th className="text-center w-12">الفعلي</th>
                  <th className="text-center w-12">الكفاءة</th>
                  <th className="text-center w-6">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>الإنتاج (كجم)</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePacking2.prodPlanned.toLocaleString()}</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePacking2.prod.toLocaleString()}</td>
                  <td className={`text-center text-[#115E59] dark:text-emerald-400 font-black ${getFontSizeClass('table-body')}`}>{line2_eff_calc}%</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon(getLineEffStatus(line2_eff_calc, 100))}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>الكفاءة (%)</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePacking2.effPlanned}%</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePacking2.eff}%</td>
                  <td className={`text-center text-amber-655 font-black ${getFontSizeClass('table-body')}`}>{data.linePacking2.effPlanned > 0 ? '98%' : '98%'}</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon('warning')}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>Product Waste</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>≤ {data.linePacking2.wastePlanned}%</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePacking2.waste}%</td>
                  <td className={`text-center text-zinc-500 dark:text-zinc-555 ${getFontSizeClass('table-body')}`}>-</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon('warning')}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>Downtime (د)</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>42</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>-</td>
                  <td className={`text-center text-zinc-500 dark:text-zinc-555 ${getFontSizeClass('table-body')}`}>-</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon('danger')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Packaging Line 1 */}
        <div className={`border border-zinc-200 dark:border-zinc-800 rounded-[20px] overflow-hidden bg-white dark:bg-zinc-900 hover:shadow-md transition-shadow ${isTvMode ? 'h-full flex flex-col justify-between' : ''}`}>
          <div className="p-2 px-3 bg-[#134E4A] text-white flex items-center justify-between text-xs font-black">
            <span>خط تغليف 1 (Packaging 1)</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className={`flex-grow space-y-2 ${getSpacingClass('card-padding')} ${isTvMode ? 'flex flex-col justify-center min-h-0 overflow-hidden' : ''}`}>
            <table className="w-full text-right font-bold">
              <thead>
                <tr className={`text-zinc-950 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 font-black ${getFontSizeClass('table-head')}`}>
                  <th className="text-right">المؤشر</th>
                  <th className="text-center w-12">المخطط</th>
                  <th className="text-center w-12">الفعلي</th>
                  <th className="text-center w-12">الكفاءة</th>
                  <th className="text-center w-6">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>الإنتاج (كرتونة)</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePackaging1.prodPlanned.toLocaleString()}</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePackaging1.prod.toLocaleString()}</td>
                  <td className={`text-center text-[#115E59] dark:text-emerald-400 font-black ${getFontSizeClass('table-body')}`}>{line3_eff_calc}%</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon(getLineEffStatus(line3_eff_calc, 100))}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>الكفاءة (%)</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePackaging1.effPlanned}%</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePackaging1.eff}%</td>
                  <td className={`text-center text-emerald-600 dark:text-emerald-400 font-black ${getFontSizeClass('table-body')}`}>104%</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon('success')}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>Film Waste</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>≤ {data.linePackaging1.wastePlanned}%</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePackaging1.waste}%</td>
                  <td className={`text-center text-zinc-500 dark:text-zinc-555 ${getFontSizeClass('table-body')}`}>-</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon('success')}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>Downtime (د)</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>25</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePackaging1.waste > 0 ? '-' : '-'}</td>
                  <td className={`text-center text-zinc-500 dark:text-zinc-555 ${getFontSizeClass('table-body')}`}>-</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon('success')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Packaging Line 2 */}
        <div className={`border border-zinc-200 dark:border-zinc-800 rounded-[20px] overflow-hidden bg-white dark:bg-zinc-900 hover:shadow-md transition-shadow ${isTvMode ? 'h-full flex flex-col justify-between' : ''}`}>
          <div className="p-2 px-3 bg-[#134E4A] text-white flex items-center justify-between text-xs font-black">
            <span>خط تغليف 2 (Packaging 2)</span>
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDuration: '4s' }} />
          </div>
          <div className={`flex-grow space-y-2 ${getSpacingClass('card-padding')} ${isTvMode ? 'flex flex-col justify-center min-h-0 overflow-hidden' : ''}`}>
            <table className="w-full text-right font-bold">
              <thead>
                <tr className={`text-zinc-950 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 font-black ${getFontSizeClass('table-head')}`}>
                  <th className="text-right">المؤشر</th>
                  <th className="text-center w-12">المخطط</th>
                  <th className="text-center w-12">الفعلي</th>
                  <th className="text-center w-12">الكفاءة</th>
                  <th className="text-center w-6">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>الإنتاج (كرتونة)</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePackaging2.prodPlanned.toLocaleString()}</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePackaging2.prod.toLocaleString()}</td>
                  <td className={`text-center text-[#115E59] dark:text-emerald-400 font-black ${getFontSizeClass('table-body')}`}>{line4_eff_calc}%</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon(getLineEffStatus(line4_eff_calc, 100))}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>الكفاءة (%)</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePackaging2.effPlanned}%</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePackaging2.eff}%</td>
                  <td className={`text-center text-amber-600 dark:text-amber-400 font-black ${getFontSizeClass('table-body')}`}>104%</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon('warning')}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 ${getFontSizeClass('table-body')}`}>Film Waste</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>≤ {data.linePackaging2.wastePlanned}%</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePackaging2.waste}%</td>
                  <td className={`text-center text-zinc-500 dark:text-zinc-555 ${getFontSizeClass('table-body')}`}>-</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon('success')}</td>
                </tr>
                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/15">
                  <td className={`text-zinc-950 dark:text-zinc-100 font-black ${getFontSizeClass('table-body')}`}>Downtime (د)</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-200 font-extrabold ${getFontSizeClass('table-body')}`}>50</td>
                  <td className={`text-center text-zinc-950 dark:text-zinc-100 font-extrabold ${getFontSizeClass('table-body')}`}>{data.linePackaging2.waste > 0 ? '-' : '-'}</td>
                  <td className={`text-center text-zinc-500 dark:text-zinc-555 ${getFontSizeClass('table-body')}`}>-</td>
                  <td className={`${getTdPadding('py-1')} flex justify-center`}>{renderStatusIcon('danger')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );

  const renderCharts = () => (
    /* CHARTS ROW, LEGEND & NOTES GRID (مؤشرات الاتجاه والرسوم البيانية والمذكرات) */
    <div key="charts" className={`grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1 ${isTvMode ? 'flex-1 min-h-0 h-full' : ''}`}>
      
      {/* Left Column: Trend chart */}
      <div id="chart-trend-container" className={`lg:col-span-4 border border-zinc-200 dark:border-zinc-800 rounded-[24px] p-4 bg-white dark:bg-zinc-900 flex flex-col justify-between ${isTvMode ? 'min-h-[120px] flex-1 min-h-0 py-2' : 'min-h-[290px]'}`}>
        <h4 className={`font-black text-center text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-1.5 mb-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 select-none ${isTvMode ? 'text-xs pb-1 mb-1' : getFontSizeClass('legend-title')}`}>
          <TrendingUp size={14} className="text-[#0E5F59]" />
          <span>مؤشرات الاتجاه (Trend)</span>
        </h4>
        <div className={`w-full flex-grow ${isTvMode ? 'h-24' : 'h-44'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#888" />
              <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#888" />
              <Tooltip contentStyle={{ fontSize: 10, direction: 'rtl', borderRadius: 12 }} />
              <Line type="monotone" name="efficiency" dataKey="efficiency" stroke="#0E5F59" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" name="waste" dataKey="waste" stroke="#98C21E" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" name="rework" dataKey="rework" stroke="#D48C00" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={`flex justify-center gap-3 font-black text-zinc-950 dark:text-zinc-200 select-none ${isTvMode ? 'text-[9px] pt-0.5' : 'text-[10px] pt-1'}`}>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#0E5F59]" />الكفاءة الإنتاجية (%)</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#98C21E]" />Product Waste (%)</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#D48C00]" />Rework (%)</span>
        </div>
      </div>

      {/* Middle Column: Shipped Containers */}
      <div id="chart-containers-container" className={`lg:col-span-4 border border-zinc-200 dark:border-zinc-800 rounded-[24px] p-4 bg-white dark:bg-zinc-900 flex flex-col justify-between ${isTvMode ? 'min-h-[120px] flex-1 min-h-0 py-2' : 'min-h-[290px]'}`}>
        <h4 className={`font-black text-center text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2 select-none ${isTvMode ? 'text-xs pb-1 mb-1' : getFontSizeClass('legend-title')}`}>
          أداء الحاويات المشحونة خلال الأسبوع
        </h4>
        <div className={`w-full flex-grow ${isTvMode ? 'h-24' : 'h-44'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.weeklyContainers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#888" />
              <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#888" />
              <Tooltip contentStyle={{ fontSize: 10, direction: 'rtl', borderRadius: 12 }} />
              <Bar dataKey="value" fill="#8DB825" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={`text-center font-black text-zinc-950 dark:text-zinc-200 select-none ${isTvMode ? 'text-[9px]' : 'text-[11px]'}`}>
          عدد الحاويات المشحونة يومياً
        </div>
      </div>

      {/* Right Column: Legend Key */}
      <div className={`lg:col-span-2 border border-zinc-200 dark:border-zinc-800 rounded-[24px] p-4 bg-white dark:bg-zinc-900 flex flex-col select-none ${isTvMode ? 'min-h-[120px] flex-1 min-h-0 py-2' : 'min-h-[290px]'}`}>
        <h4 className={`font-black text-center text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-3 ${isTvMode ? 'text-xs pb-1 mb-1' : getFontSizeClass('legend-title')}`}>
          مفتاح الحالة
        </h4>
        <div className={`flex-1 flex flex-col justify-center space-y-4 text-xs font-black px-1 ${isTvMode ? 'space-y-2' : 'space-y-4'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black shadow-sm">
              <Check size={14} strokeWidth={3} />
            </div>
            <span className="dark:text-zinc-100">ضمن المستهدف</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white font-black text-lg select-none leading-none">
              -
            </div>
            <span className="dark:text-zinc-100">يحتاج إلى متابعة</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[#E11D48] flex items-center justify-center text-white font-black shadow-sm">
              <X size={14} strokeWidth={3} />
            </div>
            <span className="dark:text-zinc-100">خارج المستهدف</span>
          </div>
        </div>
      </div>

      {/* Far Right Column: Notebook comments block */}
      <div id="notes-notebook-container" className={`lg:col-span-2 border border-zinc-200 dark:border-zinc-800 rounded-[24px] p-4 bg-amber-50/20 dark:bg-zinc-900/10 flex flex-col ${isTvMode ? 'min-h-[120px] flex-1 min-h-0 py-2' : 'min-h-[290px]'}`}>
        <h4 className={`font-black text-center text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-3 select-none ${isTvMode ? 'text-xs pb-1 mb-1' : getFontSizeClass('legend-title')}`}>
          ملاحظات
        </h4>
        
        {/* Styled Lined Notebook paper look with spacing */}
        <div className="flex-1 flex flex-col relative justify-between">
          <p className={`leading-6 font-black text-zinc-950 dark:text-zinc-100 z-10 px-1 italic select-text ${getFontSizeClass('sub-text')}`}>
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
  );

  const isTvThemeDark = isTvMode && activeDark;
  const isCurrentDark = activeDark;

  return (
    <div 
      className={`transition-colors duration-300 w-full ${
        isTvMode 
          ? `fixed inset-0 z-[9999] overflow-hidden p-0 flex flex-col gap-3 ${isTvThemeDark ? 'tv-dark-override bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-zinc-900'}` 
          : 'space-y-6 w-full'
      }`}
      style={{ direction: 'rtl' }}
    >
      
      {isTvMode ? (
        /* GORGEOUS AUTOPLAYING INDUSTRIAL WIDESCREEN TV FLOATING CONTROL BAR */
        <div id="tv-control-bar" className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl mb-1 border transition-colors duration-300 ${
          activeDark 
            ? 'bg-zinc-900/90 border-zinc-800 text-zinc-200' 
            : 'bg-white/95 border-zinc-200 text-zinc-800'
        } backdrop-blur-md shadow-lg sticky top-0 z-[10000] select-none`}>
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
            {/* Auto-Fit Toggle Button */}
            <button
              onClick={() => {
                const nextVal = !isAutoFit;
                setIsAutoFit(nextVal);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-[11px] font-bold transition-all cursor-pointer select-none ${
                isAutoFit 
                  ? 'bg-emerald-505/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                  : (activeDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750' : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50')
              }`}
              title={isRtl ? 'تفعيل ملاءمة الشاشة التلقائية لحجم التلفزيون' : 'Auto fit dashboard to screen size'}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isAutoFit ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              <span>{isRtl ? 'ملاءمة تلقائية للشاشة' : 'Auto-Fit Screen'}</span>
            </button>

            {/* Sizing Scaling Keyboard instructions & buttons */}
            <div className={`flex items-center gap-2 border px-3 py-1 rounded-2xl ${
              activeDark ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-zinc-50'
            }`}>
              <span className="text-[10px] font-bold text-zinc-400">{isRtl ? 'حجم الشاشة (+ / -):' : 'TV Zoom (+/-):'}</span>
              <button 
                onClick={() => {
                  setIsAutoFit(false);
                  setTvZoom(z => Math.max(0.4, parseFloat((z - 0.05).toFixed(2))));
                }}
                className="w-6 h-6 flex items-center justify-center hover:bg-zinc-500/10 rounded-lg text-xs font-bold"
                title={isRtl ? 'تصغير حجم اللوحة' : 'Zoom Out'}
              >
                -
              </button>
              <span className={`text-xs font-black min-w-[2.5rem] text-center font-mono ${isAutoFit ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-650 dark:text-zinc-350'}`}>{Math.round(tvZoom * 100)}%</span>
              <button 
                onClick={() => {
                  setIsAutoFit(false);
                  setTvZoom(z => Math.min(1.5, parseFloat((z + 0.05).toFixed(2))));
                }}
                className="w-6 h-6 flex items-center justify-center hover:bg-zinc-500/10 rounded-lg text-xs font-bold"
                title={isRtl ? 'تكبير حجم اللوحة' : 'Zoom In'}
              >
                +
              </button>
            </div>

            {/* TV Day Night theme toggler */}
            <button
              onClick={toggleDark}
              className={`p-2 rounded-2xl border transition-colors ${
                activeDark 
                  ? 'bg-zinc-800 border-zinc-700 text-amber-400 hover:bg-zinc-750' 
                  : 'bg-zinc-50 border-zinc-200 text-indigo-900 hover:bg-zinc-100'
              }`}
              title={isRtl ? 'تبديل المظهر النهاري/المسائي للتلفزيون' : 'Switch TV Widescreen Dark/Light colors'}
            >
              {activeDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* TV Customize Layout Panel toggle */}
            <button
              onClick={() => setShowCustomizer(!showCustomizer)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-[11px] font-bold transition-all cursor-pointer select-none ${
                showCustomizer 
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                  : (activeDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750' : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50')
              }`}
              title={isRtl ? 'تخصيص ترتيب وحجم الخط والبطاقات على التلفزيون' : 'Customize layouts, order, and font on TV'}
            >
              <Sliders size={13} />
              <span>{isRtl ? 'تعديل الترتيب والمساحات' : 'Layout & Order'}</span>
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
      ) : (
        /* The old action bar has been removed to free up screen space. All controls are now accessible via the floating control panel button next to the logo or the persistent FAB. */
        null
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
              
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

              {/* Option 3: Download/Upload Full CSV Template */}
              <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950/30 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-850">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2.5 bg-purple-500 text-white rounded-xl text-[10px] font-black">3</div>
                  <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">
                    {isRtl ? 'تحميل ورفع النموذج الكامل للبيانات' : 'Option C: Full CSV Data Template'}
                  </h4>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  {isRtl 
                    ? "قم بتنزيل ملف النموذج المحتوي على كامل بيانات الوردية والخطوط والمؤشرات، قم بتعديله، ثم أعد رفعه هنا:"
                    : "Download template containing all KPIs, lines performance, shift details. Edit in Excel, then upload back:"}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleDownloadCSVTemplate}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm text-center"
                    title={isRtl ? 'تنزيل النموذج بصيغة CSV' : 'Download template CSV'}
                  >
                    <Download size={13} />
                    <span>{isRtl ? 'تنزيل النموذج' : 'Download'}</span>
                  </button>

                  <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm text-center">
                    <Upload size={13} />
                    <span>{isRtl ? 'رفع الملف المعدل' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleUploadCSV}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customizer Collapsible Panel */}
      <AnimatePresence>
        {showCustomizer && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`overflow-hidden rounded-3xl p-5 shadow-xl border transition-colors duration-300 ${
              isCurrentDark 
                ? 'bg-zinc-900 border-zinc-850 text-zinc-100' 
                : 'bg-white border-amber-500/15 text-zinc-850'
            }`}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <Sliders size={16} className="text-amber-500" />
                <span>{isRtl ? 'لوحة التحكم في المساحات، الترتيب وحجم البطاقات والخطوط' : 'Dashboard Layout, Spaces & Sizing Control'}</span>
              </h3>
              <button 
                onClick={() => setShowCustomizer(false)} 
                className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 text-xs font-bold">
              {/* Col 1: Font and Spacing (4 cols) */}
              <div className="md:col-span-4 space-y-4">
                {/* Font Size controls */}
                <div className="space-y-1.5">
                  <span className="text-zinc-500 dark:text-zinc-400 block">{isRtl ? 'حجم الخط العام:' : 'General Font Size:'}</span>
                  <div className="grid grid-cols-4 gap-1">
                    {(['sm', 'base', 'lg', 'xl'] as const).map((sz) => {
                      const label = sz === 'sm' ? (isRtl ? 'صغير' : 'Small')
                                  : sz === 'base' ? (isRtl ? 'طبيعي' : 'Normal')
                                  : sz === 'lg' ? (isRtl ? 'كبير' : 'Large')
                                  : (isRtl ? 'ضخم' : 'Huge');
                      return (
                        <button
                          key={sz}
                          onClick={() => setFontSize(sz)}
                          className={`py-1.5 px-2 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                            fontSize === sz 
                              ? 'bg-amber-500 text-white border-amber-500' 
                              : 'bg-zinc-100 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Card Spacing controls */}
                <div className="space-y-1.5">
                  <span className="text-zinc-500 dark:text-zinc-400 block">{isRtl ? 'تباعد ومساحات البطاقات والبادئات:' : 'Card Spacing & Padding:'}</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['sm', 'md', 'lg'] as const).map((sp) => {
                      const label = sp === 'sm' ? (isRtl ? 'مدمج' : 'Compact')
                                  : sp === 'md' ? (isRtl ? 'متوازن' : 'Balanced')
                                  : (isRtl ? 'واسع' : 'Spacious');
                      return (
                        <button
                          key={sp}
                          onClick={() => setCardSpacing(sp)}
                          className={`py-1.5 px-2 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                            cardSpacing === sp 
                              ? 'bg-amber-500 text-white border-amber-500' 
                              : 'bg-zinc-100 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Top Grid Column controls */}
                <div className="space-y-1.5">
                  <span className="text-zinc-500 dark:text-zinc-400 block">{isRtl ? 'توزيع الأعمدة للمؤشرات الأربعة:' : 'Top Row Grid Columns:'}</span>
                  <div className="grid grid-cols-3 gap-1">
                    {([2, 3, 4] as const).map((cols) => {
                      const label = cols === 2 ? (isRtl ? 'عمودين' : '2 Columns')
                                  : cols === 3 ? (isRtl ? '3 أعمدة' : '3 Columns')
                                  : (isRtl ? '4 أعمدة' : '4 Columns');
                      return (
                        <button
                          key={cols}
                          onClick={() => setTopCardsCols(cols)}
                          className={`py-1.5 px-2 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                            topCardsCols === cols 
                              ? 'bg-amber-500 text-white border-amber-500' 
                              : 'bg-zinc-100 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Col 2: Top Cards Order shifting (4 cols) */}
              <div className="md:col-span-4 space-y-2">
                <span className="text-zinc-500 dark:text-zinc-400 block">{isRtl ? 'ترتيب البطاقات الأربع (يمين ⇆ يسار):' : 'Reorder top 4 cards (swap positions):'}</span>
                <div className="space-y-1.5">
                  {topCardsOrder.map((cardId, idx) => {
                    const labelAr = cardId === 'production' ? (isRtl ? 'الإنتاج (Production)' : 'Production')
                                  : cardId === 'quality' ? (isRtl ? 'الجودة (Quality)' : 'Quality')
                                  : cardId === 'safety' ? (isRtl ? 'السلامة (Safety)' : 'Safety')
                                  : (isRtl ? 'المستودعات والشحن (Warehouse)' : 'Warehouse');
                    return (
                      <div 
                        key={cardId} 
                        className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80"
                      >
                        <span className="text-[11px] font-black">{labelAr}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveCardInOrder(idx, 'left')}
                            disabled={idx === 0}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-amber-500 hover:text-white disabled:opacity-30 cursor-pointer text-xs"
                            title={isRtl ? 'نقل لليمين' : 'Move right'}
                          >
                            →
                          </button>
                          <button
                            onClick={() => moveCardInOrder(idx, 'right')}
                            disabled={idx === topCardsOrder.length - 1}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-amber-500 hover:text-white disabled:opacity-30 cursor-pointer text-xs"
                            title={isRtl ? 'نقل لليسار' : 'Move left'}
                          >
                            ←
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Col 3: Sections reorder (4 cols) */}
              <div className="md:col-span-4 space-y-2">
                <span className="text-zinc-500 dark:text-zinc-400 block">{isRtl ? 'ترتيب الأقسام الرئيسية للوحة (أعلى ⇆ أسفل):' : 'Reorder Main Layout Blocks (up/down):'}</span>
                <div className="space-y-1.5">
                  {mainSectionsOrder.map((secId, idx) => {
                    const labelAr = secId === 'top_kpis' ? (isRtl ? 'بطاقات المؤشرات الرئيسية' : 'Top 4 KPIs')
                                  : secId === 'lines' ? (isRtl ? 'أداء خطوط الإنتاج' : 'Production Lines Performance')
                                  : (isRtl ? 'الرسوم البيانية والمذكرات' : 'Charts & Trends');
                    return (
                      <div 
                        key={secId} 
                        className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80"
                      >
                        <span className="text-[11px] font-black">{labelAr}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveSectionInOrder(idx, 'up')}
                            disabled={idx === 0}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-amber-500 hover:text-white disabled:opacity-30 cursor-pointer text-xs font-extrabold"
                            title={isRtl ? 'نقل لأعلى' : 'Move up'}
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveSectionInOrder(idx, 'down')}
                            disabled={idx === mainSectionsOrder.length - 1}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-amber-500 hover:text-white disabled:opacity-30 cursor-pointer text-xs font-extrabold"
                            title={isRtl ? 'نقل لأسفل' : 'Move down'}
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions of panel */}
            <div className="flex justify-between items-center mt-5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 font-medium">
                {isRtl 
                  ? '* سيتم حفظ تفضيلات المظهر وتخصيصات الشاشة في المتصفح تلقائياً لكل جهاز على حدة.' 
                  : '* Layout configurations are saved locally for this specific browser or TV client.'}
              </p>
              <button
                onClick={handleResetLayout}
                className="px-3.5 py-1.5 bg-zinc-200 hover:bg-zinc-350 dark:bg-zinc-800 dark:hover:bg-zinc-750 rounded-xl text-[10px] font-black transition-colors"
              >
                {isRtl ? 'إعادة التعيين للإعدادات الافتراضية' : 'Reset to Original Grid'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-24 space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-zinc-500 dark:text-zinc-300">{isRtl ? 'جاري قراءة لوحة مؤشرات الأداء...' : 'Syncing KPI boards...'}</p>
        </div>
      ) : (
        
        /* THE ACTUAL INTERACTIVE HIGH-FIDELITY BOARD DOCUMENT */
        <div className={`w-full ${isTvMode ? 'overflow-hidden flex-1 flex items-start justify-center' : 'overflow-x-auto pb-4'}`}>
          <div 
            ref={boardRef}
            style={isTvMode ? { 
              transform: `scale(${tvZoom})`, 
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease-out',
              minWidth: '1380px'
            } : undefined}
            className={`w-full max-w-full p-4 md:p-8 space-y-6 transition-all duration-300 ${isCurrentDark ? 'tv-dark-override-card text-zinc-100 border-0' : 'daytime-light-override-card bg-white border-0 text-zinc-850'}`}
            dir="rtl"
          >
            
            {/* RICH LAND DOCUMENT HEADER */}
            {!isTvMode && (
              <div className="flex flex-col md:flex-row items-center justify-between border-b border-zinc-300 pb-5 gap-6">
                
                {/* Top Right Date/Shift Block Grid (First in JSX renders on the right in RTL) */}
                <div className={`grid grid-cols-2 gap-y-2.5 gap-x-4 p-4 rounded-2xl border min-w-[270px] text-xs font-bold leading-none transition-all duration-300 ${
                  isCurrentDark 
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-405' 
                    : 'bg-zinc-50 border-zinc-200/80 text-zinc-950 shadow-sm'
                }`}>
                  <div className={`flex items-center gap-1.5 ${isCurrentDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <Calendar size={13} className="text-emerald-600 animate-pulse" />
                    <span>التاريخ:</span>
                  </div>
                  <div className={`text-left select-text underline decoration-emerald-500/30 underline-offset-2 ${isCurrentDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                    {date.split('-').reverse().join(' / ')}
                  </div>

                  <div className={`flex items-center gap-1.5 ${isCurrentDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <Clock size={13} className="text-emerald-600" />
                    <span>اليوم:</span>
                  </div>
                  <div className={`text-left font-extrabold ${isCurrentDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {data.dayName}
                  </div>

                  <div className={`flex items-center gap-1.5 col-span-1 ${isCurrentDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <Users size={13} className="text-emerald-600" />
                    <span>الوردية:</span>
                  </div>
                  <div className="text-left text-emerald-500 font-extrabold">
                    {data.shift}
                  </div>
                </div>

                {/* Centered Dashboard Titles */}
                <div className="text-center space-y-1.5 flex-1 select-none">
                  <h2 className={`text-3xl font-black tracking-wider font-sans transition-colors duration-300 ${isCurrentDark ? 'text-zinc-100' : 'text-[#0E5F59]'}`}>
                    لوحة متابعة مؤشرات الأداء اليومية
                  </h2>
                  <h3 className={`text-xl font-bold tracking-wide transition-colors duration-300 ${isCurrentDark ? 'text-[#98C21E]' : 'text-[#81A017]'}`}>
                    ريتش لاند للصناعات الغذائية
                  </h3>
                </div>

                {/* Brand and Logo (Last in JSX renders on the left in RTL, achieving "top-left" position) */}
                <div className="flex items-center gap-4 shrink-0">
                  {/* Elegant, clean header trigger button for our floating Quick Control Panel */}
                  <button
                    onClick={() => setShowControlPanel(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0E5F59] dark:bg-emerald-650 hover:bg-[#0C4E49] dark:hover:bg-emerald-600 text-white rounded-2xl text-xs font-black shadow-lg transition-all duration-300 select-none hover:scale-[1.03] active:scale-[0.97]"
                    title={isRtl ? 'لوحة التحكم وإعدادات العرض' : 'Control Panel & Display Settings'}
                  >
                    <Settings size={15} className="animate-spin-slow" />
                    <span>{isRtl ? 'لوحة التحكم' : 'Control Panel'}</span>
                  </button>

                  <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-zinc-200/60 flex items-center justify-center select-none">
                    <img 
                      src="/logo.png" 
                      alt="Rich Land Logo" 
                      className="h-16 w-auto object-contain transition-transform duration-300 hover:scale-105 mix-blend-multiply"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://i.postimg.cc/1XRRDjGB/1643207840139.jpg';
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DYNAMIC SECTIONS GRID BASED ON SECTIONS ORDER AND STYLING PREFERENCES */}
            <div className="space-y-6">
              {mainSectionsOrder.map(sectionId => {
                if (sectionId === 'top_kpis') return renderTopKpis();
                if (sectionId === 'lines') return renderLines();
                if (sectionId === 'charts') return renderCharts();
                return null;
              })}
            </div>

            {/* DELETED STATIC_PLACEHOLDER_BLOCK_1 */}

            {/* FULL-WIDTH SECTION: PRODUCTION LINES PERFORMANCE (أداء خطوط الإنتاج) */}
            {false && <div id="production-lines-block" className="space-y-3">
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
                        <tr className="text-zinc-950 dark:text-zinc-200 border-b border-zinc-200 font-black">
                          <th className="py-1 text-right">المؤشر</th>
                          <th className="py-1 text-center w-12">المخطط</th>
                          <th className="py-1 text-center w-12">الفعلي</th>
                          <th className="py-1 text-center w-12">الكفاءة</th>
                          <th className="py-1 text-center w-6">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100">الإنتاج (كجم)</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">{data.linePacking1.prodPlanned.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">{data.linePacking1.prod.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-[#115E59] dark:text-emerald-400 font-black">{line1_eff_calc}%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon(getLineEffStatus(line1_eff_calc, 100))}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100">الكفاءة (%)</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">{data.linePacking1.effPlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">{data.linePacking1.eff}%</td>
                          <td className="py-1.5 text-center text-emerald-600 dark:text-emerald-400 font-black">102%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('success')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100">Product Waste</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">≤ {data.linePacking1.wastePlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">{data.linePacking1.waste}%</td>
                          <td className="py-1.5 text-center text-zinc-500 dark:text-zinc-500">-</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('success')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100 font-black">Downtime (د)</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">35</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">-</td>
                          <td className="py-1.5 text-center text-zinc-500 dark:text-zinc-500">-</td>
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
                        <tr className="text-zinc-950 dark:text-zinc-200 border-b border-zinc-200 font-black">
                          <th className="py-1 text-right">المؤشر</th>
                          <th className="py-1 text-center w-12">المخطط</th>
                          <th className="py-1 text-center w-12">الفعلي</th>
                          <th className="py-1 text-center w-12">الكفاءة</th>
                          <th className="py-1 text-center w-6">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100">الإنتاج (كجم)</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">{data.linePacking2.prodPlanned.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">{data.linePacking2.prod.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-[#115E59] dark:text-emerald-400 font-black">{line2_eff_calc}%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon(getLineEffStatus(line2_eff_calc, 100))}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100">الكفاءة (%)</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">{data.linePacking2.effPlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">{data.linePacking2.eff}%</td>
                          <td className="py-1.5 text-center text-amber-655 font-black">98%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('warning')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100">Product Waste</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">≤ {data.linePacking2.wastePlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">{data.linePacking2.waste}%</td>
                          <td className="py-1.5 text-center text-zinc-500 dark:text-zinc-500">-</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('warning')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100 font-black">Downtime (د)</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">42</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">-</td>
                          <td className="py-1.5 text-center text-zinc-500 dark:text-zinc-500">-</td>
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
                        <tr className="text-zinc-950 dark:text-zinc-200 border-b border-zinc-200 font-black">
                          <th className="py-1 text-right">المؤشر</th>
                          <th className="py-1 text-center w-12">المخطط</th>
                          <th className="py-1 text-center w-12">الفعلي</th>
                          <th className="py-1 text-center w-12">الكفاءة</th>
                          <th className="py-1 text-center w-6">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100">الإنتاج (كرتونة)</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">{data.linePackaging1.prodPlanned.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">{data.linePackaging1.prod.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-[#115E59] dark:text-emerald-400 font-black">{line3_eff_calc}%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon(getLineEffStatus(line3_eff_calc, 100))}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100">الكفاءة (%)</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">{data.linePackaging1.effPlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">{data.linePackaging1.eff}%</td>
                          <td className="py-1.5 text-center text-emerald-600 dark:text-emerald-400 font-black">104%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('success')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100">Film Waste</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">≤ {data.linePackaging1.wastePlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">{data.linePackaging1.waste}%</td>
                          <td className="py-1.5 text-center text-zinc-500 dark:text-zinc-500">-</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('success')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100 font-black">Downtime (د)</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">25</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">-</td>
                          <td className="py-1.5 text-center text-zinc-500 dark:text-zinc-500">-</td>
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
                        <tr className="text-zinc-950 dark:text-zinc-200 border-b border-zinc-200 font-black">
                          <th className="py-1 text-right">المؤشر</th>
                          <th className="py-1 text-center w-12">المخطط</th>
                          <th className="py-1 text-center w-12">الفعلي</th>
                          <th className="py-1 text-center w-12">الكفاءة</th>
                          <th className="py-1 text-center w-6">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100">الإنتاج (كرتونة)</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">{data.linePackaging2.prodPlanned.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">{data.linePackaging2.prod.toLocaleString()}</td>
                          <td className="py-1.5 text-center text-[#115E59] dark:text-emerald-400 font-black">{line4_eff_calc}%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon(getLineEffStatus(line4_eff_calc, 100))}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100">الكفاءة (%)</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">{data.linePackaging2.effPlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">{data.linePackaging2.eff}%</td>
                          <td className="py-1.5 text-center text-amber-600 dark:text-amber-400 font-black">104%</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('warning')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100">Film Waste</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">≤ {data.linePackaging2.wastePlanned}%</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">{data.linePackaging2.waste}%</td>
                          <td className="py-1.5 text-center text-zinc-500 dark:text-zinc-500">-</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('success')}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-right text-zinc-950 dark:text-zinc-100 font-black">Downtime (د)</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-200 font-extrabold">50</td>
                          <td className="py-1.5 text-center text-zinc-950 dark:text-zinc-100 font-extrabold">-</td>
                          <td className="py-1.5 text-center text-zinc-500 dark:text-zinc-500">-</td>
                          <td className="py-1.5 flex justify-center">{renderStatusIcon('danger')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>}

            {/* CHARTS ROW, LEGEND & NOTES GRID (مؤشرات الاتجاه والرسوم البيانية والمذكرات) */}
            {false && <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
              
              {/* Left Column: Trend chart */}
              <div id="chart-trend-container" className="lg:col-span-4 border border-zinc-200 rounded-[24px] p-4 bg-white flex flex-col justify-between min-h-[290px]">
                <h4 className="text-xs font-black text-center text-zinc-900 flex items-center justify-center gap-1.5 mb-2 border-b border-zinc-200 pb-2 select-none">
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
                      <Line type="monotone" name="efficiency" dataKey="efficiency" stroke="#0E5F59" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" name="waste" dataKey="waste" stroke="#98C21E" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" name="rework" dataKey="rework" stroke="#D48C00" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-3 text-[10px] font-black text-zinc-950 dark:text-zinc-200 pt-1 select-none">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#0E5F59]" />الكفاءة الإنتاجية (%)</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#98C21E]" />Product Waste (%)</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#D48C00]" />Rework (%)</span>
                </div>
              </div>

              {/* Middle Column: Shipped Containers */}
              <div id="chart-containers-container" className="lg:col-span-4 border border-zinc-200 rounded-[24px] p-4 bg-white flex flex-col justify-between min-h-[290px]">
                <h4 className="text-xs font-black text-center text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 pb-2 mb-2 select-none">
                  أداء الحاويات المشحونة خلال الأسبوع
                </h4>
                <div className="w-full flex-1 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weeklyContainers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#888" />
                      <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#888" />
                      <Tooltip contentStyle={{ fontSize: 10, direction: 'rtl', borderRadius: 12 }} />
                      <Bar dataKey="value" fill="#8DB825" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center text-[11px] font-black text-zinc-950 dark:text-zinc-200 select-none">
                  عدد الحاويات المشحونة يومياً
                </div>
              </div>

              {/* Right Column: Legend Key */}
              <div className="lg:col-span-2 border border-zinc-200 rounded-[24px] p-4 bg-white min-h-[290px] flex flex-col select-none">
                <h4 className="text-xs font-black text-center text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 pb-2 mb-3">
                  مفتاح الحالة
                </h4>
                <div className="flex-1 flex flex-col justify-center space-y-4 text-xs font-black px-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black shadow-sm">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span className="dark:text-zinc-100">ضمن المستهدف</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white font-black text-lg select-none leading-none">
                      -
                    </div>
                    <span className="dark:text-zinc-100">يحتاج إلى متابعة</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#E11D48] flex items-center justify-center text-white font-black shadow-sm">
                      <X size={14} strokeWidth={3} />
                    </div>
                    <span className="dark:text-zinc-100">خارج المستهدف</span>
                  </div>
                </div>
              </div>

              {/* Far Right Column: Notebook comments block */}
              <div id="notes-notebook-container" className="lg:col-span-2 border border-zinc-200 rounded-[24px] p-4 bg-amber-50/20 dark:bg-zinc-900/10 min-h-[290px] flex flex-col">
                <h4 className="text-xs font-black text-center text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 pb-2 mb-3 select-none">
                  ملاحظات
                </h4>
                
                {/* Styled Lined Notebook paper look with spacing */}
                <div className="flex-1 flex flex-col relative justify-between">
                  <p className="text-[11.5px] leading-6 font-black text-zinc-950 dark:text-zinc-100 z-10 px-1 italic select-text">
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

            </div>}

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
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {isRtl ? 'تعديل قيم مؤشرات الأداء' : 'Edit KPI Monitoring values'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {isRtl ? `تعديل البيانات لـ: ${editFormData.date}` : `Modify fields for: ${editFormData.date}`}
                  </p>
                </div>
                <button onClick={() => setShowEditor(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                  <X size={20} />
                </button>
              </div>

              {/* Form Content Scrollable */}
              <div className="flex-1 overflow-y-auto py-5 space-y-6 text-xs text-zinc-800 dark:text-zinc-300">
                
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
                  <h4 className="font-extrabold text-teal-600 dark:text-teal-400 border-b border-zinc-200 pb-1 flex items-center gap-1 text-sm">
                    <div className="w-1.5 h-3 bg-teal-500 rounded" />
                    <span>{isRtl ? 'قسم الإنتاج (Production)' : 'Production KPIs'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Total prod */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">{isRtl ? 'إجمالي الإنتاج (كجم)' : 'Total Prod (kg)'}</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">الفعلي</span>
                          <input type="number" value={editFormData.prodTotal.actual} onChange={(e) => handleEditField('prodTotal', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300" />
                        </div>
                        <div>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">المستهدف</span>
                          <input type="number" value={editFormData.prodTotal.target} onChange={(e) => handleEditField('prodTotal', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300" />
                        </div>
                      </div>
                      <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800/50 mt-1">
                        <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">تجاوز الحالة</span>
                        <select value={editFormData.prodTotal.statusOverride || 'auto'} onChange={(e) => handleOverrideStatus('prodTotal', 'actual', e.target.value)} className="w-full p-1 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300">
                          <option value="auto">تلقائي (Auto)</option>
                          <option value="success">✅ مقبول (Acceptable)</option>
                          <option value="warning">🟡 متابعة (Warning)</option>
                          <option value="danger">❌ مرفوض (Rejected)</option>
                        </select>
                      </div>
                    </div>

                    {/* Efficiency */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">{isRtl ? 'الكفاءة الإنتاجية (%)' : 'Productivity Efficiency (%)'}</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">الفعلي</span>
                          <input type="number" value={editFormData.prodEfficiency.actual} onChange={(e) => handleEditField('prodEfficiency', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300" />
                        </div>
                        <div>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">المستهدف</span>
                          <input type="number" value={editFormData.prodEfficiency.target} onChange={(e) => handleEditField('prodEfficiency', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300" />
                        </div>
                      </div>
                      <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800/50 mt-1">
                        <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">تجاوز الحالة</span>
                        <select value={editFormData.prodEfficiency.statusOverride || 'auto'} onChange={(e) => handleOverrideStatus('prodEfficiency', 'actual', e.target.value)} className="w-full p-1 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300">
                          <option value="auto">تلقائي (Auto)</option>
                          <option value="success">✅ مقبول (Acceptable)</option>
                          <option value="warning">🟡 متابعة (Warning)</option>
                          <option value="danger">❌ مرفوض (Rejected)</option>
                        </select>
                      </div>
                    </div>

                    {/* Product Waste */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">Product Waste (%)</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">الفعلي</span>
                          <input type="number" step="0.1" value={editFormData.prodWaste.actual} onChange={(e) => handleEditField('prodWaste', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300" />
                        </div>
                        <div>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">المستهدف</span>
                          <input type="number" step="0.1" value={editFormData.prodWaste.target} onChange={(e) => handleEditField('prodWaste', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300" />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* 2. Quality inputs */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-blue-600 dark:text-blue-400 border-b border-zinc-200 pb-1 flex items-center gap-1 text-sm">
                    <div className="w-1.5 h-3 bg-blue-500 rounded" />
                    <span>{isRtl ? 'قسم الجودة (Quality)' : 'Quality KPIs'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Hold Cases */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">عدد حالات الـ Hold</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">الفعلي</span>
                          <input type="number" value={editFormData.qualHoldCases.actual} onChange={(e) => handleEditField('qualHoldCases', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300" />
                        </div>
                        <div>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">المستهدف</span>
                          <input type="number" value={editFormData.qualHoldCases.target} onChange={(e) => handleEditField('qualHoldCases', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300" />
                        </div>
                      </div>
                      <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800/50 mt-1">
                        <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">تجاوز الحالة</span>
                        <select value={editFormData.qualHoldCases.statusOverride || 'auto'} onChange={(e) => handleOverrideStatus('qualHoldCases', 'actual', e.target.value)} className="w-full p-1 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300">
                          <option value="auto">تلقائي (Auto)</option>
                          <option value="success">✅ مقبول</option>
                          <option value="warning">🟡 متابعة</option>
                          <option value="danger">❌ مرفوض</option>
                        </select>
                      </div>
                    </div>

                    {/* Food Safety */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">مخالفات الفود سيفتي</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">الفعلي</span>
                          <input type="number" value={editFormData.qualFoodSafety.actual} onChange={(e) => handleEditField('qualFoodSafety', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300" />
                        </div>
                        <div>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">المستهدف</span>
                          <input type="number" value={editFormData.qualFoodSafety.target} onChange={(e) => handleEditField('qualFoodSafety', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300" />
                        </div>
                      </div>
                    </div>

                    {/* GMP Score */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">GMP Score (%)</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">الفعلي</span>
                          <input type="number" value={editFormData.qualGmpScore.actual} onChange={(e) => handleEditField('qualGmpScore', 'actual', 'actual', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300" />
                        </div>
                        <div>
                          <span className="text-zinc-700 dark:text-zinc-300 font-extrabold block mb-0.5">المستهدف</span>
                          <input type="number" value={editFormData.qualGmpScore.target} onChange={(e) => handleEditField('qualGmpScore', 'actual', 'target', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-300" />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* 3. Notes & thoughts */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-zinc-600 dark:text-zinc-300 flex items-center gap-1 text-sm border-b pb-1">
                    <div className="w-1.5 h-3 bg-zinc-400 dark:bg-zinc-300 rounded" />
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
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-end gap-2 text-zinc-850 dark:text-zinc-150">
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

      {/* PERSISTENT FLOATING CONTROL BUTTON */}
      <div className={`fixed bottom-6 left-6 z-[999] transition-all duration-300 ${isTvMode ? 'opacity-30 hover:opacity-100 scale-90 hover:scale-100' : 'opacity-100'}`}>
        <button
          onClick={() => setShowControlPanel(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-700 text-white rounded-full text-xs font-black shadow-2xl transition-all duration-300 select-none hover:scale-105 active:scale-95 border-2 border-white dark:border-zinc-800 cursor-pointer"
        >
          <Settings size={15} className="animate-spin-slow" />
          <span>{isRtl ? 'لوحة التحكم والخيارات' : 'Control Panel'}</span>
        </button>
      </div>

      {/* FLOATING ACTION CONTROL PANEL MODAL (الشاشة العائمة) */}
      <AnimatePresence>
        {showControlPanel && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowControlPanel(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Content container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-md p-6 rounded-[28px] shadow-2xl border transition-all overflow-hidden ${
                isCurrentDark 
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-100' 
                  : 'bg-white border-zinc-200 text-zinc-850'
              }`}
              dir="rtl"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-black flex items-center gap-2 text-[#0D5F54] dark:text-emerald-400">
                  <Settings size={16} className="animate-spin-slow" />
                  <span>{isRtl ? 'لوحة التحكم وإعدادات العرض' : 'Control Panel & Display Settings'}</span>
                </h3>
                <button
                  onClick={() => setShowControlPanel(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 transition-colors text-zinc-500 dark:text-zinc-400"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Grid of operational buttons */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                
                {/* Button 1: TV Broadcast Mode Toggle (بث التلفزيون / خروج من البث) */}
                <button
                  onClick={() => {
                    setShowControlPanel(false);
                    handleToggleFullscreen();
                  }}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-600 dark:text-teal-400 font-bold transition-all text-center gap-2 active:scale-95"
                >
                  <Tv size={20} className="text-teal-500" />
                  <span className="text-[11px] font-black">
                    {isTvMode 
                      ? (isRtl ? 'خروج من البث' : 'Exit TV Broadcast') 
                      : (isRtl ? 'بث التلفزيون (كامل الشاشة)' : 'TV Broadcast Mode')}
                  </span>
                </button>

                {/* Button 2: Customize Spaces & Layout (تعديل المساحات) */}
                <button
                  onClick={() => {
                    setShowControlPanel(false);
                    setShowCustomizer(!showCustomizer);
                    setShowConfig(false);
                  }}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold transition-all text-center gap-2 active:scale-95"
                >
                  <Sliders size={20} className="text-amber-500" />
                  <span className="text-[11px] font-black">
                    {isRtl ? 'تعديل الترتيب والمساحات' : 'Adjust Layout & Spaces'}
                  </span>
                </button>

                {/* Button 3: Manual Edit (التعديل اليدوي) */}
                <button
                  onClick={() => {
                    setShowControlPanel(false);
                    handleOpenManualEditor();
                  }}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold transition-all text-center gap-2 active:scale-95"
                >
                  <Edit3 size={20} className="text-blue-500" />
                  <span className="text-[11px] font-black">
                    {isRtl ? 'تعديل يدوي للمؤشرات' : 'Manual Edit'}
                  </span>
                </button>

                {/* Button 4: Google Sheets Sync (ربط جوجل) */}
                <button
                  onClick={() => {
                    setShowControlPanel(false);
                    setShowConfig(!showConfig);
                    setShowCustomizer(false);
                  }}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold transition-all text-center gap-2 active:scale-95"
                >
                  <FileSpreadsheet size={20} className="text-emerald-500" />
                  <span className="text-[11px] font-black">
                    {isRtl ? 'ربط جوجل شيت' : 'Google Sheet Sync'}
                  </span>
                </button>

                {/* Button 5: Download PDF */}
                <button
                  onClick={() => {
                    setShowControlPanel(false);
                    handleExportPDF();
                  }}
                  className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-zinc-500/10 hover:bg-zinc-500/20 border border-zinc-500/20 text-zinc-650 dark:text-zinc-300 font-bold transition-all text-center gap-2 active:scale-95 col-span-2"
                >
                  <Printer size={18} className="text-zinc-500 dark:text-zinc-400" />
                  <span className="text-[11px] font-black">
                    {isRtl ? 'تحميل التقرير كـ PDF' : 'Download PDF Report'}
                  </span>
                </button>

              </div>

              {/* Date selection field integrated natively in the floating screen */}
              <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 space-y-1.5">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold block">تاريخ عرض البيانات ومزامنته:</span>
                <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-700/80 rounded-xl px-3 py-1.5 font-mono">
                  <Calendar size={13} className="text-zinc-400" />
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer focus:ring-0 text-xs w-full text-right"
                  />
                </div>
              </div>

              {/* Footer notes */}
              <div className="mt-4 text-center">
                <p className="text-[10px] text-zinc-400 font-bold">
                  {isRtl 
                    ? 'ريتش لاند للصناعات الغذائية - لوحة مؤشرات الأداء' 
                    : 'Rich Land Food Industries - KPI Dashboard'}
                </p>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

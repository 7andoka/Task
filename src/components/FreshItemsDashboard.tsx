import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  Search, 
  Download, 
  SlidersHorizontal, 
  Layers, 
  Grid3X3, 
  Table as TableIcon, 
  ArrowUpRight, 
  Filter, 
  Check, 
  Trophy, 
  Award, 
  Container, 
  Building2, 
  Boxes,
  Percent,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';

export interface FreshItemSummaryData {
  itemName: string;
  sapCode: string;
  oldCode: string;
  unit: string;
  variety: string;
  varietyName: string;
  varietyColor: string;
  totalKg: number;
  totalTons: number;
  count: number;
  suppliers: Set<string>;
  suppliersMap: Map<string, number>;
  topSupplier: string;
  locations: Set<string>;
  tankKg: number;
  tankTons: number;
  barrelKg: number;
  barrelTons: number;
  stores: Set<string>;
}

interface FreshItemsDashboardProps {
  items: FreshItemSummaryData[];
  totalKg: number;
  totalTons: number;
  barrelTons: number;
  tankTons: number;
  isRtl: boolean;
  onFilterByItem: (itemName: string) => void;
  onExportExcel: () => void;
}

const CHART_PALETTE = [
  '#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#3b82f6', '#14b8a6', '#f97316', 
  '#6366f1', '#84cc16', '#eab308', '#0ea5e9'
];

export const FreshItemsDashboard: React.FC<FreshItemsDashboardProps> = ({
  items,
  totalKg,
  totalTons,
  barrelTons,
  tankTons,
  isRtl,
  onFilterByItem,
  onExportExcel
}) => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'cards' | 'table'>('dashboard');
  const [chartTab, setChartTab] = useState<'itemsDonut' | 'varietyDonut' | 'volumeBar'>('itemsDonut');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<'tons_desc' | 'tons_asc' | 'count_desc' | 'name_asc'>('tons_desc');
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(item =>
        item.itemName.toLowerCase().includes(q) ||
        item.sapCode.toLowerCase().includes(q) ||
        item.oldCode.toLowerCase().includes(q) ||
        item.varietyName.toLowerCase().includes(q) ||
        item.topSupplier.toLowerCase().includes(q)
      );
    }
    switch (sortOption) {
      case 'tons_desc':
        result.sort((a, b) => b.totalKg - a.totalKg);
        break;
      case 'tons_asc':
        result.sort((a, b) => a.totalKg - b.totalKg);
        break;
      case 'count_desc':
        result.sort((a, b) => b.count - a.count);
        break;
      case 'name_asc':
        result.sort((a, b) => a.itemName.localeCompare(b.itemName, 'ar'));
        break;
    }
    return result;
  }, [items, searchTerm, sortOption]);

  // Top dominant item
  const topItem = items.length > 0 ? items[0] : null;
  const topItemPercent = topItem && totalKg > 0 ? ((topItem.totalKg / totalKg) * 100).toFixed(1) : '0';

  // Donut 1: Top 6 items + Others (فطيرة الأصناف)
  const itemsPieData = useMemo(() => {
    if (!items.length) return [];
    const sumTons = totalTons || 1;
    const top = items.slice(0, 6);
    const others = items.slice(6);

    const result = top.map((item, idx) => ({
      name: item.itemName,
      tons: parseFloat(item.totalTons.toFixed(2)),
      kg: item.totalKg,
      percent: parseFloat(((item.totalTons / sumTons) * 100).toFixed(1)),
      color: CHART_PALETTE[idx % CHART_PALETTE.length],
      count: item.count
    }));

    if (others.length > 0) {
      const otherTons = others.reduce((acc, i) => acc + i.totalTons, 0);
      result.push({
        name: isRtl ? `باقي الأصناف (${others.length})` : `Other Items (${others.length})`,
        tons: parseFloat(otherTons.toFixed(2)),
        kg: others.reduce((acc, i) => acc + i.totalKg, 0),
        percent: parseFloat(((otherTons / sumTons) * 100).toFixed(1)),
        color: '#94a3b8',
        count: others.reduce((acc, i) => acc + i.count, 0)
      });
    }
    return result;
  }, [items, totalTons, isRtl]);

  // Donut 2: Variety aggregation (فطيرة أنواع الزيتون والفريش)
  const varietyPieData = useMemo(() => {
    if (!items.length) return [];
    const sumTons = totalTons || 1;
    const map = new Map<string, { tons: number; kg: number; count: number; name: string; color: string }>();

    items.forEach(item => {
      const v = item.variety;
      if (!map.has(v)) {
        map.set(v, {
          tons: 0,
          kg: 0,
          count: 0,
          name: item.varietyName,
          color: item.varietyColor
        });
      }
      const entry = map.get(v)!;
      entry.tons += item.totalTons;
      entry.kg += item.totalKg;
      entry.count += item.count;
    });

    return Array.from(map.entries())
      .map(([id, d]) => ({
        id,
        name: d.name,
        tons: parseFloat(d.tons.toFixed(2)),
        kg: d.kg,
        percent: parseFloat(((d.tons / sumTons) * 100).toFixed(1)),
        color: d.color,
        count: d.count
      }))
      .sort((a, b) => b.tons - a.tons);
  }, [items, totalTons]);

  // Bar Data: Top 10 items
  const barChartData = useMemo(() => {
    return items.slice(0, 10).map(item => ({
      name: item.itemName.length > 18 ? item.itemName.slice(0, 18) + '...' : item.itemName,
      fullName: item.itemName,
      tons: parseFloat(item.totalTons.toFixed(2)),
      count: item.count,
      percent: totalKg > 0 ? ((item.totalKg / totalKg) * 100).toFixed(1) : '0'
    }));
  }, [items, totalKg]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* 1. Header & Controls Ribbon */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black text-zinc-900 dark:text-white">
                  {isRtl ? 'لوحة تحليلات وإحصائيات الأصناف (Fresh Items Dashboard)' : 'Fresh Items Dashboard'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isRtl 
                    ? `إجمالي ${items.length} صنف تم توريدهم بحجم إجمالي ${totalTons.toFixed(2)} طن` 
                    : `Total ${items.length} items supplied totaling ${totalTons.toFixed(2)} tons`}
                </p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'dashboard'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <PieChartIcon className="w-3.5 h-3.5" />
                <span>{isRtl ? 'لوحة المؤشرات والرسوم' : 'Dashboard'}</span>
              </button>

              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>{isRtl ? 'كروت الأصناف الذكية' : 'Cards Grid'}</span>
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>{isRtl ? 'الجدول التحليلي' : 'Data Table'}</span>
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={onExportExcel}
              className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title={isRtl ? 'تصدير ملخص الأصناف لإكسيل' : 'Export items summary to Excel'}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRtl ? 'تصدير إكسيل' : 'Export'}</span>
            </button>
          </div>
        </div>

        {/* Search & Sort Bar */}
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={isRtl ? 'بحث باسم الصنف أو كود ساب أو المورد...' : 'Search items, SAP codes...'}
              className="w-full pl-3 pr-9 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-zinc-500 whitespace-nowrap flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{isRtl ? 'الترتيب:' : 'Sort:'}</span>
            </span>
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="tons_desc">{isRtl ? 'الوزن (الأعلى أولاً)' : 'Highest Tonnage'}</option>
              <option value="tons_asc">{isRtl ? 'الوزن (الأقل أولاً)' : 'Lowest Tonnage'}</option>
              <option value="count_desc">{isRtl ? 'عدد الحركات (الأكثر)' : 'Most Movements'}</option>
              <option value="name_asc">{isRtl ? 'أبجدياً (أ - ي)' : 'Alphabetical (A-Z)'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Top Executive KPI Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Active Items */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">
              {isRtl ? 'إجمالي الأصناف الموردة' : 'Active Produce Items'}
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 rounded-xl">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <strong className="text-2xl font-black font-mono text-zinc-900 dark:text-white">
              {items.length}
            </strong>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-1.5 ml-1.5 font-bold">
              {isRtl ? 'صنف معتمد' : 'varieties'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>{isRtl ? `${items.reduce((acc, i) => acc + i.count, 0)} حركة استلام` : `${items.reduce((acc, i) => acc + i.count, 0)} receipts`}</span>
          </div>
        </div>

        {/* KPI 2: Top Dominant Item */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">
              {isRtl ? 'الصنف الأكثر توريداً (#1)' : 'Dominant Item (#1)'}
            </span>
            <div className="p-2 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 rounded-xl">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-sm font-black text-zinc-900 dark:text-white truncate" title={topItem?.itemName}>
              {topItem ? topItem.itemName : '-'}
            </h4>
            <div className="flex items-baseline gap-2 mt-1">
              <strong className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                {topItem ? topItem.totalTons.toFixed(2) : '0'} <span className="text-xs font-sans">طن</span>
              </strong>
              <span className="text-xs font-mono font-bold text-zinc-400">
                ({topItemPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Average Intake Per Item */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">
              {isRtl ? 'متوسط توريد الصنف' : 'Avg Intake Per Item'}
            </span>
            <div className="p-2 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 rounded-xl">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <strong className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
              {items.length > 0 ? (totalTons / items.length).toFixed(2) : '0'}
            </strong>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-1.5 ml-1.5 font-bold">
              {isRtl ? 'طن / صنف' : 'tons / item'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 font-bold">
            {isRtl ? `إجمالي الفريش: ${totalTons.toFixed(2)} طن` : `Total: ${totalTons.toFixed(2)}t`}
          </div>
        </div>

        {/* KPI 4: Packaging Storage Ratio (Barrels vs Tanks) */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">
              {isRtl ? 'توزيع التخزين (براميل / تانك)' : 'Packaging Ratio'}
            </span>
            <div className="p-2 bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400 rounded-xl">
              <Container className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-cyan-600 dark:text-cyan-400">براميل: {barrelTons.toFixed(1)} طن</span>
            <span className="text-emerald-600 dark:text-emerald-400">تانك: {tankTons.toFixed(1)} طن</span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
            <div 
              className="bg-cyan-500 h-full"
              style={{ width: `${totalTons > 0 ? (barrelTons / totalTons) * 100 : 50}%` }}
              title={`براميل: ${totalTons > 0 ? ((barrelTons / totalTons) * 100).toFixed(1) : 0}%`}
            />
            <div 
              className="bg-emerald-500 h-full"
              style={{ width: `${totalTons > 0 ? (tankTons / totalTons) * 100 : 50}%` }}
              title={`تانك: ${totalTons > 0 ? ((tankTons / totalTons) * 100).toFixed(1) : 0}%`}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-zinc-400">
            <span>{totalTons > 0 ? ((barrelTons / totalTons) * 100).toFixed(1) : 0}% براميل</span>
            <span>{totalTons > 0 ? ((tankTons / totalTons) * 100).toFixed(1) : 0}% تانكات</span>
          </div>
        </div>

      </div>

      {/* 3. Visual Charts & Pie Sections ("فطير وتشارتات متقدمة") */}
      {(viewMode === 'dashboard' || viewMode === 'cards') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Donut Pie Chart (فطيرة حصص الأصناف الرئيسية) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-500" />
                  <span>{isRtl ? 'فطيرة الحصص النسبية للأصناف الموردة' : 'Fresh Produce Shares Donut'}</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {isRtl ? 'توزيع الأوزان النسبية لأعلى 6 أصناف مع باقي الأصناف' : 'Tonnage distribution for top items vs others'}
                </p>
              </div>

              {/* Chart Sub-Tab Switcher */}
              <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <button
                  onClick={() => setChartTab('itemsDonut')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    chartTab === 'itemsDonut' ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-zinc-500'
                  }`}
                >
                  {isRtl ? 'حسب الصنف' : 'By Item'}
                </button>
                <button
                  onClick={() => setChartTab('varietyDonut')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    chartTab === 'varietyDonut' ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-zinc-500'
                  }`}
                >
                  {isRtl ? 'حسب النوع المعتمد' : 'By Variety'}
                </button>
                <button
                  onClick={() => setChartTab('volumeBar')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    chartTab === 'volumeBar' ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-zinc-500'
                  }`}
                >
                  {isRtl ? 'مدرج الأعمدة' : 'Bar Chart'}
                </button>
              </div>
            </div>

            {/* Chart Canvas Area */}
            <div className="py-4">
              {chartTab === 'itemsDonut' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-7 h-64 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          formatter={(val: any, name: any) => [`${Number(val).toFixed(2)} طن`, name]}
                          contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                        />
                        <Pie
                          data={itemsPieData}
                          dataKey="tons"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                        >
                          {itemsPieData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Total Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{isRtl ? 'إجمالي الأصناف' : 'Total'}</span>
                      <strong className="text-lg font-black font-mono text-zinc-900 dark:text-white leading-none mt-0.5">
                        {totalTons.toFixed(1)}
                      </strong>
                      <span className="text-[10px] text-zinc-500 font-sans">{isRtl ? 'طن فريش' : 'Tons'}</span>
                    </div>
                  </div>

                  {/* Interactive Legend List */}
                  <div className="md:col-span-5 space-y-2">
                    {itemsPieData.map((entry, idx) => (
                      <div 
                        key={entry.name}
                        onClick={() => onFilterByItem(entry.name.includes('باقي') ? '' : entry.name)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2 truncate max-w-[150px]">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate" title={entry.name}>
                            {entry.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-zinc-900 dark:text-white">{entry.tons.toFixed(1)} طن</span>
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            {entry.percent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {chartTab === 'varietyDonut' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-7 h-64 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          formatter={(val: any, name: any) => [`${Number(val).toFixed(2)} طن`, name]}
                          contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                        />
                        <Pie
                          data={varietyPieData}
                          dataKey="tons"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                        >
                          {varietyPieData.map((entry, idx) => (
                            <Cell key={`var-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[10px] font-bold text-zinc-400">{isRtl ? 'أنواع الزيتون' : 'Varieties'}</span>
                      <strong className="text-lg font-black font-mono text-zinc-900 dark:text-white leading-none mt-0.5">
                        {varietyPieData.length}
                      </strong>
                      <span className="text-[10px] text-zinc-500">{isRtl ? 'نوع معتمد' : 'types'}</span>
                    </div>
                  </div>

                  <div className="md:col-span-5 space-y-2">
                    {varietyPieData.map((entry) => (
                      <div 
                        key={entry.name}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-zinc-900 dark:text-white">{entry.tons.toFixed(1)} طن</span>
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            {entry.percent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {chartTab === 'volumeBar' && (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 45 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10 }} 
                        angle={-25} 
                        textAnchor="end" 
                        interval={0} 
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any) => [`${Number(val).toFixed(2)} طن`, 'الكمية']}
                        labelFormatter={(lbl, p) => p?.[0]?.payload?.fullName || lbl}
                        contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                      />
                      <Bar dataKey="tons" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span>{isRtl ? 'اضغط على أي صنف لتصفية الجدول بالكامل به' : 'Click any item to filter entire workspace'}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {items.length} {isRtl ? 'صنف إجمالي' : 'items total'}
              </span>
            </div>
          </div>

          {/* Chart 2: Top 5 Items Leaderboard Widget */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>{isRtl ? 'ترتيب أعلى 5 أصناف توريداً' : 'Top 5 Items Ranking'}</span>
                </h3>
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  {isRtl ? 'المتصدرون' : 'Leaders'}
                </span>
              </div>

              <div className="mt-4 space-y-3.5">
                {items.slice(0, 5).map((item, idx) => {
                  const share = totalKg > 0 ? ((item.totalKg / totalKg) * 100).toFixed(1) : '0';
                  const medalColor = idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-zinc-300 text-zinc-800' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300';
                  return (
                    <div 
                      key={item.itemName}
                      onClick={() => onFilterByItem(item.itemName)}
                      className="p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all cursor-pointer group hover:shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${medalColor}`}>
                            {idx + 1}
                          </span>
                          <span className="font-black text-xs text-zinc-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors" title={item.itemName}>
                            {item.itemName}
                          </span>
                        </div>
                        <div className="text-left font-mono shrink-0">
                          <span className="font-black text-xs text-zinc-900 dark:text-white">{item.totalTons.toFixed(1)} طن</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2 w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(5, parseFloat(share)))}%` }}
                        />
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400">
                        <span>{item.count} حركة | {item.suppliers.size} مورد</span>
                        <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{share}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-center">
              <button
                onClick={() => setViewMode('table')}
                className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center justify-center gap-1 w-full cursor-pointer"
              >
                <span>{isRtl ? 'عرض جدول المقارنة الشامل لجميع الأصناف' : 'View full comparison table'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 4. Smart Cards Grid (Shown in Dashboard & Cards view) */}
      {(viewMode === 'dashboard' || viewMode === 'cards') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-emerald-500" />
              <span>{isRtl ? `كروت الأصناف الذكية (${filteredItems.length} صنف)` : `Smart Item Cards (${filteredItems.length})`}</span>
            </h3>
            {searchTerm && (
              <span className="text-xs text-zinc-400">
                {isRtl ? `مطابق لـ: "${searchTerm}"` : `Matching: "${searchTerm}"`}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item, idx) => {
              const percent = totalKg > 0 ? ((item.totalKg / totalKg) * 100).toFixed(1) : '0';
              return (
                <div 
                  key={item.itemName}
                  className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:border-emerald-400 dark:hover:border-emerald-700 transition-all hover:shadow-md group"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.varietyColor }} />
                          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                            {item.varietyName}
                          </span>
                        </div>
                        <h3 className="font-black text-sm text-zinc-900 dark:text-white leading-tight truncate group-hover:text-emerald-600 transition-colors" title={item.itemName}>
                          {item.itemName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {item.sapCode && (
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md font-bold">
                              SAP: {item.sapCode}
                            </span>
                          )}
                          {item.oldCode && (
                            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                              كود: {item.oldCode}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                          {percent}%
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400">
                          #{idx + 1}
                        </span>
                      </div>
                    </div>

                    {/* Weight Metric Grid */}
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-2xl">
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-medium">{isRtl ? 'الكمية بالطن' : 'Tons'}</span>
                        <strong className="text-base font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {item.totalTons.toFixed(2)} <span className="text-[11px] font-sans">طن</span>
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-medium">{isRtl ? 'الكمية بالكيلو' : 'Kilograms'}</span>
                        <strong className="text-sm font-mono font-bold text-zinc-900 dark:text-white">
                          {item.totalKg.toLocaleString()} <span className="text-[10px] font-sans text-zinc-400">كجم</span>
                        </strong>
                      </div>
                    </div>

                    {/* Storage Breakdown Tags */}
                    <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Container className="w-3 h-3 text-cyan-500" />
                        <span>براميل: {item.barrelTons.toFixed(1)} طن</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Building2 className="w-3 h-3 text-emerald-500" />
                        <span>تانك: {item.tankTons.toFixed(1)} طن</span>
                      </span>
                    </div>

                    {/* Progress Bar of Total */}
                    <div className="mt-2 w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(4, parseFloat(percent)))}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer & Action Button */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-zinc-500 font-medium truncate max-w-[170px]">
                      <span>{item.count} حركة</span>
                      <span className="mx-1">•</span>
                      <span>{item.suppliers.size} مورد</span>
                    </div>

                    <button
                      onClick={() => onFilterByItem(item.itemName)}
                      className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                      title={isRtl ? 'تصفية الجدول بهذا الصنف' : 'Filter table by item'}
                    >
                      <Filter className="w-3 h-3" />
                      <span>{isRtl ? 'تصفية الجدول' : 'Filter'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Comprehensive Aggregate Table (Shown in Table or Dashboard view) */}
      {(viewMode === 'table' || viewMode === 'dashboard') && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-emerald-500" />
                <span>{isRtl ? 'الجدول التحليلي الشامل لكميات الأصناف ومقارنتها' : 'Comprehensive Item Aggregation Table'}</span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {isRtl ? 'مقارنة مفصلة بالأوزان، نسب المشاركة، أسلوب التخزين، وأبرز الموردين' : 'Detailed metric comparison for all items'}
              </p>
            </div>

            <span className="text-xs font-mono font-bold text-zinc-500">
              {filteredItems.length} {isRtl ? 'صنف مسجل' : 'items'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-black border-b border-zinc-200 dark:border-zinc-700">
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4">{isRtl ? 'اسم الصنف' : 'Item Name'}</th>
                  <th className="py-3 px-4">{isRtl ? 'النوع المعتمد' : 'Variety'}</th>
                  <th className="py-3 px-4">{isRtl ? 'كود SAP / القديم' : 'Codes'}</th>
                  <th className="py-3 px-4">{isRtl ? 'إجمالي الكمية (كجم)' : 'Total KG'}</th>
                  <th className="py-3 px-4">{isRtl ? 'إجمالي الكمية (طن)' : 'Total Tons'}</th>
                  <th className="py-3 px-4">{isRtl ? 'النسبة المئوية' : '% Share'}</th>
                  <th className="py-3 px-4">{isRtl ? 'الحركات' : 'Movements'}</th>
                  <th className="py-3 px-4">{isRtl ? 'أعلى مورد' : 'Top Supplier'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredItems.map((item, idx) => {
                  const percent = totalKg > 0 ? ((item.totalKg / totalKg) * 100).toFixed(2) : '0';
                  return (
                    <tr key={item.itemName} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono text-zinc-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-black text-zinc-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.varietyColor }} />
                          <span className="font-black">{item.itemName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {item.varietyName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-500">
                        {item.sapCode || item.oldCode || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-white">
                        {item.totalKg.toLocaleString()} كجم
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {item.totalTons.toFixed(3)} طن
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(3, parseFloat(percent)))}%` }}
                            />
                          </div>
                          <span className="font-mono font-black text-zinc-800 dark:text-zinc-200">{percent}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-600 dark:text-zinc-400">
                        {item.count}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] font-bold truncate max-w-[150px]">
                        {item.topSupplier || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onFilterByItem(item.itemName)}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 transition-colors cursor-pointer"
                          title={isRtl ? 'تصفية الجدول' : 'Filter by item'}
                        >
                          <Filter className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

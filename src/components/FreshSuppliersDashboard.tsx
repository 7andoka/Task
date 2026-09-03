import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Download, 
  Grid3X3, 
  Table as TableIcon, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Trophy, 
  Award, 
  Truck, 
  User, 
  Filter, 
  ArrowUpRight, 
  ArrowUpDown, 
  Sparkles,
  Container,
  Activity,
  Layers
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
import { normalizeArabicSearch, matchesArabicSearch } from '../utils/arabic';

export interface FreshSupplierSummaryData {
  costCenter: string;
  costCenterCode: string;
  totalKg: number;
  totalTons: number;
  count: number;
  items: Set<string>;
  itemsMap: Map<string, number>;
  topItem: string;
  trucks: Set<string>;
  drivers: Set<string>;
  tankKg: number;
  tankTons: number;
  barrelKg: number;
  barrelTons: number;
  dates: Set<string>;
  avgShipmentTons: number;
}

interface FreshSuppliersDashboardProps {
  suppliers: FreshSupplierSummaryData[];
  totalKg: number;
  totalTons: number;
  uniqueTrucks: number;
  isRtl: boolean;
  onFilterBySupplier: (supplierName: string) => void;
  onExportExcel: () => void;
}

const CHART_PALETTE = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', 
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', 
  '#14b8a6', '#84cc16', '#eab308', '#0ea5e9'
];

export const FreshSuppliersDashboard: React.FC<FreshSuppliersDashboardProps> = ({
  suppliers,
  totalKg,
  totalTons,
  uniqueTrucks,
  isRtl,
  onFilterBySupplier,
  onExportExcel
}) => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'cards' | 'table'>('dashboard');
  const [chartTab, setChartTab] = useState<'suppliersDonut' | 'top10Bar' | 'movementsBar'>('suppliersDonut');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<'tons_desc' | 'tons_asc' | 'count_desc' | 'name_asc'>('tons_desc');

  // Filtered & Sorted Suppliers
  const filteredSuppliers = useMemo(() => {
    let result = [...suppliers];
    if (searchTerm.trim()) {
      const q = normalizeArabicSearch(searchTerm);
      const raw = searchTerm.toLowerCase().trim();
      result = result.filter(sup =>
        matchesArabicSearch(sup.costCenter, q) ||
        matchesArabicSearch(sup.costCenterCode, q) ||
        matchesArabicSearch(sup.topItem, q) ||
        sup.costCenter.toLowerCase().includes(raw)
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
        result.sort((a, b) => a.costCenter.localeCompare(b.costCenter, 'ar'));
        break;
    }
    return result;
  }, [suppliers, searchTerm, sortOption]);

  // Top dominant supplier
  const topSupplier = suppliers.length > 0 ? suppliers[0] : null;
  const topSupplierPercent = topSupplier && totalKg > 0 ? ((topSupplier.totalKg / totalKg) * 100).toFixed(1) : '0';

  // Donut 1: Top 7 Suppliers + Others (فطيرة حصص الموردين)
  const suppliersPieData = useMemo(() => {
    if (!suppliers.length) return [];
    const sumTons = totalTons || 1;
    const top = suppliers.slice(0, 7);
    const others = suppliers.slice(7);

    const result = top.map((sup, idx) => ({
      name: sup.costCenter,
      code: sup.costCenterCode,
      tons: parseFloat(sup.totalTons.toFixed(2)),
      kg: sup.totalKg,
      percent: parseFloat(((sup.totalTons / sumTons) * 100).toFixed(1)),
      color: CHART_PALETTE[idx % CHART_PALETTE.length],
      count: sup.count
    }));

    if (others.length > 0) {
      const otherTons = others.reduce((acc, s) => acc + s.totalTons, 0);
      result.push({
        name: isRtl ? `باقي المزارع والموردين (${others.length})` : `Other Suppliers (${others.length})`,
        code: '-',
        tons: parseFloat(otherTons.toFixed(2)),
        kg: others.reduce((acc, s) => acc + s.totalKg, 0),
        percent: parseFloat(((otherTons / sumTons) * 100).toFixed(1)),
        color: '#94a3b8',
        count: others.reduce((acc, s) => acc + s.count, 0)
      });
    }
    return result;
  }, [suppliers, totalTons, isRtl]);

  // Bar Data: Top 10 Suppliers by Tonnage
  const top10BarData = useMemo(() => {
    return suppliers.slice(0, 10).map(sup => ({
      name: sup.costCenter.length > 18 ? sup.costCenter.slice(0, 18) + '...' : sup.costCenter,
      fullName: sup.costCenter,
      tons: parseFloat(sup.totalTons.toFixed(2)),
      count: sup.count,
      percent: totalKg > 0 ? ((sup.totalKg / totalKg) * 100).toFixed(1) : '0'
    }));
  }, [suppliers, totalKg]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* 1. Header & Controls Ribbon */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black text-zinc-900 dark:text-white">
                  {isRtl ? 'لوحة تحليلات وإحصائيات الموردين والمزارع (Suppliers Dashboard)' : 'Suppliers & Farms Dashboard'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isRtl 
                    ? `إجمالي ${suppliers.length} مورد ومزرعة نشطة بإجمالي توريد ${totalTons.toFixed(2)} طن` 
                    : `Total ${suppliers.length} active suppliers and farms totaling ${totalTons.toFixed(2)} tons`}
                </p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'dashboard'
                    ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
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
                    ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>{isRtl ? 'كروت الموردين الذكية' : 'Cards Grid'}</span>
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
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
              className="px-3 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title={isRtl ? 'تصدير ملخص الموردين للإكسيل' : 'Export suppliers summary to Excel'}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRtl ? 'تصدير إكسيل' : 'Export'}</span>
            </button>
          </div>
        </div>

        {/* Search & Sort Row */}
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={isRtl ? 'بحث باسم المورد، كود مركز التكلفة، أو الصنف...' : 'Search suppliers, codes...'}
              className="w-full pl-3 pr-9 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
              <option value="count_desc">{isRtl ? 'عدد النقلات (الأكثر)' : 'Most Shipments'}</option>
              <option value="name_asc">{isRtl ? 'أبجدياً (أ - ي)' : 'Alphabetical (A-Z)'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Top Executive KPI Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Active Suppliers */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">
              {isRtl ? 'إجمالي الموردين والمزارع' : 'Active Supplying Farms'}
            </span>
            <div className="p-2 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <strong className="text-2xl font-black font-mono text-zinc-900 dark:text-white">
              {suppliers.length}
            </strong>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-1.5 ml-1.5 font-bold">
              {isRtl ? 'مورد / مزرعة' : 'farms/vendors'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>{isRtl ? `${suppliers.reduce((acc, s) => acc + s.count, 0)} نقلة مستلمة` : `${suppliers.reduce((acc, s) => acc + s.count, 0)} deliveries`}</span>
          </div>
        </div>

        {/* KPI 2: Top Dominant Supplier */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">
              {isRtl ? 'المورد الأول توريداً (#1)' : 'Top Supplier (#1)'}
            </span>
            <div className="p-2 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 rounded-xl">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-sm font-black text-zinc-900 dark:text-white truncate" title={topSupplier?.costCenter}>
              {topSupplier ? topSupplier.costCenter : '-'}
            </h4>
            <div className="flex items-baseline gap-2 mt-1">
              <strong className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                {topSupplier ? topSupplier.totalTons.toFixed(2) : '0'} <span className="text-xs font-sans">طن</span>
              </strong>
              <span className="text-xs font-mono font-bold text-zinc-400">
                ({topSupplierPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Average Volume per Supplier */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">
              {isRtl ? 'متوسط التوريد لكل مزرعة' : 'Avg Volume / Supplier'}
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 rounded-xl">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <strong className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {suppliers.length > 0 ? (totalTons / suppliers.length).toFixed(2) : '0'}
            </strong>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-1.5 ml-1.5 font-bold">
              {isRtl ? 'طن / مورد' : 'tons / vendor'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 font-bold">
            {isRtl ? `متوسط النقلة الواحدة: ${(totalTons / Math.max(1, suppliers.reduce((acc, s) => acc + s.count, 0))).toFixed(2)} طن` : 'Average intake batch'}
          </div>
        </div>

        {/* KPI 4: Logistics Fleet Dispatches */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">
              {isRtl ? 'شاحنات الأسطول المشاركة' : 'Logistics Trucks Fleet'}
            </span>
            <div className="p-2 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 rounded-xl">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <strong className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
              {uniqueTrucks}
            </strong>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-1.5 ml-1.5 font-bold">
              {isRtl ? 'شاحنة نقل مختلفة' : 'unique trucks'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 font-bold">
            {isRtl ? `إجمالي رحلات النقل: ${suppliers.reduce((acc, s) => acc + s.count, 0)} نقلة` : 'Total truck trips'}
          </div>
        </div>

      </div>

      {/* 3. Visual Charts & Pie Sections ("فطير وتشارتات متقدمة للموردين") */}
      {(viewMode === 'dashboard' || viewMode === 'cards') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Donut Pie Chart (فطيرة حصص الموردين) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-purple-500" />
                  <span>{isRtl ? 'فطيرة الحصص النسبية للموردين والمزارع' : 'Suppliers Market Share Donut'}</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {isRtl ? 'توزيع الأوزان النسبية لأعلى 7 موردين مع باقي المزارع' : 'Tonnage distribution for top suppliers vs others'}
                </p>
              </div>

              {/* Chart Sub-Tab */}
              <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <button
                  onClick={() => setChartTab('suppliersDonut')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    chartTab === 'suppliersDonut' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs' : 'text-zinc-500'
                  }`}
                >
                  {isRtl ? 'الفطيرة النسبية' : 'Donut Pie'}
                </button>
                <button
                  onClick={() => setChartTab('top10Bar')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    chartTab === 'top10Bar' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs' : 'text-zinc-500'
                  }`}
                >
                  {isRtl ? 'أعلى 10 موردين' : 'Top 10 Bar'}
                </button>
              </div>
            </div>

            {/* Chart Canvas Area */}
            <div className="py-4">
              {chartTab === 'suppliersDonut' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-7 h-64 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          formatter={(val: any, name: any) => [`${Number(val).toFixed(2)} طن`, name]}
                          contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                        />
                        <Pie
                          data={suppliersPieData}
                          dataKey="tons"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                        >
                          {suppliersPieData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{isRtl ? 'إجمالي التوريد' : 'Total'}</span>
                      <strong className="text-lg font-black font-mono text-zinc-900 dark:text-white leading-none mt-0.5">
                        {totalTons.toFixed(1)}
                      </strong>
                      <span className="text-[10px] text-zinc-500 font-sans">{isRtl ? 'طن فريش' : 'Tons'}</span>
                    </div>
                  </div>

                  {/* Interactive Legend */}
                  <div className="md:col-span-5 space-y-2">
                    {suppliersPieData.map((entry) => (
                      <div 
                        key={entry.name}
                        onClick={() => onFilterBySupplier(entry.name.includes('باقي') ? '' : entry.name)}
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

              {chartTab === 'top10Bar' && (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top10BarData} margin={{ top: 10, right: 10, left: 0, bottom: 45 }}>
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
                      <Bar dataKey="tons" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span>{isRtl ? 'اضغط على أي مورد لتصفية الجدول بالكامل به' : 'Click any supplier to filter entire table'}</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {suppliers.length} {isRtl ? 'مورد ومزرعة' : 'total suppliers'}
              </span>
            </div>
          </div>

          {/* Chart 2: Top 5 Suppliers Leaderboard (Gold/Silver/Bronze) */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>{isRtl ? 'كبار الموردين والمزارع' : 'Top Supplying Partners'}</span>
                </h3>
                <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                  {isRtl ? 'الأعلى توريداً' : 'Top Volume'}
                </span>
              </div>

              <div className="mt-4 space-y-3.5">
                {suppliers.slice(0, 5).map((sup, idx) => {
                  const share = totalKg > 0 ? ((sup.totalKg / totalKg) * 100).toFixed(1) : '0';
                  const medalColor = idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-zinc-300 text-zinc-800' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300';
                  return (
                    <div 
                      key={sup.costCenter}
                      onClick={() => onFilterBySupplier(sup.costCenter)}
                      className="p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-800 transition-all cursor-pointer group hover:shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${medalColor}`}>
                            {idx + 1}
                          </span>
                          <span className="font-black text-xs text-zinc-900 dark:text-white truncate group-hover:text-purple-600 transition-colors" title={sup.costCenter}>
                            {sup.costCenter}
                          </span>
                        </div>
                        <div className="text-left font-mono shrink-0">
                          <span className="font-black text-xs text-zinc-900 dark:text-white">{sup.totalTons.toFixed(1)} طن</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2 w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(5, parseFloat(share)))}%` }}
                        />
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400">
                        <span>{sup.count} نقلة | {sup.items.size} صنف</span>
                        <span className="font-bold font-mono text-purple-600 dark:text-purple-400">{share}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-center">
              <button
                onClick={() => setViewMode('table')}
                className="text-xs font-black text-purple-600 dark:text-purple-400 hover:underline flex items-center justify-center gap-1 w-full cursor-pointer"
              >
                <span>{isRtl ? 'عرض جدول المقارنة الشامل للموردين' : 'View full suppliers comparison table'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 4. Smart Supplier Cards Grid (Shown in Dashboard & Cards view) */}
      {(viewMode === 'dashboard' || viewMode === 'cards') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-purple-500" />
              <span>{isRtl ? `كروت الموردين الذكية (${filteredSuppliers.length} مورد)` : `Smart Supplier Cards (${filteredSuppliers.length})`}</span>
            </h3>
            {searchTerm && (
              <span className="text-xs text-zinc-400">
                {isRtl ? `مطابق لـ: "${searchTerm}"` : `Matching: "${searchTerm}"`}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((sup, idx) => {
              const percent = totalKg > 0 ? ((sup.totalKg / totalKg) * 100).toFixed(1) : '0';
              return (
                <div 
                  key={sup.costCenter}
                  className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:border-purple-400 dark:hover:border-purple-700 transition-all hover:shadow-md group"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Building2 className="w-3.5 h-3.5 text-purple-500" />
                          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                            {isRtl ? 'مركز تكلفة معتمد' : 'Cost Center'}
                          </span>
                        </div>
                        <h3 className="font-black text-sm text-zinc-900 dark:text-white leading-tight truncate group-hover:text-purple-600 transition-colors" title={sup.costCenter}>
                          {sup.costCenter}
                        </h3>
                        {sup.costCenterCode && (
                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md mt-1.5 inline-block font-bold">
                            كود: {sup.costCenterCode}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-2xs">
                          {percent}%
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400">
                          #{idx + 1}
                        </span>
                      </div>
                    </div>

                    {/* Weight Metrics */}
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-2xl">
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-medium">{isRtl ? 'إجمالي التوريد (طن)' : 'Tons'}</span>
                        <strong className="text-base font-mono font-black text-purple-600 dark:text-purple-400">
                          {sup.totalTons.toFixed(2)} <span className="text-[11px] font-sans">طن</span>
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-medium">{isRtl ? 'إجمالي التوريد (كجم)' : 'Kilograms'}</span>
                        <strong className="text-sm font-mono font-bold text-zinc-900 dark:text-white">
                          {sup.totalKg.toLocaleString()} <span className="text-[10px] font-sans text-zinc-400">كجم</span>
                        </strong>
                      </div>
                    </div>

                    {/* Quick Stats: Items & Trucks */}
                    <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Truck className="w-3 h-3 text-blue-500" />
                        <span>{sup.trucks.size} سيارة ({sup.count} نقلة)</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Activity className="w-3 h-3 text-emerald-500" />
                        <span>{sup.items.size} أصناف</span>
                      </span>
                    </div>

                    {/* Dominant Item Tag */}
                    {sup.topItem && (
                      <div className="mt-2 text-[10.5px] text-zinc-500 bg-zinc-50 dark:bg-zinc-800/80 px-2 py-1 rounded-xl truncate">
                        <span className="text-zinc-400">{isRtl ? 'الأكثر توريداً: ' : 'Top: '}</span>
                        <strong className="text-zinc-800 dark:text-zinc-200">{sup.topItem}</strong>
                      </div>
                    )}

                    {/* Progress Bar of Total */}
                    <div className="mt-2.5 w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(4, parseFloat(percent)))}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer & Action Button */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-zinc-500 font-medium truncate max-w-[170px]">
                      <span>متوسط النقلة: {sup.avgShipmentTons.toFixed(1)} طن</span>
                    </div>

                    <button
                      onClick={() => onFilterBySupplier(sup.costCenter)}
                      className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                      title={isRtl ? 'تصفية الجدول بهذا المورد' : 'Filter table by supplier'}
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
                <TableIcon className="w-4 h-4 text-purple-500" />
                <span>{isRtl ? 'الجدول التحليلي الشامل للموردين ومراكز التكلفة' : 'Comprehensive Suppliers Aggregation Table'}</span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {isRtl ? 'بيانات تفصيلية للكميات، الحصص، عدد النقلات، وأسطول النقل لكل مزرعة' : 'Detailed breakdown of tonnages, shares, shipments & fleet'}
              </p>
            </div>

            <span className="text-xs font-mono font-bold text-zinc-500">
              {filteredSuppliers.length} {isRtl ? 'مورد مسجل' : 'suppliers'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-black border-b border-zinc-200 dark:border-zinc-700">
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4">{isRtl ? 'المورد / مركز التكلفة' : 'Supplier Name'}</th>
                  <th className="py-3 px-4">{isRtl ? 'كود المركز' : 'Code'}</th>
                  <th className="py-3 px-4">{isRtl ? 'إجمالي الكمية (كجم)' : 'Total KG'}</th>
                  <th className="py-3 px-4">{isRtl ? 'إجمالي الكمية (طن)' : 'Total Tons'}</th>
                  <th className="py-3 px-4">{isRtl ? 'النسبة المئوية' : '% Share'}</th>
                  <th className="py-3 px-4">{isRtl ? 'النقلات' : 'Shipments'}</th>
                  <th className="py-3 px-4">{isRtl ? 'متوسط النقلة' : 'Avg / Trip'}</th>
                  <th className="py-3 px-4">{isRtl ? 'أبرز الأصناف' : 'Top Item'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredSuppliers.map((sup, idx) => {
                  const percent = totalKg > 0 ? ((sup.totalKg / totalKg) * 100).toFixed(2) : '0';
                  return (
                    <tr key={sup.costCenter} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono text-zinc-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-black text-zinc-900 dark:text-white">
                        {sup.costCenter}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-500">
                        {sup.costCenterCode || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-white">
                        {sup.totalKg.toLocaleString()} كجم
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-purple-600 dark:text-purple-400 text-sm">
                        {sup.totalTons.toFixed(3)} طن
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(3, parseFloat(percent)))}%` }}
                            />
                          </div>
                          <span className="font-mono font-black text-zinc-800 dark:text-zinc-200">{percent}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-600 dark:text-zinc-400">
                        {sup.count}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-500">
                        {sup.avgShipmentTons.toFixed(2)} طن
                      </td>
                      <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300 text-[11px] font-bold truncate max-w-[150px]">
                        {sup.topItem || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onFilterBySupplier(sup.costCenter)}
                          className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 transition-colors cursor-pointer"
                          title={isRtl ? 'تصفية الجدول بهذا المورد' : 'Filter by supplier'}
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

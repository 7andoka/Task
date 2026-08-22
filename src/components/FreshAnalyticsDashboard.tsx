import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  Calendar,
  Truck,
  Container,
  Building2,
  Boxes,
  Sparkles,
  ArrowUpRight,
  Filter
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
  CartesianGrid,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { FreshItemSummaryData } from './FreshItemsDashboard';
import { FreshSupplierSummaryData } from './FreshSuppliersDashboard';

interface FreshAnalyticsDashboardProps {
  items: FreshItemSummaryData[];
  suppliers: FreshSupplierSummaryData[];
  dailyData: Array<{ date: string; kg: number; tons: number }>;
  records?: Array<any>;
  totalKg: number;
  totalTons: number;
  barrelTons: number;
  tankTons: number;
  uniqueTrucks: number;
  uniqueDrivers: number;
  isRtl: boolean;
  onFilterByItem: (itemName: string) => void;
  onFilterBySupplier: (supplierName: string) => void;
}

const PALETTE = ['#10b981', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#f97316'];

export const FreshAnalyticsDashboard: React.FC<FreshAnalyticsDashboardProps> = ({
  items,
  suppliers,
  dailyData,
  records = [],
  totalKg,
  totalTons,
  barrelTons,
  tankTons,
  uniqueTrucks,
  uniqueDrivers,
  isRtl,
  onFilterByItem,
  onFilterBySupplier
}) => {
  const [activeChartGroup, setActiveChartGroup] = useState<'all' | 'volume' | 'timeline' | 'storage'>('all');
  const [timelineMode, setTimelineMode] = useState<'all' | 'item' | 'supplier'>('all');
  const [timelineSelectedValue, setTimelineSelectedValue] = useState<string>('ALL');

  // Computed timeline data based on selected item or supplier
  const computedDailyData = useMemo(() => {
    if (!records || records.length === 0 || timelineMode === 'all' || timelineSelectedValue === 'ALL') {
      return dailyData;
    }
    const map = new Map<string, number>();
    records.forEach((r: any) => {
      if (timelineMode === 'item' && r.itemName !== timelineSelectedValue) return;
      if (timelineMode === 'supplier' && r.costCenter !== timelineSelectedValue) return;
      const key = r.date || 'بدون تاريخ';
      map.set(key, (map.get(key) || 0) + (r.quantityKg || 0));
    });
    return Array.from(map.entries())
      .map(([date, kg]) => ({
        date,
        kg,
        tons: parseFloat((kg / 1000).toFixed(2))
      }));
  }, [records, dailyData, timelineMode, timelineSelectedValue]);

  // Variety distribution
  const varietyData = useMemo(() => {
    const map = new Map<string, { name: string; tons: number; color: string; count: number }>();
    items.forEach(item => {
      const v = item.variety;
      if (!map.has(v)) {
        map.set(v, {
          name: item.varietyName,
          tons: 0,
          color: item.varietyColor,
          count: 0
        });
      }
      const entry = map.get(v)!;
      entry.tons += item.totalTons;
      entry.count += item.count;
    });

    return Array.from(map.values())
      .map(entry => ({
        ...entry,
        tons: parseFloat(entry.tons.toFixed(2)),
        percent: totalTons > 0 ? parseFloat(((entry.tons / totalTons) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.tons - a.tons);
  }, [items, totalTons]);

  // Storage comparison data
  const storageData = useMemo(() => [
    { name: isRtl ? 'براميل (Barrels)' : 'Barrels', tons: parseFloat(barrelTons.toFixed(2)), color: '#06b6d4' },
    { name: isRtl ? 'تانكات (Tanks)' : 'Tanks', tons: parseFloat(tankTons.toFixed(2)), color: '#10b981' }
  ], [barrelTons, tankTons, isRtl]);

  // Top 8 Items for Bar
  const top8Items = useMemo(() => {
    return items.slice(0, 8).map(i => ({
      name: i.itemName.length > 15 ? i.itemName.slice(0, 15) + '...' : i.itemName,
      fullName: i.itemName,
      tons: parseFloat(i.totalTons.toFixed(2)),
      count: i.count
    }));
  }, [items]);

  // Top 8 Suppliers for Bar
  const top8Suppliers = useMemo(() => {
    return suppliers.slice(0, 8).map(s => ({
      name: s.costCenter.length > 15 ? s.costCenter.slice(0, 15) + '...' : s.costCenter,
      fullName: s.costCenter,
      tons: parseFloat(s.totalTons.toFixed(2)),
      count: s.count
    }));
  }, [suppliers]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* 1. Header Ribbon */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-zinc-900 dark:text-white">
                {isRtl ? 'لوحة التحليلات والرسوم البيانية الشاملة' : 'Executive Visual Analytics'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isRtl ? 'مخططات بيانية تفاعلية لحصص الأصناف، الموردين، المسار الزمني والتخزين' : 'Comprehensive interactive visual charts & trends'}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Switcher */}
        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setActiveChartGroup('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeChartGroup === 'all' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-zinc-500'
            }`}
          >
            {isRtl ? 'جميع الرسوم' : 'All Charts'}
          </button>
          <button
            onClick={() => setActiveChartGroup('volume')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeChartGroup === 'volume' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-zinc-500'
            }`}
          >
            {isRtl ? 'الأحجام والحصص' : 'Volumes & Shares'}
          </button>
          <button
            onClick={() => setActiveChartGroup('timeline')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeChartGroup === 'timeline' ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs' : 'text-zinc-500'
            }`}
          >
            {isRtl ? 'المسار الزمني' : 'Timeline'}
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[11px] font-bold text-zinc-400 block">{isRtl ? 'إجمالي الكمية المستلمة' : 'Total Intake'}</span>
          <strong className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
            {totalTons.toFixed(2)} <span className="text-xs font-sans">طن</span>
          </strong>
          <span className="text-[10px] text-zinc-500 font-mono font-bold mt-1 block">
            {totalKg.toLocaleString()} كجم
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[11px] font-bold text-zinc-400 block">{isRtl ? 'الأصناف والمزارع' : 'Items & Farms'}</span>
          <strong className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1 block">
            {items.length} <span className="text-xs font-sans text-zinc-400">صنف / {suppliers.length} مورد</span>
          </strong>
          <span className="text-[10px] text-zinc-500 font-bold mt-1 block">
            {varietyData.length} {isRtl ? 'أنواع زيتون معتمدة' : 'varieties'}
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[11px] font-bold text-zinc-400 block">{isRtl ? 'أسطول النقل والشاحنات' : 'Fleet & Drivers'}</span>
          <strong className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1 block">
            {uniqueTrucks} <span className="text-xs font-sans text-zinc-400">سيارة</span>
          </strong>
          <span className="text-[10px] text-zinc-500 font-bold mt-1 block">
            {uniqueDrivers} {isRtl ? 'سائق مشارك' : 'drivers'}
          </span>
        </div>
      </div>

      {/* 3. Main Chart Row: Two Big Visual Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Supply by Item Bar Chart */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <span>{isRtl ? 'كميات التوريد حسب الصنف (بالطن)' : 'Supply by Item (Tons)'}</span>
              </h3>
              <p className="text-xs text-zinc-400">{isRtl ? 'مقارنة أوزان أعلى 8 أصناف موردة' : 'Top 8 items comparison'}</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
              {items.length} {isRtl ? 'صنف' : 'items'}
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top8Items} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
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
                <Bar dataKey="tons" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Supply by Supplier Bar Chart */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-500" />
                <span>{isRtl ? 'كميات التوريد حسب المورد / المزرعة (بالطن)' : 'Supply by Supplier (Tons)'}</span>
              </h3>
              <p className="text-xs text-zinc-400">{isRtl ? 'توزيع التوريد على أعلى 8 مراكز تكلفة ومزارع' : 'Top 8 suppliers comparison'}</p>
            </div>
            <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-full">
              {suppliers.length} {isRtl ? 'مورد' : 'vendors'}
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top8Suppliers} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
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
                <Bar dataKey="tons" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 4. Timeline Intake Area Chart with Item/Supplier selector */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-500" />
              <span>{isRtl ? 'المسار الزمني لحركة التوريد اليومية (بالطن)' : 'Daily Intake Timeline (Tons)'}</span>
            </h3>
            <p className="text-xs text-zinc-400">{isRtl ? 'تطور تدفق التوريدات واستلام الفريش على مدار الأيام مع إمكانية التصفية' : 'Timeline progression with item/supplier selector'}</p>
          </div>

          {/* Timeline Selector Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <button
                onClick={() => { setTimelineMode('all'); setTimelineSelectedValue('ALL'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timelineMode === 'all' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {isRtl ? 'الكل' : 'All'}
              </button>
              <button
                onClick={() => { setTimelineMode('item'); setTimelineSelectedValue(items[0]?.itemName || 'ALL'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timelineMode === 'item' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {isRtl ? 'حسب الصنف' : 'By Item'}
              </button>
              <button
                onClick={() => { setTimelineMode('supplier'); setTimelineSelectedValue(suppliers[0]?.costCenter || 'ALL'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timelineMode === 'supplier' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {isRtl ? 'حسب المورد' : 'By Supplier'}
              </button>
            </div>

            {timelineMode === 'item' && (
              <select
                value={timelineSelectedValue}
                onChange={(e) => setTimelineSelectedValue(e.target.value)}
                className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {items.map(i => (
                  <option key={i.itemName} value={i.itemName}>{i.itemName}</option>
                ))}
              </select>
            )}

            {timelineMode === 'supplier' && (
              <select
                value={timelineSelectedValue}
                onChange={(e) => setTimelineSelectedValue(e.target.value)}
                className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {suppliers.map(s => (
                  <option key={s.costCenter} value={s.costCenter}>{s.costCenter}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={computedDailyData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="colorDailyTons" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip 
                formatter={(val: any) => [`${Number(val).toFixed(2)} طن`, 'الكمية اليومية']}
                contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
              />
              <Area type="monotone" dataKey="tons" stroke="#0f766e" strokeWidth={3} fillOpacity={1} fill="url(#colorDailyTons)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Variety Donut */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 max-w-xl mx-auto w-full">
        <h3 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-amber-500" />
          <span>{isRtl ? 'توزيع الأصناف حسب نوع الزيتون' : 'Intake by Variety'}</span>
        </h3>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                formatter={(val: any, name: any) => [`${Number(val).toFixed(2)} طن`, name]}
                contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
              />
              <Pie
                data={varietyData}
                dataKey="tons"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
              >
                {varietyData.map((entry, idx) => (
                  <Cell key={`var-cell-${idx}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {varietyData.map(v => (
            <div key={v.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{v.name}</span>
              </div>
              <span className="font-mono font-bold text-zinc-600 dark:text-zinc-400">{v.percent}%</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

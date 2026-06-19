import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  Truck, 
  Zap,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { translations } from '../i18n';
import { Language, Task, UserProfile } from '../types';
import { getTaskInsights } from '../services/geminiService';

interface DashboardProps {
  lang: Language;
  user: UserProfile;
  tasks: Task[];
}

export default function Dashboard({ lang, user, tasks }: DashboardProps) {
  const t = translations[lang];
  const [aiInsight, setAiInsight] = React.useState<string | null>(null);
  const [loadingAi, setLoadingAi] = React.useState(false);

  const stats = {
    completed: tasks.filter(t => t.status === 'Completed').length,
    delayed: tasks.filter(t => t.status === 'Delayed').length,
    pendingReview: tasks.filter(t => t.status === 'Pending Review').length,
    pending: tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length,
    efficiency: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100) : 0
  };

  const chartData = [
    { name: t.completed, value: stats.completed, color: '#10b981' }, // emerald-500
    { name: t.delayed, value: stats.delayed, color: '#ef4444' }, // red-500
    { name: t.pendingReview, value: stats.pendingReview, color: '#a855f7' }, // purple-500
    { name: t.pending, value: stats.pending, color: '#f59e0b' }, // amber-500
  ];

  const pieData = chartData.filter(d => d.value > 0);

  const warehouseKPIs = [
    { label: t.pickingProductivity, value: "124 units/hr", trend: "+5%", isPositive: true, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: t.packingProductivity, value: "89 units/hr", trend: "+2%", isPositive: true, icon: Zap, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: t.laborUtilization, value: "92%", trend: "-1%", isPositive: false, icon: Truck, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  const urgentTasks = tasks
    .filter(t => t.priority === 'Urgent' && t.status !== 'Completed' && t.status !== 'Cancelled')
    .slice(0, 3);

  const fetchAiInsights = async () => {
    setLoadingAi(true);
    const insight = await getTaskInsights(tasks, user, lang);
    setAiInsight(insight || null);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-950 dark:text-zinc-50">
            {lang === 'ar' ? `مرحباً بك، ${user.displayName}` : `Welcome back, ${user.displayName}`}
          </h2>
          <p className="text-zinc-950 dark:text-zinc-300 font-black mt-1">
            {lang === 'ar' ? 'إليك نظرة عامة على أداء فريقك اليوم' : 'Here is an overview of your team\'s performance today'}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t.taskCompletionRate, value: `${stats.efficiency}%`, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", trend: "+12%" },
          { label: t.delayedTasks, value: stats.delayed, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", trend: stats.delayed > 0 ? "+2" : "0" },
          { label: t.pendingReview, value: stats.pendingReview, icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10", trend: "-1" },
          { label: t.efficiency, value: "94%", icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10", trend: "+3%" },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", card.bg)}>
                <card.icon className={card.color} size={24} />
              </div>
              <span className={cn(
                "text-xs font-black px-2 py-1 rounded-full",
                card.trend.startsWith('+') && card.label !== t.delayedTasks ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10" : 
                card.trend.startsWith('+') && card.label === t.delayedTasks ? "text-red-700 bg-red-50 dark:bg-red-500/10" :
                "text-zinc-950 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200"
              )}>
                {card.trend}
              </span>
            </div>
            <p className="text-sm text-zinc-950 dark:text-zinc-200 font-black">{card.label}</p>
            <h3 className="text-3xl font-black mt-1 text-zinc-950 dark:text-white">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Status Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-zinc-950 dark:text-white">{t.teamOverview}</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-bg-opacity)' }}
                  cursor={{ fill: '#88888810' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights & Urgent Tasks */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={20} className="text-emerald-100" />
                <h3 className="text-lg font-bold">{t.aiInsights}</h3>
              </div>
              {aiInsight ? (
                <div className="text-sm leading-relaxed opacity-95 whitespace-pre-wrap font-medium">
                  {aiInsight}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm opacity-90 leading-relaxed">
                    {lang === 'ar' ? 'احصل على تحليل ذكي لمهام فريقك وتوقعات التأخير بناءً على البيانات الحالية.' : 'Get smart analysis of your team tasks and delay predictions based on current data.'}
                  </p>
                  <button 
                    onClick={fetchAiInsights}
                    disabled={loadingAi}
                    className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {loadingAi ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {lang === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}
                      </>
                    ) : (
                      t.predictDelays
                    )}
                  </button>
                </div>
              )}
            </div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-lg font-black text-zinc-950 dark:text-white mb-4">
              {lang === 'ar' ? 'مهام عاجلة' : 'Urgent Tasks'}
            </h3>
            {urgentTasks.length > 0 ? (
              <div className="space-y-3">
                {urgentTasks.map(task => (
                  <div key={task.id} className="p-3 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-start gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-xl shrink-0 text-red-600 dark:text-red-400">
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-zinc-950 dark:text-zinc-100 line-clamp-1">{task.title}</h4>
                      <p className="text-xs text-red-700 dark:text-red-400 mt-1 font-bold">
                        {new Date(task.deadline).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-700">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm text-zinc-950 dark:text-zinc-200 font-black">
                  {lang === 'ar' ? 'لا توجد مهام عاجلة حالياً' : 'No urgent tasks currently'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warehouse KPIs */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h3 className="text-lg font-black text-zinc-950 dark:text-white mb-6">{t.warehouseKPIs}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {warehouseKPIs.map((kpi, i) => (
            <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl shadow-sm", kpi.bg, kpi.color)}>
                  <kpi.icon size={24} />
                </div>
                <div>
                  <p className="text-sm text-zinc-950 dark:text-zinc-200 font-black mb-1">{kpi.label}</p>
                  <p className="text-xl font-black text-zinc-950 dark:text-white">{kpi.value}</p>
                </div>
              </div>
              <div className={cn(
                "flex items-center gap-1 text-sm font-black",
                kpi.isPositive ? "text-emerald-700" : "text-amber-700"
              )}>
                {kpi.isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {kpi.trend}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

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
  Sparkles
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
  Cell 
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
    { name: t.completed, value: stats.completed, color: '#10b981' },
    { name: t.delayed, value: stats.delayed, color: '#ef4444' },
    { name: t.pendingReview, value: stats.pendingReview, color: '#a855f7' },
    { name: t.pending, value: stats.pending, color: '#f59e0b' },
  ];

  const warehouseKPIs = [
    { label: t.pickingProductivity, value: "124 units/hr", icon: Package, color: "text-blue-500" },
    { label: t.packingProductivity, value: "89 units/hr", icon: Zap, color: "text-emerald-500" },
    { label: t.laborUtilization, value: "92%", icon: Truck, color: "text-amber-500" },
  ];

  const fetchAiInsights = async () => {
    setLoadingAi(true);
    const insight = await getTaskInsights(tasks, user, lang);
    setAiInsight(insight || null);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: t.taskCompletionRate, value: `${stats.efficiency}%`, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: t.delayedTasks, value: stats.delayed, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
          { label: t.productivityScore, value: "8.4/10", icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: t.efficiency, value: "94%", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-3 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shadow-sm"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", card.bg)}>
              <card.icon className={card.color} size={24} />
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{card.label}</p>
            <h3 className="text-2xl font-bold mt-1">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Task Status Chart */}
        <div className="lg:col-span-2 p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shadow-sm">
          <h3 className="text-lg font-bold mb-4">{t.teamOverview}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#88888810' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} />
              <h3 className="text-lg font-bold">{t.aiInsights}</h3>
            </div>
            {aiInsight ? (
              <div className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap">
                {aiInsight}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm opacity-80">
                  {lang === 'ar' ? 'احصل على تحليل ذكي لمهام فريقك وتوقعات التأخير.' : 'Get smart analysis of your team tasks and delay predictions.'}
                </p>
                <button 
                  onClick={fetchAiInsights}
                  disabled={loadingAi}
                  className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-semibold transition-all"
                >
                  {loadingAi ? (lang === 'ar' ? 'جاري التحليل...' : 'Analyzing...') : t.predictDelays}
                </button>
              </div>
            )}
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        </div>
      </div>

      {/* Warehouse KPIs */}
      <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shadow-sm">
        <h3 className="text-lg font-bold mb-4">{t.warehouseKPIs}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {warehouseKPIs.map((kpi, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-transparent">
              <div className={cn("p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 shadow-sm", kpi.color)}>
                <kpi.icon size={20} />
              </div>
              <div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">{kpi.label}</p>
                <p className="text-lg font-bold">{kpi.value}</p>
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

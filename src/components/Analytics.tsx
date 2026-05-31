import React from 'react';
import { motion } from 'motion/react';
import { 
  Download, 
  FileText, 
  Table, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  BarChart2,
  PieChart as PieChartIcon
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
  Line,
  Legend
} from 'recharts';
import { translations } from '../i18n';
import { Language, Task, UserProfile } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface AnalyticsProps {
  lang: Language;
  user: UserProfile;
  tasks: Task[];
  users: UserProfile[];
}

export default function Analytics({ lang, user, tasks, users }: AnalyticsProps) {
  const t = translations[lang];
  const isRtl = lang === 'ar';

  const taskStatsByAssignee = users.map(u => {
    const userTasks = tasks.filter(t => t.assigneeId === u.uid);
    const completed = userTasks.filter(t => t.status === 'Completed').length;
    const total = userTasks.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { name: u.displayName, rate, total, completed };
  }).filter(u => u.total > 0);

  const priorityData = [
    { name: t.low, value: tasks.filter(t => t.priority === 'Low').length, color: '#71717a' },
    { name: t.medium, value: tasks.filter(t => t.priority === 'Medium').length, color: '#3b82f6' },
    { name: t.high, value: tasks.filter(t => t.priority === 'High').length, color: '#f97316' },
    { name: t.urgent, value: tasks.filter(t => t.priority === 'Urgent').length, color: '#ef4444' },
  ];

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFont(isRtl ? "Amiri" : "helvetica");
    doc.text(t.analytics, 10, 10);
    
    const tableData = tasks.map(t => [
      t.title,
      t.status,
      t.priority,
      new Date(t.deadline).toLocaleDateString(),
      `${t.progress}%`
    ]);

    (doc as any).autoTable({
      head: [[t.title, t.status, t.priority, t.deadline, t.progress]],
      body: tableData,
      startY: 20,
    });

    doc.save('ETA_Report.pdf');
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(tasks.map(t => ({
      Title: t.title,
      Status: t.status,
      Priority: t.priority,
      Deadline: t.deadline,
      Progress: t.progress,
      Assignee: users.find(u => u.uid === t.assigneeId)?.displayName || t.assigneeId
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "ETA_Report.xlsx");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">{t.analytics}</h3>
        <div className="flex gap-4">
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
          >
            <FileText size={18} />
            <span>PDF</span>
          </button>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Completion Rate by Employee */}
        <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-800/10 dark:border-zinc-100/10 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="text-emerald-500" size={20} />
            <h4 className="text-lg font-bold">{t.taskCompletionRate}</h4>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskStatsByAssignee} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={100}
                  tick={{ fill: '#888888', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="rate" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-800/10 dark:border-zinc-100/10 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="text-blue-500" size={20} />
            <h4 className="text-lg font-bold">{t.priority}</h4>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-800/10 dark:border-zinc-100/10 shadow-sm overflow-x-auto">
        <h4 className="text-lg font-bold mb-6">{t.personalTasks}</h4>
        <table className="w-full text-left rtl:text-right">
          <thead>
            <tr className="border-b border-zinc-800/10 dark:border-zinc-100/10 text-zinc-500 text-sm">
              <th className="pb-4 font-semibold">{t.title}</th>
              <th className="pb-4 font-semibold">{t.assignee}</th>
              <th className="pb-4 font-semibold">{t.status}</th>
              <th className="pb-4 font-semibold">{t.deadline}</th>
              <th className="pb-4 font-semibold">{t.progress}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/5 dark:divide-zinc-100/5">
            {tasks.slice(0, 10).map(task => (
              <tr key={task.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="py-4 font-medium">{task.title}</td>
                <td className="py-4 text-sm text-zinc-500">
                  {users.find(u => u.uid === task.assigneeId)?.displayName || task.assigneeId}
                </td>
                <td className="py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold",
                    task.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  )}>
                    {t[task.status.charAt(0).toLowerCase() + task.status.slice(1).replace(' ', '') as keyof typeof t] || task.status}
                  </span>
                </td>
                <td className="py-4 text-sm text-zinc-500">{new Date(task.deadline).toLocaleDateString()}</td>
                <td className="py-4">
                  <div className="w-24 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${task.progress}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

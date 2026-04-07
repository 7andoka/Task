import React from 'react';
import { Package, Truck, History, Search, Filter, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Language, UserProfile } from '../types';
import { translations } from '../i18n';

interface RawMaterialProps {
  lang: Language;
  user: UserProfile;
}

export default function RawMaterial({ lang, user }: RawMaterialProps) {
  const t = translations[lang];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Package className="text-emerald-500" />
            {t.rawMaterial}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            {lang === 'ar' ? 'متابعة توريد الخام بالبراميل' : 'Track raw material supply in barrels'}
          </p>
        </div>

        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20">
          <Plus size={20} />
          {lang === 'ar' ? 'تسجيل توريد جديد' : 'Register New Supply'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{lang === 'ar' ? 'إجمالي البراميل' : 'Total Barrels'}</h3>
          <p className="text-2xl font-black text-emerald-500">0</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{lang === 'ar' ? 'براميل فارغة' : 'Empty Barrels'}</h3>
          <p className="text-2xl font-black text-zinc-500">0</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{lang === 'ar' ? 'براميل ممتلئة' : 'Full Barrels'}</h3>
          <p className="text-2xl font-black text-blue-500">0</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{lang === 'ar' ? 'تحت الفحص' : 'Under Inspection'}</h3>
          <p className="text-2xl font-black text-orange-500">0</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <h3 className="font-bold text-zinc-900 dark:text-white">{lang === 'ar' ? 'سجل التوريدات' : 'Supply Logs'}</h3>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <Search size={18} className="text-zinc-500" />
            </button>
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <Filter size={18} className="text-zinc-500" />
            </button>
          </div>
        </div>
        <div className="p-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">{lang === 'ar' ? 'لا توجد بيانات متاحة حالياً' : 'No data available currently'}</p>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Snowflake, Calculator, TrendingUp, History, Search, Filter, Plus } from 'lucide-react';
import { Language, UserProfile } from '../types';
import { translations } from '../i18n';

interface ColdStorageProps {
  lang: Language;
  user: UserProfile;
}

export default function ColdStorage({ lang, user }: ColdStorageProps) {
  const t = translations[lang];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Snowflake className="text-blue-500" />
            {t.coldStorage}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            {lang === 'ar' ? 'إدارة حسابات ومخزون الثلاجات' : 'Manage cold storage accounts and inventory'}
          </p>
        </div>

        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20">
          <Plus size={20} />
          {lang === 'ar' ? 'إضافة عملية جديدة' : 'Add New Operation'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Calculator className="text-blue-500" size={20} />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white">{lang === 'ar' ? 'إجمالي المخزون' : 'Total Inventory'}</h3>
          </div>
          <p className="text-3xl font-black text-blue-500">0 <span className="text-sm font-normal text-zinc-500">طن</span></p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="text-emerald-500" size={20} />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white">{lang === 'ar' ? 'الوارد اليوم' : 'Inbound Today'}</h3>
          </div>
          <p className="text-3xl font-black text-emerald-500">0 <span className="text-sm font-normal text-zinc-500">طن</span></p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <History className="text-orange-500" size={20} />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white">{lang === 'ar' ? 'المنصرف اليوم' : 'Outbound Today'}</h3>
          </div>
          <p className="text-3xl font-black text-orange-500">0 <span className="text-sm font-normal text-zinc-500">طن</span></p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <h3 className="font-bold text-zinc-900 dark:text-white">{lang === 'ar' ? 'آخر العمليات' : 'Recent Operations'}</h3>
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

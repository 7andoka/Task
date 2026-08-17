import React from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineScreen({ lang }: { lang: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white p-6 text-center">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl mb-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <WifiOff size={48} className="text-red-500 animate-pulse" />
      </div>
      <h1 className="text-2xl font-bold mb-2">
        {lang === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No Internet Connection'}
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">
        {lang === 'ar' 
          ? 'جاري محاولة استعادة الاتصال تلقائياً...' 
          : 'Attempting to reconnect automatically...'}
      </p>
    </div>
  );
}

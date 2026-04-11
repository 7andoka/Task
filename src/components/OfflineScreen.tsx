import React from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineScreen({ lang }: { lang: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center">
      <div className="bg-zinc-900 p-6 rounded-3xl mb-6">
        <WifiOff size={48} className="text-red-500 animate-pulse" />
      </div>
      <h1 className="text-2xl font-bold mb-2">
        {lang === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No Internet Connection'}
      </h1>
      <p className="text-zinc-400 max-w-sm">
        {lang === 'ar' 
          ? 'جاري محاولة استعادة الاتصال تلقائياً...' 
          : 'Attempting to reconnect automatically...'}
      </p>
    </div>
  );
}

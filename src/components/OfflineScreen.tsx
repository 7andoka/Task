import React from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineScreen({ lang }: { lang: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center">
      <div className="bg-zinc-900 p-6 rounded-3xl mb-6">
        <WifiOff size={48} className="text-red-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">
        {lang === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No Internet Connection'}
      </h1>
      <p className="text-zinc-400 max-w-sm">
        {lang === 'ar' 
          ? 'يرجى التحقق من اتصالك بالشبكة وإعادة المحاولة.' 
          : 'Please check your network connection and try again.'}
      </p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-8 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold transition-colors"
      >
        {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
      </button>
    </div>
  );
}

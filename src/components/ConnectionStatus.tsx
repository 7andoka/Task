import React, { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wifi, WifiOff } from 'lucide-react';
import { triggerAlert } from '../lib/notifications';

export default function ConnectionStatus({ username }: { username?: string }) {
  const [isConnected, setIsConnected] = useState(navigator.onLine);
  const prevConnectedRef = useRef(navigator.onLine);

  useEffect(() => {
    // Check if connection status changed
    if (isConnected !== prevConnectedRef.current) {
      triggerAlert(
        isConnected ? "تم الاتصال" : "انقطع الاتصال",
        isConnected ? "تم استعادة الاتصال بالإنترنت" : "فقدت الاتصال بالإنترنت، يرجى التحقق من الشبكة"
      );
      prevConnectedRef.current = isConnected;
    }
  }, [isConnected]);

  useEffect(() => {
    // Basic online/offline listeners
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Try to listen to Firestore connection state if possible
    // We use a dummy doc to check if we can reach the server
    const unsub = onSnapshot(doc(db, 'test', 'connection'), { includeMetadataChanges: true }, (snapshot) => {
      // If we get a snapshot and it's not from cache, we are definitely connected
      // If it's from cache, we might be offline or just haven't synced yet
      if (!snapshot.metadata.fromCache) {
        setIsConnected(true);
      }
    }, (err) => {
      console.warn("Firestore connection check error:", err);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
    };
  }, []);

  return (
    <div 
      title={isConnected ? 'Connected' : 'Disconnected'}
      className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
    >
      <div className="flex items-center gap-1.5 self-start">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <span className="text-[9px] font-bold uppercase text-zinc-600 dark:text-zinc-400">
          {isConnected ? 'Online' : 'Offline'}
        </span>
      </div>
      {username && (
         <span className="text-[8px] text-zinc-500 dark:text-zinc-500 font-medium">
           {username}
         </span>
      )}
    </div>
  );
}

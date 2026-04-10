import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(navigator.onLine);

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
      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
    >
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <span className="text-[9px] font-bold uppercase text-zinc-600 dark:text-zinc-400">
        {isConnected ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}

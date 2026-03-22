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
      className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}
    >
      {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
    </div>
  );
}

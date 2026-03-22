import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connectedRef = ref(rtdb, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      setIsConnected(snapshot.val() === true);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
      {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase';

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
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
        {isConnected ? 'متصل' : 'غير متصل'}
      </span>
    </div>
  );
}

import { useEffect, useState } from 'react';

export default function OfflineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return <span className={`connection-status connection-status--${online ? 'online' : 'offline'}`} role="status"><span className="connection-status__dot" aria-hidden="true" />{online ? 'Live feed' : 'Offline shell · saved state stays on this device'}</span>;
}

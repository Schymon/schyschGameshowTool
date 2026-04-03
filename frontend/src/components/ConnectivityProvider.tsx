'use client';

import { useEffect, useState } from 'react';

interface HealthCheck {
  status: string;
  timestamp: string;
  database: { status: string; latency?: number; error?: string };
  environment: { nodeEnv: string; port: number };
}

interface ConnectivityState {
  backend: 'checking' | 'ok' | 'error';
  database: 'checking' | 'ok' | 'error';
  backendUrl: string;
  error?: string;
}

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [connectivity, setConnectivity] = useState<ConnectivityState>({
    backend: 'checking',
    database: 'checking',
    backendUrl: '',
  });

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    setConnectivity(prev => ({ ...prev, backendUrl: apiUrl }));

    fetch(`${apiUrl}/api/health`)
      .then((res) => res.json() as Promise<HealthCheck>)
      .then((data) => {
        console.log('[Frontend] Health check response:', data);
        setConnectivity({
          backend: data.status === 'ok' ? 'ok' : 'error',
          database: data.database.status === 'connected' ? 'ok' : 'error',
          backendUrl: apiUrl,
          error: data.database.error,
        });
      })
      .catch((err) => {
        console.error('[Frontend] Health check failed:', err);
        setConnectivity({
          backend: 'error',
          database: 'error',
          backendUrl: apiUrl,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });
  }, []);

  return (
    <>
      {connectivity.backend === 'error' && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-2 z-50 text-center">
          <strong>Backend nicht erreichbar:</strong> {connectivity.error || 'Verbindung fehlgeschlagen'}
          <br />
          <small>URL: {connectivity.backendUrl}</small>
        </div>
      )}
      {connectivity.database === 'error' && connectivity.backend === 'ok' && (
        <div className="fixed top-12 left-0 right-0 bg-orange-500 text-white p-2 z-50 text-center">
          <strong>Datenbank nicht erreichbar:</strong> {connectivity.error}
        </div>
      )}
      {children}
    </>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, Home } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push('/lobby')}>
            <Home className="h-4 w-4" />
            Home
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
          <Button variant="ghost" size="icon" disabled title="Settings coming soon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
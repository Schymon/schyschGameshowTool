'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';

interface Token {
  id: string;
  token: string;
  used: boolean;
  usedBy: string | null;
  createdAt: string;
}

export default function TokensPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tokens, setTokens] = useState<Token[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      router.push('/lobby');
      return;
    }
    loadTokens();
  }, [user, router]);

  const loadTokens = async () => {
    try {
      const data = await api.get<Token[]>('/api/admin/tokens');
      setTokens(data);
    } catch (error) {
      console.error('Failed to load tokens', error);
    }
  };

  const handleCreateToken = async () => {
    try {
      await api.post('/api/admin/tokens', {});
      loadTokens();
    } catch (error) {
      console.error('Failed to create token', error);
    }
  };

  const handleDeleteToken = async (id: string) => {
    try {
      await api.delete(`/api/admin/tokens/${id}`);
      loadTokens();
    } catch (error) {
      console.error('Failed to delete token', error);
    }
  };

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
              <p className="text-muted-foreground">Manage registration tokens</p>
            </div>
          </div>

        <div className="mb-6">
          <Button onClick={handleCreateToken} className="h-10">
            Create New Token
          </Button>
        </div>

        <div className="grid gap-4">
          {tokens.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-8 text-center text-muted-foreground">
                No tokens found. Create one to get started.
              </CardContent>
            </Card>
          ) : (
            tokens.map((token) => (
              <Card key={token.id} className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <code className="text-sm bg-muted px-3 py-1.5 rounded-md font-mono">{token.token}</code>
                    <div className="flex gap-2 items-center">
                      <Badge variant={token.used ? 'secondary' : 'default'}>
                        {token.used ? 'Used' : 'Available'}
                      </Badge>
                      {!token.used && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteToken(token.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                {token.used && token.usedBy && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Used by user ID: {token.usedBy}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
    </>
  );
}
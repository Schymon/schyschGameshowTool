'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { Game, Player, QuizData } from '@/types';
import { api } from '@/lib/api';

export default function LobbyPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [gameType, setGameType] = useState<'buzzer' | 'matrix'>('buzzer');
  const [quizFile, setQuizFile] = useState<File | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const socket = getSocket();
    socket.emit('lobby:games');
    socket.emit('user:identify', { id: user.id, username: user.username });

    socket.on('lobby:games:list', (gameList: Game[]) => {
      setGames(gameList);
    });

    socket.on('game:players:update', ({ gameId, players }: { gameId: string; players: Player[] }) => {
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, players } : g));
    });

    socket.on('game:created', ({ gameId }: { gameId: string }) => {
      router.push(`/game/${gameId}`);
    });

    loadQuizzes();

    return () => {
      socket.off('lobby:games:list');
      socket.off('game:created');
    };
  }, [user, router]);

  const loadQuizzes = async () => {
    try {
      const data = await api.get<any[]>('/api/quizzes');
      setQuizzes(data);
    } catch (error) {
      console.error('Failed to load quizzes', error);
    }
  };

  const handleCreateGame = () => {
    const socket = getSocket();
    socket.emit('game:create', {
      type: gameType,
      quizId: selectedQuizId || undefined,
      quizData: quizData || undefined,
    });
    setIsCreateDialogOpen(false);
  };

  const handleJoinGame = (gameId: string) => {
    router.push(`/game/${gameId}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQuizFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          setQuizData(data);
          setGameType(data.type);
        } catch (error) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Waiting</Badge>;
      case 'playing':
        return <Badge className="bg-green-100 text-green-800">Playing</Badge>;
      case 'finished':
        return <Badge variant="outline">Finished</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) return null;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Gameshow Lobby</h1>
              <p className="text-muted-foreground">Welcome back, {user.username}</p>
          </div>
          <div className="flex gap-2">
            {user.role === 'ADMIN' && (
              <Button variant="outline" onClick={() => router.push('/admin/tokens')}>
                Admin Panel
              </Button>
            )}
          </div>
        </div>

        <div className="mb-8">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger>
              <Button size="lg" className="h-11">
                Create New Game
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Game</DialogTitle>
                <DialogDescription>
                  Choose a game type and select or upload a quiz
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Game Type</Label>
                  <Select value={gameType} onValueChange={(v) => setGameType(v as 'buzzer' | 'matrix')}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buzzer">Buzzer Quiz</SelectItem>
                      <SelectItem value="matrix">Matrix Quiz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Tabs defaultValue="select">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="select">Select Quiz</TabsTrigger>
                    <TabsTrigger value="upload">Upload JSON</TabsTrigger>
                  </TabsList>
                  <TabsContent value="select" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select a Quiz</Label>
                      <Select value={selectedQuizId || ''} onValueChange={(value) => setSelectedQuizId(value)}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Choose a quiz" />
                        </SelectTrigger>
                        <SelectContent>
                          {quizzes.map((quiz) => (
                            <SelectItem key={quiz.id} value={quiz.id}>
                              {quiz.title} ({quiz.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                  <TabsContent value="upload" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Upload Quiz JSON</Label>
                      <Input type="file" accept=".json" onChange={handleFileUpload} className="h-10" />
                      {quizData && (
                        <p className="text-sm text-muted-foreground">
                          Loaded: {quizData.title}
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <Button onClick={handleCreateGame} className="w-full h-10">
                  Create Game
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <h2 className="text-xl font-semibold mb-4">Active Games</h2>
        {games.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              No active games. Create one to get started!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => (
              <Card key={game.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {game.type === 'buzzer' ? 'Buzzer Quiz' : 'Matrix Quiz'}
                    </CardTitle>
                    {getStatusBadge(game.status)}
                  </div>
                  <CardDescription className="mt-1">
                    Host: {game.hostUsername}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {game.players.filter(p => p.id !== game.hostId).length} player{game.players.filter(p => p.id !== game.hostId).length !== 1 ? 's' : ''}
                    {game.players.length > 1 && game.hostId && (
                      <span className="ml-2 text-muted-foreground/70">
                        ({game.players.filter(p => p.id !== game.hostId).map(p => p.username).join(', ')})
                      </span>
                    )}
                  </p>
                  <Button onClick={() => handleJoinGame(game.id)} className="w-full" size="sm">
                    Join Game
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
'use client';

import { useState, useMemo, FormEvent } from 'react';
import { useUser, useAuth, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, getCountFromServer } from 'firebase/firestore';
import { Loader2, LogIn, UserPlus, FileText, Plus, Database, Trash2 } from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AuthForm } from '@/components/auth-form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';

interface AnalyzedCollection {
  name: string;
  docCount: number;
}

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  if (isUserLoading) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </main>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Firebase Lister</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <CollectionManager />
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2 overflow-hidden">
                <span className="truncate text-sm font-medium">{user.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => auth.signOut()}>Sair</Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="p-4 sm:p-8">
          <AnalyzedCollectionsList />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// State managed at a higher level to be shared between sidebar and main content
const collectionsState: {
  analyzed: AnalyzedCollection[];
  setAnalyzed: (collections: AnalyzedCollection[]) => void;
} = {
  analyzed: [],
  setAnalyzed: () => {},
};

function CollectionManager() {
  const [collectionName, setCollectionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // This is a bit of a hack to create a shared state without a top-level provider
  const [analyzed, _setAnalyzed] = useState<AnalyzedCollection[]>(collectionsState.analyzed);
  collectionsState.setAnalyzed = (cols) => {
      collectionsState.analyzed = cols;
      _setAnalyzed(cols);
  };


  const handleAddCollection = async (e: FormEvent) => {
    e.preventDefault();
    if (!collectionName.trim()) return;
    if (analyzed.some(c => c.name === collectionName.trim())) {
      toast({
        variant: 'destructive',
        title: 'Coleção Duplicada',
        description: `A coleção "${collectionName}" já está na lista.`,
      });
      return;
    }

    setIsLoading(true);
    try {
      const collRef = collection(firestore, collectionName.trim());
      const snapshot = await getCountFromServer(collRef);
      const newCollection: AnalyzedCollection = {
        name: collectionName.trim(),
        docCount: snapshot.data().count,
      };
      collectionsState.setAnalyzed([...analyzed, newCollection]);
      setCollectionName('');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Analisar',
        description: error.message || `Não foi possível acessar a coleção "${collectionName}". Verifique o nome e as regras de segurança.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCollection = (name: string) => {
    collectionsState.setAnalyzed(analyzed.filter(c => c.name !== name));
  };


  return (
    <div className="flex h-full flex-col gap-4">
      <form onSubmit={handleAddCollection} className="space-y-2">
        <label htmlFor="collection-name" className="text-sm font-medium">Analisar Coleção</label>
        <div className="flex gap-2">
          <Input
            id="collection-name"
            placeholder="Nome da coleção"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !collectionName.trim()}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Plus />}
          </Button>
        </div>
      </form>
      <Separator />
      <div className="flex-1 overflow-y-auto">
        <p className="px-2 text-xs text-muted-foreground">COLEÇÕES ADICIONADAS</p>
        <SidebarMenu>
          {analyzed.map((col) => (
            <SidebarMenuItem key={col.name}>
              <SidebarMenuButton className="justify-between" size="sm" asChild>
                <div>
                  <div className="flex items-center gap-2">
                    <FileText />
                    <span>{col.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveCollection(col.name)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive"/>
                  </Button>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {analyzed.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                  Nenhuma coleção adicionada.
              </div>
          )}
        </SidebarMenu>
      </div>
    </div>
  );
}

function AnalyzedCollectionsList() {
    const [analyzed] = useState<AnalyzedCollection[]>(collectionsState.analyzed);
    const totalDocs = useMemo(() => analyzed.reduce((sum, col) => sum + col.docCount, 0), [analyzed]);

    if (analyzed.length === 0) {
        return (
          <div className="text-center text-muted-foreground mt-6 py-24 border border-dashed rounded-lg">
                <Database className="mx-auto h-12 w-12" />
                <p className="mt-4 text-lg font-semibold">Comece a Análise</p>
                <p className="text-sm mt-2">Use a barra lateral para adicionar os nomes das coleções que você deseja analisar na raiz do seu banco de dados.</p>
          </div>
        )
    }

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Coleções Analisadas</CardTitle>
                <CardDescription>
                    Total de {totalDocs.toLocaleString()} documentos encontrados nas {analyzed.length} coleções.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome da Coleção</TableHead>
                            <TableHead className="text-right">Documentos</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {analyzed.map(col => (
                            <TableRow key={col.name}>
                                <TableCell className="font-medium">{col.name}</TableCell>
                                <TableCell className="text-right">{col.docCount.toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}


function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-headline tracking-tight">
              {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? 'Entre para analisar suas coleções do Firebase.'
                : 'Crie uma conta para começar a analisar.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm isLogin={isLogin} />
            <Separator className="my-6" />
            <div className="text-center">
              <Button variant="link" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? (
                  <>
                    <UserPlus className="mr-2" />
                    Não tem uma conta? Registre-se
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2" />
                    Já tem uma conta? Faça login
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

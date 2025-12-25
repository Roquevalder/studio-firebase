'use client';

import { useState, useMemo, FormEvent, useEffect } from 'react';
import { useUser, useAuth, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, getCountFromServer, getDocs, query, where } from 'firebase/firestore';
import { Loader2, LogIn, UserPlus, FileText, Plus, Database, Trash2 } from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
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
import { addDocumentNonBlocking, deleteDocumentNonBlocking, useCollection } from '@/firebase/firestore-non-blocking';
import { doc } from 'firebase/firestore';


// Defines the structure for a simple collection analysis (total count)
interface SimpleAnalysis {
  type: 'simple';
  name: string;
  docCount: number;
}

// Defines the structure for a detailed group analysis (e.g., by codigoIg)
interface GroupedAnalysis {
  type: 'grouped';
  name: string;
  groups: {
    codigoIg: string;
    igrejaName: string;
    count: number;
  }[];
  totalDocs: number;
}

// A union type for any kind of analysis result
type AnalyzedCollection = SimpleAnalysis | GroupedAnalysis;


export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const [analyzedCollections, setAnalyzedCollections] = useState<AnalyzedCollection[]>([]);

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
  
  const handleSignOut = () => {
    auth.signOut();
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
          <CollectionManager 
            analyzedCollections={analyzedCollections}
            setAnalyzedCollections={setAnalyzedCollections}
          />
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2 overflow-hidden">
                <span className="truncate text-sm font-medium">{user.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>Sair</Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="p-4 sm:p-8">
          <AnalyzedCollectionsList analyzedCollections={analyzedCollections} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

interface CollectionManagerProps {
  analyzedCollections: AnalyzedCollection[];
  setAnalyzedCollections: React.Dispatch<React.SetStateAction<AnalyzedCollection[]>>;
}

function CollectionManager({ analyzedCollections, setAnalyzedCollections }: CollectionManagerProps) {
  const [collectionName, setCollectionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAnalyseCollection = async (e: FormEvent) => {
    e.preventDefault();
    const nameToAnalyse = collectionName.trim();
    if (!nameToAnalyse) return;
    if (analyzedCollections.some(c => c.name === nameToAnalyse)) {
      toast({
        variant: 'destructive',
        title: 'Coleção Duplicada',
        description: `A coleção "${nameToAnalyse}" já está na lista.`,
      });
      return;
    }

    setIsLoading(true);
    try {
      if (nameToAnalyse === 'Cultos') {
        // 1. Fetch Igrejas and create a map
        const igrejasRef = collection(firestore, 'Igrejas');
        const igrejasSnapshot = await getDocs(igrejasRef);
        const igrejasMap = new Map<string, string>();
        igrejasSnapshot.forEach(doc => {
          igrejasMap.set(doc.id, doc.data().igreja || 'Nome não encontrado');
        });

        // 2. Fetch Cultos and group by codigoIg
        const cultosRef = collection(firestore, 'Cultos');
        const cultosSnapshot = await getDocs(cultosRef);
        const counts: { [key: string]: number } = {};
        let totalDocs = 0;
        cultosSnapshot.forEach((doc) => {
          const data = doc.data();
          const codigoIg = data.codigoIg || 'Sem codigoIg';
          counts[codigoIg] = (counts[codigoIg] || 0) + 1;
          totalDocs++;
        });

        // 3. Combine data
        const groups = Object.entries(counts).map(([codigoIg, count]) => ({
          codigoIg,
          igrejaName: igrejasMap.get(codigoIg) || 'Igreja desconhecida',
          count,
        }));

        const newAnalysis: GroupedAnalysis = {
          type: 'grouped',
          name: nameToAnalyse,
          groups: groups,
          totalDocs: totalDocs
        };
        setAnalyzedCollections(prev => [...prev, newAnalysis]);

      } else {
        const collRef = collection(firestore, nameToAnalyse);
        const snapshot = await getCountFromServer(collRef);
        const newAnalysis: SimpleAnalysis = {
          type: 'simple',
          name: nameToAnalyse,
          docCount: snapshot.data().count,
        };
        setAnalyzedCollections(prev => [...prev, newAnalysis]);
      }
      setCollectionName('');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Analisar',
        description: error.message || `Não foi possível acessar a coleção "${nameToAnalyse}". Verifique o nome e as regras de segurança.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCollection = (name: string) => {
    setAnalyzedCollections(prev => prev.filter(c => c.name !== name));
  };


  return (
    <div className="flex h-full flex-col gap-4">
      <form onSubmit={handleAnalyseCollection} className="space-y-2">
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
          {analyzedCollections.map((col) => (
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
          {analyzedCollections.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                  Nenhuma coleção adicionada.
              </div>
          )}
        </SidebarMenu>
      </div>
    </div>
  );
}

interface AnalyzedCollectionsListProps {
    analyzedCollections: AnalyzedCollection[];
}

function AnalyzedCollectionsList({ analyzedCollections }: AnalyzedCollectionsListProps) {
    const totalDocs = useMemo(() => 
        analyzedCollections.reduce((sum, col) => {
            if (col.type === 'simple') {
                return sum + col.docCount;
            } else { // grouped
                return sum + col.totalDocs;
            }
        }, 0), 
    [analyzedCollections]);

    if (analyzedCollections.length === 0) {
        return (
          <div className="text-center text-muted-foreground mt-6 py-24 border border-dashed rounded-lg">
                <Database className="mx-auto h-12 w-12" />
                <p className="mt-4 text-lg font-semibold">Comece a Análise</p>
                <p className="text-sm mt-2">Use a barra lateral para adicionar os nomes das coleções que você deseja analisar na raiz do seu banco de dados.</p>
          </div>
        )
    }

    const cultosAnalysis = analyzedCollections.find(c => c.name === 'Cultos' && c.type === 'grouped') as GroupedAnalysis | undefined;
    const otherAnalyses = analyzedCollections.filter(c => c.name !== 'Cultos');

    return (
        <div className='space-y-6'>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Resumo da Análise</CardTitle>
                    <CardDescription>
                        Total de {totalDocs.toLocaleString()} documentos encontrados em {analyzedCollections.length} coleção(ões).
                    </CardDescription>
                </CardHeader>
            </Card>

            {cultosAnalysis && (
                 <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Análise de Cultos por Igreja</CardTitle>
                        <CardDescription>
                            Total de {cultosAnalysis.totalDocs.toLocaleString()} cultos distribuídos por código da igreja.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Código da Igreja</TableHead>
                                    <TableHead>Nome da Igreja</TableHead>
                                    <TableHead className="text-right">Documentos</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cultosAnalysis.groups
                                 .sort((a, b) => a.codigoIg.localeCompare(b.codigoIg))
                                 .map(({ codigoIg, igrejaName, count }) => (
                                    <TableRow key={codigoIg}>
                                        <TableCell className="font-medium">{codigoIg}</TableCell>
                                        <TableCell>{igrejaName}</TableCell>
                                        <TableCell className="text-right">{count.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {otherAnalyses.length > 0 && (
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Outras Coleções Analisadas</CardTitle>
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
                                {otherAnalyses.map(col => (
                                    <TableRow key={col.name}>
                                        <TableCell className="font-medium">{col.name}</TableCell>
                                        <TableCell className="text-right">{(col.type === 'simple' ? col.docCount : col.totalDocs).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
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

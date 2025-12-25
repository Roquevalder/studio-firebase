'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { collection } from 'firebase/firestore';
import { FolderKanban, Hash, HardDrive, ServerCrash, Loader2, LogIn, UserPlus } from 'lucide-react';
import { useCollection } from '@/firebase/firestore/use-collection';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthForm } from '@/components/auth-form';
import { getCollectionsAndCounts } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

type CollectionInfo = {
  name: string;
  count: number;
  sizeBytes: number;
};

export default function Home() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [collections, setCollections] = useState<CollectionInfo[] | null>(null);
  const [totalSize, setTotalSize] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const collectionsRef = user ? collection(firestore, `users/${user.uid}/firebaseCollections`) : null;
  const { data: firebaseCollections, isLoading: isLoadingCollections } = useCollection(collectionsRef);

  function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  if (isUserLoading) {
    return (
       <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </main>
    )
  }

  if (!user) {
    return <AuthScreen />
  }


  const renderContent = () => {
    if (isLoadingCollections) {
      return (
        <div className="space-y-4 mt-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border rounded-md">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="space-y-2 flex-grow">
                <Skeleton className="h-4 w-3/5" />
              </div>
              <Skeleton className="h-4 w-1/12" />
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="mt-6">
          <ServerCrash className="h-4 w-4" />
          <AlertTitle>Ocorreu um Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    
    if (firebaseCollections) {
       const totalSizeBytes = firebaseCollections.reduce((acc, coll) => acc + coll.documentCount, 0);

      return (
        <>
           <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Tamanho Total Estimado</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{formatBytes(totalSizeBytes)}</div>
                  <p className="text-xs text-muted-foreground">
                      O tamanho é baseado na contagem de documentos.
                  </p>
              </CardContent>
           </Card>
          <div className="mt-4 rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4" />
                      Nome da Coleção
                    </div>
                  </TableHead>
                  <TableHead className="text-right w-[200px]">
                    <div className="flex items-center gap-2 justify-end">
                      <Hash className="h-4 w-4" />
                      Qtd. de Documentos
                    </div>
                  </TableHead>
                  <TableHead className="text-right w-[200px]">
                    <div className="flex items-center gap-2 justify-end">
                      <HardDrive className="h-4 w-4" />
                      Tamanho (Est.)
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {firebaseCollections.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground h-24"
                    >
                      Nenhuma coleção encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  firebaseCollections.map((collection) => (
                    <TableRow key={collection.name}>
                      <TableCell className="font-medium">
                        {collection.name}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {collection.documentCount.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatBytes(collection.documentCount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      );
    }

    return (
      <div className="text-center text-muted-foreground mt-6 py-12 border border-dashed rounded-lg">
        <p>Nenhuma coleção para exibir.</p>
      </div>
    );
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8 font-body">
       <div className="w-full max-w-3xl">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-headline tracking-tight">Listador Firebase</CardTitle>
                <CardDescription>
                  Suas coleções do Firestore e suas contagens de documentos.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => useAuth().signOut()}>Sair</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="animate-in fade-in-50 duration-500">
             {renderContent()}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
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
                ? 'Entre para ver suas coleções do Firebase.'
                : 'Crie uma conta para começar a gerenciar suas coleções.'}
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
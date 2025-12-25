'use client';

import { useState } from 'react';
import { useUser, useAuth } from '@/firebase';
import { Loader2, LogIn, UserPlus } from 'lucide-react';

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

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  
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

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-background p-4 sm:p-8 font-body">
       <div className="w-full max-w-3xl">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-headline tracking-tight">Listador Firebase</CardTitle>
                <CardDescription>
                  Bem-vindo! Você está autenticado.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => auth.signOut()}>Sair</Button>
            </div>
          </CardHeader>
          <CardContent>
             <div className="text-center text-muted-foreground mt-6 py-12 border border-dashed rounded-lg">
                <p>O SDK do cliente Firebase não pode listar coleções raiz dinamicamente.</p>
                <p className="text-xs mt-2">Funcionalidade de análise a ser implementada em uma próxima etapa.</p>
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

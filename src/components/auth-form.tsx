'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  initiateEmailSignUp,
  initiateEmailSignIn,
  useAuth,
} from '@/firebase';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { AuthError } from 'firebase/auth';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

const registerSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

interface AuthFormProps {
  isLogin: boolean;
}

export function AuthForm({ isLogin }: AuthFormProps) {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const getFriendlyErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'O formato do email fornecido não é válido.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Email ou senha incorretos.';
      case 'auth/email-already-in-use':
        return 'Este email já está em uso por outra conta.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Tente uma mais forte.';
      case 'auth/invalid-credential':
        return 'As credenciais fornecidas estão incorretas ou expiraram.';
      default:
        return 'Ocorreu um erro de autenticação. Tente novamente.';
    }
  };

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await initiateEmailSignIn(auth, values.email, values.password);
      } else {
        await initiateEmailSignUp(auth, values.email, values.password);
      }
    } catch (e) {
      const authError = e as AuthError;
      setError(getFriendlyErrorMessage(authError.code));
      setIsLoading(false);
    }
    // No need to setIsLoading(false) on success, as the user redirect will happen
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
            <Alert variant="destructive">
                <AlertTitle>Erro de Autenticação</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="seu@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : isLogin ? (
            'Entrar'
          ) : (
            'Registrar'
          )}
        </Button>
      </form>
    </Form>
  );
}

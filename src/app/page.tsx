'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FolderKanban, Hash, Loader2, ServerCrash } from 'lucide-react';

import { getCollectionsAndCounts } from '@/app/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  firebaseConfig: z
    .string()
    .min(1, 'A configuração do Firebase é obrigatória.')
    .refine(
      (val) => {
        try {
          JSON.parse(val);
          return true;
        } catch (e) {
          return false;
        }
      },
      { message: 'Formato JSON inválido.' }
    ),
});

type CollectionInfo = {
  name: string;
  count: number;
};

export default function Home() {
  const [collections, setCollections] = useState<CollectionInfo[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firebaseConfig: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setCollections(null);

    const result = await getCollectionsAndCounts(values.firebaseConfig);

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setCollections(result.data);
    }

    setIsLoading(false);
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 mt-6">
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

    if (collections) {
      return (
        <div className="mt-6 rounded-lg border">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-muted-foreground h-24"
                  >
                    Nenhuma coleção encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                collections.map((collection) => (
                  <TableRow key={collection.name}>
                    <TableCell className="font-medium">
                      {collection.name}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {collection.count.toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      );
    }

    return (
      <div className="text-center text-muted-foreground mt-6 py-12 border border-dashed rounded-lg">
        <p>Insira suas credenciais para listar as coleções.</p>
      </div>
    );
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8 font-body">
      <div className="w-full max-w-3xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-headline tracking-tight">Listador Firebase</CardTitle>
            <CardDescription>
              Conecte-se à sua conta Firebase para listar todas as coleções e a
              quantidade de documentos em cada uma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="firebaseConfig"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">
                        Chave da Conta de Serviço (JSON)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='{ "type": "service_account", ... }'
                          className="min-h-[150px] font-code text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Cole o conteúdo do seu arquivo JSON de chave de conta de
                        serviço do Firebase.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    'Conectar e Buscar'
                  )}
                </Button>
              </form>
            </Form>
            <Separator className="my-6" />
            
            <div className="animate-in fade-in-50 duration-500">
             {renderContent()}
            </div>
            
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

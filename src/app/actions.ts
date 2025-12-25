'use server';

import * as admin from 'firebase-admin';

type CollectionInfo = {
  name: string;
  count: number;
};

type ActionResult = {
  data?: CollectionInfo[];
  error?: string;
};

export async function getCollectionsAndCounts(
  configJson: string
): Promise<ActionResult> {
  try {
    const serviceAccount = JSON.parse(configJson);

    // Ensure that project_id is present, as it's required by the SDK
    if (!serviceAccount.project_id) {
        return { error: 'O JSON da conta de serviço deve incluir um "project_id".' };
    }

    // Initialize the app if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // If an app is already initialized, it might be from a previous action call.
      // Firebase admin SDK throws an error if you initialize the same app again.
      // Here, we assume the credentials should be the same for this user session, so we don't re-initialize.
      // For a multi-user app, you'd need a named app instance per user.
    }

    const db = admin.firestore();
    const collections = await db.listCollections();

    if (collections.length === 0) {
      return { data: [] };
    }

    const countPromises = collections.map(async (col) => {
      const countSnapshot = await col.count().get();
      return {
        name: col.id,
        count: countSnapshot.data().count,
      };
    });

    const data = await Promise.all(countPromises);
    
    // Sort collections alphabetically by name
    data.sort((a, b) => a.name.localeCompare(b.name));

    return { data };
  } catch (e: any) {
    let errorMessage = 'Ocorreu um erro desconhecido.';
    
    if (e instanceof SyntaxError) {
      errorMessage = 'Formato JSON inválido. Verifique o conteúdo colado.';
    } else if (e.code === 'auth/invalid-credential' || e.errorInfo?.code?.includes('INVALID_ARGUMENT')) {
      errorMessage = 'As credenciais do Firebase fornecidas não são válidas. Por favor, verifique sua chave de conta de serviço.';
    } else if (e.message) {
      errorMessage = e.message;
    }
    
    // In development, you might want more detailed logs
    console.error("Firebase connection error:", e);

    return { error: errorMessage };
  }
}

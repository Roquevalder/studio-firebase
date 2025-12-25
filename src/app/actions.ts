'use server';

import * as admin from 'firebase-admin';

type CollectionInfo = {
  name: string;
  count: number;
  sizeBytes: number;
};

type ActionResult = {
  data?: {
    collections: CollectionInfo[];
    totalSizeBytes: number;
  };
  error?: string;
};

// Based on https://firebase.google.com/docs/firestore/storage-size
function getDocumentSize(doc: admin.firestore.DocumentData): number {
    let size = 16; // The document name
    for (const key in doc) {
        if (Object.prototype.hasOwnProperty.call(doc, key)) {
            size += Buffer.byteLength(key, 'utf8') + 1;
            size += getValueSize(doc[key]);
        }
    }
    return size + 32;
}

function getValueSize(value: any): number {
    const type = typeof value;
    if (value === null) {
        return 1;
    }
    switch (type) {
        case 'string':
            return Buffer.byteLength(value, 'utf8') + 1;
        case 'boolean':
            return 1;
        case 'number':
            return 8;
        case 'object':
            if (value instanceof admin.firestore.Timestamp) {
                return 8;
            }
            if (value instanceof admin.firestore.GeoPoint) {
                return 16;
            }
            if (value instanceof Buffer) {
                return value.length;
            }
            if (Array.isArray(value)) {
                return value.reduce((acc, curr) => acc + getValueSize(curr), 0);
            }
            // For maps
            return Object.keys(value).reduce((acc, key) => {
                return acc + Buffer.byteLength(key, 'utf8') + 1 + getValueSize(value[key]);
            }, 0);
        default:
            return 0;
    }
}

export async function getCollectionsAndCounts(
  configJson: string
): Promise<ActionResult> {
  try {
    const serviceAccount = JSON.parse(configJson);

    if (!serviceAccount.project_id) {
        return { error: 'O JSON da conta de serviço deve incluir um "project_id".' };
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    const db = admin.firestore();
    const collections = await db.listCollections();

    if (collections.length === 0) {
      return { data: { collections: [], totalSizeBytes: 0 } };
    }

    let totalSizeBytes = 0;

    const collectionPromises = collections.map(async (col) => {
      const countSnapshot = await col.count().get();
      const count = countSnapshot.data().count;

      const docsSnapshot = await col.limit(100).get(); // Limit to 100 docs for size estimation
      let collectionSizeBytes = 0;
      let docsInspected = 0;

      if (!docsSnapshot.empty) {
        docsSnapshot.forEach(doc => {
            collectionSizeBytes += getDocumentSize(doc.data());
        });
        docsInspected = docsSnapshot.size;
      }
      
      const estimatedCollectionSize = docsInspected > 0 
        ? (collectionSizeBytes / docsInspected) * count 
        : 0;

      totalSizeBytes += estimatedCollectionSize;

      return {
        name: col.id,
        count: count,
        sizeBytes: estimatedCollectionSize,
      };
    });

    const data = await Promise.all(collectionPromises);
    
    data.sort((a, b) => a.name.localeCompare(b.name));

    return { data: { collections: data, totalSizeBytes } };
  } catch (e: any) {
    let errorMessage = 'Ocorreu um erro desconhecido.';
    
    if (e instanceof SyntaxError) {
      errorMessage = 'Formato JSON inválido. Verifique o conteúdo colado.';
    } else if (e.code === 'auth/invalid-credential' || e.errorInfo?.code?.includes('INVALID_ARGUMENT')) {
      errorMessage = 'As credenciais do Firebase fornecidas não são válidas. Por favor, verifique sua chave de conta de serviço.';
    } else if (e.message) {
      errorMessage = e.message;
    }
    
    console.error("Firebase connection error:", e);

    return { error: errorMessage };
  }
}

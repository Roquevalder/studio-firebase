'use server';

// This file is no longer used for fetching data after switching to user authentication.
// The data fetching logic is now handled client-side using Firebase SDK in page.tsx.
// It is kept for potential future use with server-side actions if needed.

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


export async function getCollectionsAndCounts(
  configJson: string
): Promise<ActionResult> {
  // This function is deprecated as we are now using client-side data fetching
  // with user authentication. Returning an empty successful response.
  return { data: { collections: [], totalSizeBytes: 0 } };
}


"use server";

// Re-export types and action for fetching initial page data for previews
export type { GetInitialPageDataInput, GetInitialPageDataOutput, PageData } from '../organize/actions';
import { getInitialPageDataAction as originalGetInitialPageDataAction } from '../organize/actions';

export async function getInitialPageDataAction(input: GetInitialPageDataInput): Promise<GetInitialPageDataOutput> {
  // This action is used to fetch page data for previews before client-side conversion.
  return originalGetInitialPageDataAction(input);
}

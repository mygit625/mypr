'use server';

import { nanoid } from 'nanoid';
import { createShortUrl, getRecentUrls, isCodeUnique, ShortUrl } from '@/lib/url-shortener-db';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const UrlSchema = z.string().url({ message: 'Please enter a valid URL.' });

export interface CreateUrlState {
  message: string | null;
  shortUrl: string | null;
  error: string | null;
}

export async function createUrlAction(prevState: CreateUrlState, formData: FormData): Promise<CreateUrlState> {
  const longUrl = formData.get('longUrl') as string;

  const validatedUrl = UrlSchema.safeParse(longUrl);
  if (!validatedUrl.success) {
    return {
      message: null,
      shortUrl: null,
      error: validatedUrl.error.errors[0].message,
    };
  }

  try {
    let code = nanoid(7);
    let attempts = 0;
    // Ensure the code is unique, though collisions are extremely rare
    while (!(await isCodeUnique(code)) && attempts < 5) {
      code = nanoid(7);
      attempts++;
    }

    if (attempts >= 5) {
      return { message: null, shortUrl: null, error: 'Could not generate a unique URL. Please try again.' };
    }

    await createShortUrl(code, validatedUrl.data);
    
    // Revalidate the page to show the new URL in the recent list
    revalidatePath('/url-shortener');

    return {
      message: 'Successfully created short URL!',
      shortUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/${code}`,
      error: null,
    };
  } catch (error) {
    return {
      message: null,
      shortUrl: null,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

export async function getUrlsAction(): Promise<ShortUrl[]> {
    return getRecentUrls();
}

'use server';

import { nanoid } from 'nanoid';
import { createDynamicLink, getRecentLinks, isCodeUnique, type DynamicLink } from '@/lib/url-shortener-db';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const UrlSchema = z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal(''));

const LinksSchema = z.object({
  desktopUrl: UrlSchema,
  androidUrl: UrlSchema,
  iosUrl: UrlSchema,
}).refine(data => data.desktopUrl || data.androidUrl || data.iosUrl, {
  message: "At least one URL (Desktop, Android, or iOS) must be provided.",
  path: ["desktopUrl"], // You can associate the error with a specific field if you like
});


export interface CreateLinkState {
  message: string | null;
  shortUrl: string | null;
  error: string | null;
}

export async function createDynamicLinkAction(prevState: CreateLinkState, formData: FormData): Promise<CreateLinkState> {
  const data = {
    desktopUrl: formData.get('desktopUrl') as string,
    androidUrl: formData.get('androidUrl') as string,
    iosUrl: formData.get('iosUrl') as string,
  };
  
  const validatedLinks = LinksSchema.safeParse(data);
  if (!validatedLinks.success) {
    return {
      message: null,
      shortUrl: null,
      error: validatedLinks.error.errors[0].message,
    };
  }
  
  const { desktopUrl, androidUrl, iosUrl } = validatedLinks.data;

  try {
    let code = nanoid(7);
    let attempts = 0;
    while (!(await isCodeUnique(code)) && attempts < 5) {
      code = nanoid(7);
      attempts++;
    }

    if (attempts >= 5) {
      return { message: null, shortUrl: null, error: 'Could not generate a unique URL. Please try again.' };
    }
    
    const links = {
        desktop: desktopUrl || '',
        android: androidUrl || '',
        ios: iosUrl || '',
    };

    await createDynamicLink(code, links);
    
    revalidatePath('/url-shortener');

    return {
      message: 'Successfully created dynamic link!',
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

export async function getLinksAction(): Promise<DynamicLink[]> {
    return getRecentLinks();
}

'use server';

import { nanoid } from 'nanoid';
import { createDynamicLink, getRecentLinks, isCodeUnique, type DynamicLink } from '@/lib/url-shortener-db';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// New, more robust schema for validating an individual URL.
// It allows the field to be empty, but if a value is present, it must be a valid URL.
const UrlSchema = z.preprocess(
  (val) => (val === "" ? undefined : val), // Treat empty strings as undefined
  z.string().url({ message: "Please enter a valid URL if the field is not empty." }).optional()
);

// Schema for the entire form.
const LinksSchema = z.object({
  desktopUrl: UrlSchema,
  androidUrl: UrlSchema,
  iosUrl: UrlSchema,
}).refine(data => !!data.desktopUrl || !!data.androidUrl || !!data.iosUrl, {
  // This ensures at least one of the fields is filled out.
  message: "At least one URL (Desktop, Android, or iOS) must be provided.",
  path: ["desktopUrl"], // Associate the error with the first field for display purposes.
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const shortUrl = `${baseUrl}/${code}`;

    return {
      message: 'Successfully created dynamic link!',
      shortUrl: shortUrl,
      error: null,
    };
  } catch (error) {
    console.error("Error in createDynamicLinkAction:", error);
    return {
      message: null,
      shortUrl: null,
      error: 'An unexpected error occurred. Please ensure your Firebase credentials are set in the .env file.',
    };
  }
}

export async function getLinksAction(): Promise<DynamicLink[]> {
    return getRecentLinks();
}

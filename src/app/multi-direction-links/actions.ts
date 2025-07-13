
'use server';

import { nanoid } from 'nanoid';
import { createDynamicLink, getRecentLinks, isCodeUnique, type DynamicLink } from '@/lib/multi-direction-links-db';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const UrlSchema = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().url({ message: "Please enter a valid URL if the field is not empty." }).optional()
);

const LinksSchema = z.object({
  desktopUrl: UrlSchema,
  androidUrl: UrlSchema,
  iosUrl: UrlSchema,
}).refine(data => !!data.desktopUrl || !!data.androidUrl || !!data.iosUrl, {
  message: "At least one URL (Desktop, Android, or iOS) must be provided.",
  path: ["desktopUrl"], 
});


export interface CreateLinkState {
  message: string | null;
  shortUrl: string | null;
  error: string | null;
}

export async function createMultiDirectionLinkAction(prevState: CreateLinkState, formData: FormData): Promise<CreateLinkState> {
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
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    // If the environment variable is not set, derive it from headers
    if (!baseUrl || baseUrl.includes('your-project-id')) {
        const headersList = headers();
        const host = headersList.get('host');
        const proto = headersList.get('x-forwarded-proto') || 'http';
        if (host) {
            baseUrl = `${proto}://${host}`;
        } else {
             throw new Error("Could not determine the base URL. The NEXT_PUBLIC_BASE_URL environment variable is not set, and the host header is not available.");
        }
    }


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
    
    revalidatePath('/multi-direction-links');

    const shortUrl = `${baseUrl}/${code}`;

    return {
      message: 'Successfully created multi-direction link!',
      shortUrl: shortUrl,
      error: null,
    };
  } catch (error: any) {
    console.error("Error in createMultiDirectionLinkAction:", error);
    const errorMessage = `Failed to create link. Reason: ${error.message}.`;
    return {
      message: null,
      shortUrl: null,
      error: errorMessage,
    };
  }
}

export async function getLinksAction(): Promise<DynamicLink[]> {
  try {
    return await getRecentLinks();
  } catch (error: any) {
    console.error("Error in getLinksAction:", error);
    return [];
  }
}

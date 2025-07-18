
'use server';

import { headers } from 'next/headers';
import { nanoid } from 'nanoid';
import { createDynamicLink, getRecentLinks, isCodeUnique, type DynamicLink, getRecentClicksForLink, type ClickData, logClick, recalculateAllClickCounts, getClicksForLink } from '@/lib/url-shortener-db';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const UrlSchema = z.preprocess(
  (val) => (val === "" ? undefined : val), 
  z.string().url({ message: "Please enter a valid URL." }).optional()
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
     let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl || baseUrl.includes('your-project-id')) {
        console.warn("NEXT_PUBLIC_BASE_URL is not set. Falling back to request headers.");
        const headersList = headers();
        const host = headersList.get('host');
        const proto = headersList.get('x-forwarded-proto') || 'http';
        if (!host) {
             throw new Error("Could not determine the host from request headers.");
        }
        baseUrl = `${proto}://${host}`;
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
    
    revalidatePath('/smart-url-shortener');
    revalidatePath(`/${code}`);

    const shortUrl = `${baseUrl}/${code}`;

    return {
      message: 'Successfully created dynamic link!',
      shortUrl: shortUrl,
      error: null,
    };
  } catch (error: any) {
    console.error("Error in createDynamicLinkAction:", error);
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

export async function getClicksForLinkAction(linkId: string): Promise<ClickData[]> {
    try {
        return await getRecentClicksForLink(linkId);
    } catch (error) {
        console.error(`Error fetching clicks for link ${linkId}:`, error);
        return [];
    }
}

export interface ClickStats {
  desktop: number;
  android: number;
  ios: number;
  total: number;
}

export async function getClickStatsAction(linkId: string): Promise<ClickStats | { error: string }> {
    try {
        const clicks = await getClicksForLink(linkId);
        const stats: ClickStats = { desktop: 0, android: 0, ios: 0, total: clicks.length };
        
        for (const click of clicks) {
            if (click.deviceType === 'Desktop') stats.desktop++;
            else if (click.deviceType === 'Android') stats.android++;
            else if (click.deviceType === 'iOS') stats.ios++;
        }
        
        return stats;
    } catch (error: any) {
        console.error(`Error calculating stats for link ${linkId}:`, error);
        return { error: error.message || 'Failed to fetch click statistics.' };
    }
}


export async function recalculateCountsAction(): Promise<{success: boolean, updatedCount: number, error?: string}> {
    try {
        const result = await recalculateAllClickCounts();
        if (result.success) {
            revalidatePath('/smart-url-shortener');
        }
        return result;
    } catch (e: any) {
        return { success: false, updatedCount: 0, error: e.message };
    }
}

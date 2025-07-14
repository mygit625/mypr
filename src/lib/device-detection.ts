
'use server';

// A modern device detection function that checks client hints.
// It prioritizes `sec-ch-ua-platform` for reliability.
export function detectDevice(headers: Headers): 'iOS' | 'Android' | 'Desktop' {
  const platform = headers.get('sec-ch-ua-platform')?.toLowerCase() || '';
  
  // Remove quotes that are sometimes present in the header value, e.g., "Android"
  const cleanPlatform = platform.replace(/['"]/g, '');

  if (cleanPlatform.includes('android')) {
    return 'Android';
  }
  if (cleanPlatform.includes('ios')) {
    return 'iOS';
  }
  
  // Assume Desktop for anything else, including Windows, macOS, Linux, etc.
  return 'Desktop';
}

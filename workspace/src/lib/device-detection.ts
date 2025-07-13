
'use server';

// A basic device detection function based on User-Agent sniffing.
// This is a simplified approach and may not be 100% accurate.
export async function getDeviceType(userAgent: string): Promise<string> {
  const ua = userAgent.toLowerCase();
  
  // A simple heuristic to differentiate device types.
  if (/ipad|tablet|(android(?!.*mobile))/.test(ua)) {
    return 'Tablet';
  }
  if (/iphone|ipod|android.*mobile|windows phone|iemobile|mobile/.test(ua)) {
    return 'Mobile';
  }
  // Assume Desktop for anything else
  return 'Desktop';
}

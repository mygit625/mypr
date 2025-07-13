
'use server';

// A basic device detection function based on User-Agent sniffing.
// This is a simplified approach and may not be 100% accurate.
// It prioritizes iOS and Android, defaulting to Desktop.
export function detectDevice(userAgent: string): 'iOS' | 'Android' | 'Desktop' {
  const ua = userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'iOS';
  }
  if (/android/.test(ua)) {
    return 'Android';
  }
  // Assume Desktop for anything else, including tablets that aren't iPads.
  return 'Desktop';
}

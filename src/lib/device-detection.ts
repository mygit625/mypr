
'use server';

// A more robust device detection function that checks modern client hints first,
// then falls back to the User-Agent string.
export function detectDevice(headers: Headers): 'iOS' | 'Android' | 'Desktop' {
  const ua = headers.get('user-agent')?.toLowerCase() || '';
  const platform = headers.get('sec-ch-ua-platform')?.toLowerCase() || '';
  
  // Modern Client Hints are more reliable
  if (platform.includes('android')) {
    return 'Android';
  }
  if (platform.includes('ios')) {
    return 'iOS';
  }

  // Fallback to User-Agent sniffing for older clients
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'iOS';
  }
  if (/android/.test(ua)) {
    return 'Android';
  }

  // Assume Desktop for anything else
  return 'Desktop';
}

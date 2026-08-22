import { Platform } from 'react-native';

// Google's calendar ICS export doesn't send CORS headers, so a browser tab
// can't fetch it directly. Native has no CORS restriction, so it fetches
// straight from the source; web routes through a public CORS proxy instead —
// meaning the calendar URL and its contents pass through that third party.
const CORS_PROXY = 'https://corsproxy.io/?url=';

export async function fetchIcsText(url: string): Promise<string> {
  const target = Platform.OS === 'web' ? `${CORS_PROXY}${encodeURIComponent(url)}` : url;
  const res = await fetch(target);
  if (!res.ok) throw new Error(`Could not fetch calendar (${res.status})`);
  const text = await res.text();
  if (!text.includes('BEGIN:VCALENDAR')) {
    throw new Error('That link did not return a valid calendar file');
  }
  return text;
}

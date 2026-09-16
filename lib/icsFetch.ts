import { Platform } from 'react-native';

// Google's calendar ICS export doesn't send CORS headers, so a browser tab
// can't fetch it directly. Native has no CORS restriction, so it fetches
// straight from the source; web routes through our own serverless proxy
// instead, so the calendar's (often secret) URL never passes through a
// third party.
const ICS_PROXY = '/api/ics-proxy?url=';

export async function fetchIcsText(url: string): Promise<string> {
  const target = Platform.OS === 'web' ? `${ICS_PROXY}${encodeURIComponent(url)}` : url;
  const res = await fetch(target);
  if (!res.ok) {
    let message = `Could not fetch calendar (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON — keep the generic status message
    }
    throw new Error(message);
  }
  const text = await res.text();
  if (!text.includes('BEGIN:VCALENDAR')) {
    throw new Error('That link did not return a valid calendar file');
  }
  return text;
}

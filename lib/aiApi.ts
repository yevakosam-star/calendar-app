import { format } from 'date-fns';
import { AiItem } from './types';

export async function parseSchedule(input: {
  message?: string;
  imageBase64?: string;
  imageMediaType?: string;
}): Promise<AiItem[]> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const res = await fetch('/api/parse-schedule', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...input, today }),
  });

  let data: { items?: AiItem[]; error?: string };
  try {
    data = await res.json();
  } catch {
    throw new Error(
      res.ok
        ? 'Got an unexpected response from the server.'
        : `Request failed (${res.status}) — Ask AI only works on the deployed site, not local dev.`
    );
  }

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }

  return data.items ?? [];
}

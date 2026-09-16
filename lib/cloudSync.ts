// Best-effort cloud sync — every call is wrapped so a missing/offline
// backend never breaks the app; local storage is always the fallback.

export async function fetchCloudState<T>(): Promise<T | null> {
  try {
    const res = await fetch('/api/sync');
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? null) as T | null;
  } catch {
    return null;
  }
}

export async function pushCloudState(data: unknown): Promise<void> {
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // offline or backend unavailable — local storage still has the data
  }
}

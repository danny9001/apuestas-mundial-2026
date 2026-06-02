export async function withMetrics<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    if (ms > 2000) console.warn('[slow-action]', { action: name, durationMs: ms });
    else if (process.env.NODE_ENV !== 'production') console.log('[server-action]', { action: name, durationMs: ms });
    return result;
  } catch (err) {
    console.error('[action-error]', { action: name, durationMs: Date.now() - start, err });
    throw err;
  }
}

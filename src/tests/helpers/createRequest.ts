export function createRequest(opts: {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  url?: string;
}) {
  const headers = new Headers(opts.headers ?? {});
  return {
    method: opts.method ?? 'GET',
    headers: { get: (k: string) => headers.get(k) },
    nextUrl: { pathname: opts.url ?? '/' },
    json: async () => opts.body,
  };
}

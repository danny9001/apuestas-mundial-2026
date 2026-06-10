// Syncs company assignments from mundial to Identity HotSync API
// Silent: never throws, errors are logged only

function getIdentityConfig() {
  const appSecret = process.env.IDENTITY_APP_SECRET;
  const baseUrl = (process.env.IDENTITY_BASE_URL ?? 'https://id.genial-it.net').replace(/\/$/, '');
  if (!appSecret) console.warn('[identity-sync] IDENTITY_APP_SECRET not set');
  return { appSecret, baseUrl };
}

function slugify(nombre: string): string {
  return nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function syncCompanyAssignment(
  userEmail: string,
  companyNombre: string,
  rol: string,
): Promise<{ ok: boolean; note?: string }> {
  const { appSecret, baseUrl } = getIdentityConfig();
  if (!appSecret) return { ok: false, note: 'No app secret configured' };

  const empresaSlug = slugify(companyNombre);
  const identityRol =
    rol === 'superadmin' ? 'SUPER_ADMIN'
    : rol === 'admin' ? 'ADMIN'
    : rol === 'externo' ? 'EXTERNO'
    : 'INTERNO';

  try {
    const res = await fetch(`${baseUrl}/api/v1/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-app-secret': appSecret },
      body: JSON.stringify({
        action: 'sync-user-empresa',
        email: userEmail.toLowerCase(),
        empresaSlug,
        empresaNombre: companyNombre,
        appSlug: 'mundial',
        rol: identityRol,
        tipo: 'staff',
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, note: data.note };
  } catch (err) {
    console.error('[identity-sync] Failed to sync:', err);
    return { ok: false };
  }
}

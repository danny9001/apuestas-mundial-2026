# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

---

## Commands

```bash
pnpm dev          # Dev server (http://localhost:3000)
pnpm build        # Production build (requires DB env vars)
pnpm start        # Run production build
pnpm lint         # ESLint check
npx tsc --noEmit  # TypeScript type check without building
```

Build for production (PM2 cluster):
```bash
NEXT_BUILD_STANDALONE=1 pnpm build
```

---

## Architecture

### Stack
- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS v4**
- **PostgreSQL** via `pg` pool — no ORM
- **JWT** in `httpOnly` cookie (`apuestas_session`) — 12h TTL
- **PWA**: service worker in `public/sw.js`, manifest via `/api/manifest`

### Database
Connection in `src/lib/db.ts`: singleton `Pool` stored on `global._postgresPool`. Reads `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` from env (falls back to `DATABASE_URL`). Schema in `init.sql` — run directly against PostgreSQL.

Key tables: `users`, `matches`, `predictions`, `leaderboard`, `companies`, `user_companies`, `groups`, `notifications`.

Leaderboard recalculation is a PostgreSQL stored function `recalculate_leaderboard()` — triggered via `/api/admin/recalculate`.

### Auth
`src/lib/auth.ts` exports `getSessionUser()` (reads JWT cookie → DB lookup) and `setSession()`. Every API route must call `getSessionUser()` first.

User roles in order of access: `externo` → `interno` → `admin` → `superadmin`.  
- Admin routes check `user.tipo === 'admin' || user.tipo === 'superadmin'`  
- Superadmin-only routes check `user.tipo === 'superadmin'`  
- Users also need `user.aprobado === true` to place predictions

### API Routes (`src/app/api/`)
All routes use `export const dynamic = 'force-dynamic'` and return `NextResponse.json()`. Response headers always set `Cache-Control: no-store` for authenticated data.

Key routes:
| Route | Purpose |
|---|---|
| `/api/auth` | Login (POST), logout (DELETE) |
| `/api/predictions` | GET own predictions; POST save/update (superadmin can target `userId`) |
| `/api/admin/users` | Full user CRUD + approval flow |
| `/api/admin/user-predictions` | GET all predictions for a specific user (superadmin only) |
| `/api/admin/recalculate` | Trigger `recalculate_leaderboard()` |
| `/api/realtime` | SSE stream — broadcasts `match`, `leaderboard`, `goal`, `notification` events |
| `/api/sync` | Sync matches from external football API |

### Realtime (SSE)
`src/lib/realtime.ts` holds a global `EventEmitter`. API routes call `broadcastUpdate(type, data)` after writes. The client in `page.tsx` opens `new EventSource('/api/realtime')` and updates local state on events.

### UI — Current Monolith
`src/app/page.tsx` (~5 900 lines) is a single client component with **7 tabs** rendered conditionally:

| Tab key | Lines (approx.) | Content |
|---|---|---|
| `dashboard` | 2404–2962 | Hero stats, live matches, upcoming matches, news |
| `partidos` | 2963–3118 | Full match list with predictions |
| `fixture` | 3445–3613 | Bracket / standings / elimination view |
| `ranking` | 3212–3444 | Leaderboard (participantes + visores) |
| `reglas` | 3119–3211 | Rules / about |
| `perfil` | 3614–4020 | Profile edit, passkeys, push, Telegram |
| `admin` | 4021–4928 | User mgmt, company mgmt, messages (superadmin/admin only) |

**Shared state that crosses tabs**: `user`, `matches`, `predictions`, `leaderboard`, `companies`, `groups`, `notifications`. This is the main coupling to address when splitting into separate pages.

### Separate Pages (already extracted)
- `/admin/predictions` — Superadmin prediction viewer per user
- `/notifications` — Full notification history
- `/tv` — TV display mode
- `/invitacion` — Invitation landing

### Lib Modules
| File | Purpose |
|---|---|
| `auth.ts` | JWT session (cookie-based) |
| `db.ts` | Postgres pool singleton |
| `validation.ts` | `sanitizeText`, `isValidEmail`, `validatePassword`, `isValidRole`, `deviceLabelFromUA` |
| `realtime.ts` | Global `EventEmitter` + `broadcastUpdate()` |
| `identity-sync.ts` | Sync users/companies to external Identity SSO (silent, never throws) |
| `mail.ts` | Approval/denial email templates |
| `push.ts` | Web Push notifications |
| `action-metrics.ts` | Internal metrics logging |

### Constants (top of page.tsx — move to shared module when refactoring)
- `TEAM_CODES` — country name → ISO flag code
- `PHASES_APUESTA` — ordered World Cup phase definitions
- `DEFAULT_MODOS_POR_FASE` — default scoring modes per phase
- `getTeamFlag(name)` — renders flag `<img>` from `flagcdn.com`
- `formatPlaceholderText(name)` — decodes bracket slot codes like `1A`, `G12`, `P3`

### Validation Pattern
All user inputs go through `src/lib/validation.ts` before DB writes. Never skip `sanitizeText()` on free-text fields or `isValidEmail()` / `isValidRole()` on typed fields.

### Identity Sync
When a user or company is created/modified, call `syncUserToIdentity()` / `syncCompanyAssignment()` from `src/lib/identity-sync.ts`. These are fire-and-forget (never throw); failures are logged only.

### Deployment
Production runs as a **PM2 bare-metal cluster** (4 processes, port 3002) behind nginx (443 → 3002). Deploy: `NEXT_BUILD_STANDALONE=1 pnpm build && pm2 reload elitepass-mundial --update-env`. SSH access on port **5001** or **5011** (port 22 is closed).

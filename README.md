# API Gateway

Standalone Express service — the single public entry point in front of the
User Service (`:4001`), Notification Service (`:4002`), and Monolith (`:4003`),
per the architecture doc. Clients only ever talk to this service (`:4000`).

## What it does

| Layer | Implementation |
|---|---|
| Security headers | `helmet` |
| CORS | allowlist from `CORS_ALLOWED_ORIGINS`, credentials enabled |
| Rate limiting | global limiter + a stricter one on `/api/auth/*` |
| Request validation | `zod` schemas (`src/middleware/schemas.js`) |
| JWT auth | `src/middleware/auth.js` — verifies `Authorization: Bearer <token>` |
| RBAC | `src/middleware/rbac.js` — `requireRole('ADMIN', ...)` |
| Routing / forwarding | `http-proxy-middleware` in `src/proxy/proxy.js` |
| Error handling | `src/middleware/errorHandler.js` — internal errors are logged in full but never sent to the client |
| Logging | `winston`, structured JSON in production, one line per request with requestId/method/endpoint/status/duration |

The gateway does **not** own passwords or issue tokens itself — those stay in
the User Service, matching the doc. It only verifies tokens issued elsewhere
and forwards the caller's identity to downstream services via trusted
internal headers (`x-user-id`, `x-user-role`), since those services are only
reachable on the private network, not the public internet.

## Setup

```bash
npm install
cp .env.example .env
# edit .env: set JWT_ACCESS_SECRET and the three downstream *_SERVICE_URL values
npm run dev     # nodemon
# or
npm start
```

## Routes wired so far

- `GET  /health` — public
- `POST /api/auth/login` — public, rate-limited, validated → User Service
- `POST /api/auth/register` — public, rate-limited, validated → User Service
- `POST /api/auth/refresh` — public, rate-limited → User Service
- `POST /api/auth/logout` — authenticated → User Service
- `/api/users/*` — `SUPER_ADMIN`, `ADMIN` → User Service
- `/api/notifications/*` — any authenticated user → Notification Service
- `GET  /api/library/books` — any authenticated role (per the doc's permission matrix) → Monolith
- `/api/library/*` (everything else) — `SUPER_ADMIN`, `ADMIN`, `LIBRARIAN` → Monolith
- `/api/faculty/*` — `SUPER_ADMIN`, `ADMIN` → Monolith

Add new routes in `src/routes/index.js`; add new validation schemas in
`src/middleware/schemas.js`.

## Notes / things to decide before production

- Swap the in-memory rate limiter (`express-rate-limit`'s default store) for
  a Redis-backed store if you run more than one gateway instance, otherwise
  each instance enforces its own separate limit.
- `JWT_ACCESS_SECRET` here is symmetric (HS256). If the User Service and
  Gateway are different deployables owned by different teams, consider
  switching to RS256 so the Gateway only needs a public key.
- Service-to-service auth (mTLS or an internal API credential, per the doc's
  §16) isn't implemented here — right now the gateway trusts network
  isolation alone to reach `:4001`/`:4002`/`:4003`.
- CORS, rate limit numbers, and the RBAC role lists are illustrative —
  tune them to your actual requirements.

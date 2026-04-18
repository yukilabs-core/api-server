# CLAUDE.md

This file provides guidance to Claude Code when working with the api-server repository.

## Project Purpose

**Project②: API Foundation** — Unified REST API layer serving projects ①③④⑤.

Replaces direct Supabase connections with a centralized server that enforces:
- JWT authentication
- Response format unification
- Business logic separation
- Audit logging via task_events

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server (watches for changes) |
| `npm start` | Start production server |
| `npm run build` | (No build step; uses ES modules directly) |

## Architecture: 4-Layer Separation

```
Router → Controller → Service → Supabase
```

Each layer has a specific job:
- **Router** (`src/routes/`) — Express routing, bind to controllers
- **Controller** (`src/controllers/`) — Request validation, call services
- **Service** (`src/services/`) — Business logic, Supabase queries
- **Supabase** — Database (PostgreSQL with pgvector for future)

### Example Flow: Get Tasks

1. GET `/api/tasks?limit=10&offset=0` hits **routes/tasks.js**
2. Routes delegates to `taskController.getTasks()`
3. Controller validates query params, calls `taskService.getTasks()`
4. Service constructs Supabase query, returns `{ tasks, total_count }`
5. Controller formats response via `APIResponse.paginated()`
6. Client receives paginated JSON

## File Structure

```
api-server/
├── index.js                     # Express app setup, middleware binding
├── swagger.json                 # OpenAPI 3.0.0 spec
├── .env.example                 # Template for .env
├── README.md                    # User-facing docs
├── src/
│   ├── middleware/
│   │   ├── auth.middleware.js   # JWT verify, set req.user
│   │   ├── errorHandler.js      # 500/400 responses via APIResponse
│   │   └── requestLogger.js     # [timestamp] METHOD /path STATUS Xms
│   ├── routes/
│   │   ├── tasks.js             # GET/POST /api/tasks, PATCH status
│   │   ├── auth.js              # POST login, refresh
│   │   └── dashboard.js         # GET stats
│   ├── controllers/
│   │   ├── taskController.js    # getTasks, createTask, updateStatus
│   │   ├── authController.js    # login, refreshToken
│   │   └── dashboardController.js # getStats
│   ├── services/
│   │   ├── taskService.js       # Supabase task queries
│   │   ├── authService.js       # JWT creation, verification
│   │   └── dashboardService.js  # Lead time, completion stats
│   └── utils/
│       └── response.js          # APIResponse.success/error/paginated
```

## Key Design Decisions

### 1. ES Modules (import/export)
- `"type": "module"` in package.json
- All files use `import` / `export default`
- No CommonJS require()

### 2. Response Format Unification
All responses (success/error/paginated) use `APIResponse` class:
```js
{ success, data, meta: { timestamp, pagination? }, error }
```
This ensures front-end consistency across ①③④⑤.

### 3. JWT Authentication
- Access Token: 7 days (signed with JWT_SECRET)
- Refresh Token: 30 days (signed with JWT_REFRESH_SECRET)
- Protected routes use `authMiddleware` → checks Authorization header → sets `req.user`

### 4. Service-Layer DB Queries
Supabase client is instantiated once per service (singleton pattern):
```js
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
```
Service methods are async and throw errors; controllers catch and format responses.

### 5. Error Handling
- Controllers wrap try/catch, pass to `errorHandler` middleware
- `errorHandler` checks error type (PGRST, ValidationError, etc.)
- Returns standardized APIResponse.error()

## Environment & Secrets

- `.env` is in `.gitignore` (never commit)
- `.env.example` is committed (template only)
- On Render, set vars in dashboard (not via .env)

**Required for Render deployment:**
- `SUPABASE_URL` — Database cluster URL
- `SUPABASE_KEY` — Service role key (admin access)
- `JWT_SECRET` — Random string for access token signing
- `JWT_REFRESH_SECRET` — Random string for refresh token signing
- `PORT` — Optional, default 3000

## Database Notes

Tables used (created in earlier phase):
- **users** — id, name, email (for auth)
- **task_statuses** — id, code, name, sort_order, is_terminal, color
- **tasks** — id, title, description, current_status_id (FK), assigned_to, due_date, created_at, updated_at, closed_at, is_deleted
- **task_events** — id, task_id (FK), from_status_id, to_status_id, changed_by, occurred_at

Indexes on: email, status_id, assigned_to, created_at.

## Testing Pattern

### Local (port 3000)
```bash
# Health check
curl http://localhost:3000/api/health

# Get tasks (no auth)
curl http://localhost:3000/api/tasks

# Login (email-based)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com"}' | jq -r '.data.access_token')

# Create task (requires auth)
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test","description":"Desc"}'

# Swagger UI
http://localhost:3000/api-docs
```

### Render (once deployed)
Replace `localhost:3000` with `https://api-server.onrender.com` in curl commands.

## Integration with portfolio-site

After deployment to Render, update project-01 dashboard to call API:

```javascript
// Old (direct Supabase)
const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

// New (via API Server)
const response = await fetch('https://api-server.onrender.com/api/tasks');
const { data: tasks } = await response.json();
```

This removes the need to expose Supabase keys in the browser.

## Future Enhancements

- Add role-based access control (RBAC): admin/editor/viewer
- Implement rate limiting (express-rate-limit)
- Add request validation middleware (joi/zod)
- Add audit logging (who changed what when)
- Add webhook support for status change notifications
- Add GraphQL layer (optional, for ③)

## Deployment Checklist

- [ ] GitHub repo created (yukilabs-core/api-server)
- [ ] All code committed and pushed
- [ ] Render account + project created
- [ ] Environment variables configured on Render
- [ ] Smoke test: curl https://api-server.onrender.com/api/health
- [ ] portfolio-site project-01 updated to call API instead of direct Supabase
- [ ] Swagger UI accessible at /api-docs

## GitHub & Render Integration

**Render auto-deploys on:**
- Push to main branch
- GitHub webhook triggers build
- Uses package.json scripts

**To deploy a fix:**
```bash
git add .
git commit -m "fix: description"
git push origin main
# Render automatically rebuilds within 1-2 minutes
```

## CORS Configuration

Currently allows:
- http://localhost:3000
- http://localhost:4321 (portfolio-site dev)
- https://yukilabs-core.pages.dev (portfolio-site prod)

Edit `index.js` cors section if deploying other front-ends.
